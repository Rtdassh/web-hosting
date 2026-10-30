"""Fail-closed helpers for the V4 financial-history revisions."""
import sqlalchemy as sa


FUNCTION_NAME = "codrop_reject_financial_mutation"
ROW_TRIGGERS = {
    "payment_transactions": "trg_payment_transactions_immutable_row",
    "invoices": "trg_invoices_immutable_row",
}
TRUNCATE_TRIGGERS = {
    "payment_transactions": "trg_payment_transactions_no_truncate",
    "invoices": "trg_invoices_no_truncate",
}
USER_FK_NAMES = {
    "payment_transactions": "fk_payment_transactions_user_id_users",
    "invoices": "fk_invoices_user_id_users",
}


def _require(condition, message):
    if not condition:
        raise RuntimeError(message)


def _find_user_foreign_key(inspector, table_name, expected_delete_action):
    foreign_keys = [
        foreign_key
        for foreign_key in inspector.get_foreign_keys(table_name, schema="public")
        if foreign_key.get("constrained_columns") == ["user_id"]
    ]
    _require(len(foreign_keys) == 1, f"Expected exactly one {table_name}.user_id foreign key.")
    foreign_key = foreign_keys[0]
    options = foreign_key.get("options") or {}
    _require(
        foreign_key.get("referred_table") == "users"
        and foreign_key.get("referred_columns") == ["id"]
        and foreign_key.get("referred_schema") in (None, "public")
        and (options.get("ondelete") or "NO ACTION") == expected_delete_action
        and (options.get("onupdate") or "NO ACTION") == "NO ACTION"
        and not options.get("deferrable", False),
        f"Unexpected {table_name}.user_id foreign key; migration blocked.",
    )
    _require(bool(foreign_key.get("name")), f"Unnamed {table_name}.user_id foreign key.")
    return foreign_key["name"]


def precheck(connection, profile):
    if connection.dialect.name != "postgresql":
        raise RuntimeError("Financial-history revisions require PostgreSQL.")
    if profile not in {"fresh", "debian"}:
        raise RuntimeError("Unknown financial-history schema profile.")

    connection.execute(sa.text("SELECT set_config('lock_timeout', '5s', true)"))
    connection.execute(sa.text("SELECT set_config('statement_timeout', '60s', true)"))
    connection.execute(sa.text(
        "LOCK TABLE public.users, public.payment_transactions, public.invoices "
        "IN ACCESS EXCLUSIVE MODE"
    ))
    inspector = sa.inspect(connection)
    tables = set(inspector.get_table_names(schema="public"))
    if not {"payment_transactions", "invoices", "users"} <= tables:
        raise RuntimeError("Required financial-history tables are missing.")

    transaction_columns = {
        column["name"]: column
        for column in inspector.get_columns("payment_transactions", schema="public")
    }
    if set(transaction_columns) != {
        "id",
        "user_id",
        "plan_id",
        "amount",
        "card_last_four",
        "card_brand",
        "auth_code",
        "status",
        "created_at",
    }:
        raise RuntimeError("Unexpected payment_transactions columns; migration blocked.")
    if "plan_name_snapshot" in transaction_columns:
        raise RuntimeError("plan_name_snapshot already exists; migration blocked.")
    if (
        transaction_columns.get("user_id", {}).get("nullable") is not False
        or transaction_columns.get("plan_id", {}).get("nullable") is not False
    ):
        raise RuntimeError("Unexpected payment_transactions column nullability.")

    invoice_columns = {
        column["name"]: column
        for column in inspector.get_columns("invoices", schema="public")
    }
    if set(invoice_columns) != {
        "id",
        "transaction_id",
        "user_id",
        "invoice_number",
        "amount",
        "tax",
        "status",
        "created_at",
        "pdf_metadata",
    }:
        raise RuntimeError("Unexpected invoices columns; migration blocked.")
    if invoice_columns.get("user_id", {}).get("nullable") is not False:
        raise RuntimeError("Unexpected invoices.user_id nullability.")

    existing_actions = {
        "payment_transactions": "CASCADE" if profile == "debian" else "NO ACTION",
        "invoices": "NO ACTION",
    }
    foreign_keys = {
        table_name: _find_user_foreign_key(inspector, table_name, action)
        for table_name, action in existing_actions.items()
    }

    trigger_names = set(
        connection.execute(sa.text("""
            SELECT t.tgname
            FROM pg_catalog.pg_trigger AS t
            JOIN pg_catalog.pg_class AS c ON c.oid = t.tgrelid
            JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname IN ('payment_transactions', 'invoices')
              AND NOT t.tgisinternal
        """)).scalars()
    )
    expected_names = set(ROW_TRIGGERS.values()) | set(TRUNCATE_TRIGGERS.values())
    if trigger_names & expected_names:
        raise RuntimeError("A financial-history trigger name is already in use.")
    function_exists = connection.execute(sa.text("""
        SELECT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_proc AS p
            JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = :function_name
        )
    """), {"function_name": FUNCTION_NAME}).scalar_one()
    if function_exists:
        raise RuntimeError("The financial-history trigger function already exists.")

    rows = {}
    for table_name in ("payment_transactions", "invoices"):
        if table_name == "payment_transactions":
            expression = "(to_jsonb(t) - 'plan_name_snapshot')::text"
        else:
            expression = "to_jsonb(t)::text"
        rows[table_name] = connection.execute(sa.text(
            "SELECT count(*) AS rows, "
            f"md5(coalesce(string_agg(md5({expression}), '' ORDER BY md5({expression})), '')) AS digest "
            f"FROM public.{table_name} AS t"
        )).mappings().one()
    return {"foreign_keys": foreign_keys, "rows": rows}


