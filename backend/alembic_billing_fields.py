"""Guarded additive changes for billing-plan and subscription fields."""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

NEW_COLUMNS = {
    "plans": {
        "billing_period": sa.String(20),
        "is_active": sa.Boolean(),
        "created_at": sa.DateTime(timezone=True),
    },
    "subscriptions": {
        "start_date": sa.DateTime(timezone=True),
        "end_date": sa.DateTime(timezone=True),
        "auto_renew": sa.Boolean(),
        "current_period_start": sa.DateTime(timezone=True),
        "current_period_end": sa.DateTime(timezone=True),
    },
    "invoices": {
        "pdf_metadata": postgresql.JSONB(),
    },
    "payment_transactions": {
        "plan_name_snapshot": sa.String(50),
    },
}

BASE_COLUMNS = {
    "plans": {
        "id": (sa.Integer(), False),
        "name": (sa.String(50), False),
        "description": (sa.String(255), True),
        "price": (sa.Float(), False),
        "max_instances": (sa.Integer(), False),
        "max_ram_mb": (sa.Integer(), False),
        "cpu_quota": (sa.Float(), False),
    },
    "subscriptions": {
        "id": (sa.Integer(), False),
        "user_id": (sa.Integer(), False),
        "plan_id": (sa.Integer(), False),
        "status": (sa.String(50), False),
        "created_at": (sa.DateTime(timezone=False), False),
    },
    "invoices": {
        "id": (sa.Integer(), False),
        "transaction_id": (sa.Integer(), False),
        "user_id": (sa.Integer(), False),
        "invoice_number": (sa.String(50), False),
        "amount": (sa.Float(), False),
        "tax": (sa.Float(), False),
        "status": (sa.String(20), False),
        "created_at": (sa.DateTime(timezone=False), False),
    },
}

DEBIAN_SUBSCRIPTION_COLUMNS = {
    "start_date": (sa.DateTime(timezone=True), False),
    "end_date": (sa.DateTime(timezone=True), True),
    "auto_renew": (sa.Boolean(), False),
}

DEBIAN_PLAN_COLUMNS = {
    "billing_period": (sa.String(20), False),
    "is_active": (sa.Boolean(), False),
    "created_at": (sa.DateTime(timezone=True), False),
}

FRESH_NEW_NULLABILITY = {
    "plans": {"billing_period": False, "is_active": False, "created_at": True},
    "subscriptions": {
        "start_date": True,
        "end_date": True,
        "auto_renew": False,
        "current_period_start": True,
        "current_period_end": True,
    },
    "invoices": {"pdf_metadata": True},
}


def _type_name(type_):
    if isinstance(type_, sa.Float):
        return "REAL" if type_.precision is not None and type_.precision <= 24 else "DOUBLE PRECISION"
    return type_.compile(dialect=postgresql.dialect())


def _column_shape(column):
    return {
        "type": _type_name(column["type"]),
        "nullable": column["nullable"],
        "default": column.get("default"),
        "identity": column.get("identity"),
        "computed": column.get("computed"),
    }


def _expected_columns(profile):
    expected = {table: dict(columns) for table, columns in BASE_COLUMNS.items()}
    if profile == "debian":
        expected["plans"].update(DEBIAN_PLAN_COLUMNS)
        expected["subscriptions"].update(DEBIAN_SUBSCRIPTION_COLUMNS)
        expected["subscriptions"]["created_at"] = (sa.DateTime(timezone=True), False)
        expected["plans"]["description"] = (sa.Text(), True)
    return expected


def _new_columns(profile, table_name):
    if profile == "debian":
        if table_name == "plans":
            return {}
        if table_name == "subscriptions":
            return {
                "current_period_start": NEW_COLUMNS["subscriptions"]["current_period_start"],
                "current_period_end": NEW_COLUMNS["subscriptions"]["current_period_end"],
            }
    return NEW_COLUMNS[table_name]


def _new_column_nullable(profile, table_name, column_name):
    if profile == "debian":
        return True
    return FRESH_NEW_NULLABILITY[table_name][column_name]