def postcheck(connection, before):
    inspector = sa.inspect(connection)
    columns = {
        column["name"]: column
        for column in inspector.get_columns("payment_transactions", schema="public")
    }
    snapshot = columns.get("plan_name_snapshot")
    _require(
        snapshot is not None
        and isinstance(snapshot["type"], sa.String)
        and snapshot["type"].length == 50
        and snapshot["nullable"],
        "plan_name_snapshot does not match the nullable VARCHAR(50) contract.",
    )

    for table_name, constraint_name in USER_FK_NAMES.items():
        foreign_keys = [
            foreign_key
            for foreign_key in inspector.get_foreign_keys(table_name, schema="public")
            if foreign_key.get("constrained_columns") == ["user_id"]
        ]
        _require(
            len(foreign_keys) == 1
            and foreign_keys[0].get("name") == constraint_name
            and foreign_keys[0].get("referred_table") == "users"
            and foreign_keys[0].get("referred_columns") == ["id"]
            and (foreign_keys[0].get("options") or {}).get("ondelete") == "RESTRICT",
            f"Post-migration user foreign key mismatch on {table_name}.",
        )

    for table_name in ("payment_transactions", "invoices"):
        if table_name == "payment_transactions":
            expression = "(to_jsonb(t) - 'plan_name_snapshot')::text"
        else:
            expression = "to_jsonb(t)::text"
        after = connection.execute(sa.text(
            "SELECT count(*) AS rows, "
            f"md5(coalesce(string_agg(md5({expression}), '' ORDER BY md5({expression})), '')) AS digest "
            f"FROM public.{table_name} AS t"
        )).mappings().one()
        _require(
            (after["rows"], after["digest"])
            == (before["rows"][table_name]["rows"], before["rows"][table_name]["digest"]),
            f"Financial records changed during migration: {table_name}.",
        )

    triggers = {
        (row["table_name"], row["tgname"], row["tgenabled"])
        for row in connection.execute(sa.text("""
            SELECT c.relname AS table_name, t.tgname, t.tgenabled
            FROM pg_catalog.pg_trigger AS t
            JOIN pg_catalog.pg_class AS c ON c.oid = t.tgrelid
            JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND NOT t.tgisinternal
        """)).mappings()
    }
    expected_triggers = {
        (table_name, trigger_name, "O")
        for table_name, trigger_name in (
            *ROW_TRIGGERS.items(),
            *TRUNCATE_TRIGGERS.items(),
        )
    }
    _require(expected_triggers <= triggers, "Financial-history triggers are missing or disabled.")