def precheck(connection, profile):
    if profile not in {"fresh", "debian"}:
        raise RuntimeError("Unknown billing-fields schema profile.")
    if connection.dialect.name != "postgresql":
        raise RuntimeError("Billing-fields revisions require PostgreSQL.")

    inspector = sa.inspect(connection)
    table_names = set(inspector.get_table_names(schema="public"))
    expected_columns = _expected_columns(profile)
    before = {}

    for table_name, known_columns in expected_columns.items():
        if table_name not in table_names:
            raise RuntimeError(f"Required table is missing: {table_name}.")
        columns = inspector.get_columns(table_name, schema="public")
        by_name = {column["name"]: column for column in columns}
        new_columns = _new_columns(profile, table_name)
        new_names = set(new_columns)
        if new_names & set(by_name):
            raise RuntimeError(f"New billing fields already exist on {table_name}.")
        if set(by_name) != set(known_columns):
            raise RuntimeError(f"Unexpected columns on {table_name}; migration blocked.")
        for name, (expected_type, nullable) in known_columns.items():
            actual = by_name[name]
            if _type_name(actual["type"]) != _type_name(expected_type) or actual["nullable"] != nullable:
                raise RuntimeError(f"Unexpected definition for {table_name}.{name}; migration blocked.")
        before[table_name] = {
            "columns": {name: _column_shape(column) for name, column in by_name.items()},
            "pk": inspector.get_pk_constraint(table_name, schema="public"),
            "fk": inspector.get_foreign_keys(table_name, schema="public"),
            "unique": inspector.get_unique_constraints(table_name, schema="public"),
            "indexes": inspector.get_indexes(table_name, schema="public"),
            "checks": inspector.get_check_constraints(table_name, schema="public"),
        }
    return before


def postcheck(connection, profile, before):
    inspector = sa.inspect(connection)
    expected_columns = _expected_columns(profile)

    for table_name, known_columns in expected_columns.items():
        columns = inspector.get_columns(table_name, schema="public")
        by_name = {column["name"]: column for column in columns}
        new_columns = _new_columns(profile, table_name)
        expected_names = set(known_columns) | set(new_columns)
        if set(by_name) != expected_names:
            raise RuntimeError(f"Unexpected post-migration columns on {table_name}.")
        for name, old_shape in before[table_name]["columns"].items():
            if _column_shape(by_name[name]) != old_shape:
                raise RuntimeError(f"Existing column changed: {table_name}.{name}.")
        for name, expected_type in new_columns.items():
            actual = by_name[name]
            expected_nullable = _new_column_nullable(profile, table_name, name)
            if (
                _type_name(actual["type"]) != _type_name(expected_type)
                or actual["nullable"] != expected_nullable
            ):
                raise RuntimeError(f"New column definition mismatch: {table_name}.{name}.")
        for category, inspector_method in (
            ("pk", inspector.get_pk_constraint),
            ("fk", inspector.get_foreign_keys),
            ("unique", inspector.get_unique_constraints),
            ("indexes", inspector.get_indexes),
            ("checks", inspector.get_check_constraints),
        ):
            actual = inspector_method(table_name, schema="public")
            if actual != before[table_name][category]:
                raise RuntimeError(f"Existing {category} changed on {table_name}.")


def row_fingerprint_without_new_columns(connection, table_name):
    ignored = {
        "subscriptions": ("current_period_start", "current_period_end"),
        "invoices": ("pdf_metadata",),
        "payment_transactions": ("plan_name_snapshot",),
    }.get(table_name)
    if ignored is None:
        raise ValueError("Unsupported table for billing-field preservation check.")
    ignored_sql = ", ".join(f"'{name}'" for name in ignored)
    result = connection.execute(sa.text(f"""
        SELECT count(*) AS rows,
               md5(coalesce(string_agg(h, '' ORDER BY h), '')) AS digest
        FROM (
            SELECT md5((to_jsonb(t) - ARRAY[{ignored_sql}]::text[])::text) AS h
            FROM public.{table_name} AS t
        ) AS rows_without_new_columns
    """)).mappings().one()
    return result["rows"], result["digest"]
