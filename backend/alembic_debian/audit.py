"""Explicit read-only capture/check for an isolated copy; no migrations or stamp."""
import argparse
import copy
import json
from pathlib import Path
import sqlalchemy as sa
from app.core.migration_config import migration_url
from .evidence import capture, fingerprint, canonical, session_settings
from .verify import validate_before, validate_preserved, require, ReconciliationBlocked
from .reconcile import verify_after
from .contract import CORE, LEGACY, NEW, expected_metadata
from alembic_billing_fields import row_fingerprint_without_new_columns
from alembic_financial_history import (
    FUNCTION_NAME,
    ROW_TRIGGERS,
    TRUNCATE_TRIGGERS,
    USER_FK_NAMES,
)


def _verify_audit_fk(audit_table):
    column = next(
        (column for column in audit_table["columns"] if column["name"] == "target_instance_id"),
        None,
    )
    require(column is not None and column["nullable"], "Audit target must remain nullable.")
    foreign_keys = [
        fk for fk in audit_table["fk"]
        if fk.get("constrained_columns") == ["target_instance_id"]
    ]
    require(
        len(foreign_keys) == 1
        and foreign_keys[0].get("referred_table") == "instances"
        and foreign_keys[0].get("referred_schema") in (None, "public")
        and foreign_keys[0].get("referred_columns") == ["id"]
        and (foreign_keys[0].get("options") or {}).get("ondelete") == "SET NULL"
        and (foreign_keys[0].get("options") or {}).get("onupdate") in (None, "NO ACTION")
        and not (foreign_keys[0].get("options") or {}).get("deferrable")
        and foreign_keys[0].get("name") == "fk_admin_audit_logs_target_instance_id_instances",
        "V2 audit-instance FK does not match the reviewed SET NULL contract.",
    )


def verify_after_v2(connection, evidence):
    after = capture(connection)
    validate_preserved(evidence, after)
    _verify_audit_fk(after["tables"]["admin_audit_logs"])


def verify_after_v3(connection, evidence):
    after = capture(connection)
    normalized = copy.deepcopy(after)
    for table_name, new_columns in {
        "subscriptions": {"current_period_start", "current_period_end"},
        "invoices": {"pdf_metadata"},
    }.items():
        table = normalized["tables"][table_name]
        table["columns"] = [
            column for column in table["columns"]
            if column["name"] not in new_columns
        ]
        rows, digest = row_fingerprint_without_new_columns(connection, table_name)
        table["rows"] = rows
        table["digest"] = digest
    validate_preserved(evidence, normalized)

    _verify_audit_fk(after["tables"]["admin_audit_logs"])
    expected = {
        "subscriptions": {
            "current_period_start": "TIMESTAMP WITH TIME ZONE",
            "current_period_end": "TIMESTAMP WITH TIME ZONE",
        },
        "invoices": {"pdf_metadata": "JSONB"},
    }
    for table_name, fields in expected.items():
        columns = {column["name"]: column for column in after["tables"][table_name]["columns"]}
        for name, sql_type in fields.items():
            column = columns.get(name)
            require(
                column is not None
                and column["type"] == sql_type
                and column["nullable"],
                f"V3 field does not match the reviewed contract: {table_name}.{name}.",
            )


def _financial_user_fk(table, table_name):
    foreign_keys = [
        foreign_key
        for foreign_key in table["fk"]
        if foreign_key.get("constrained_columns") == ["user_id"]
    ]
    require(len(foreign_keys) == 1, f"Expected one financial user FK on {table_name}.")
    foreign_key = foreign_keys[0]
    options = foreign_key.get("options") or {}
    require(
        foreign_key.get("name") == USER_FK_NAMES[table_name]
        and foreign_key.get("referred_table") == "users"
        and foreign_key.get("referred_schema") in (None, "public")
        and foreign_key.get("referred_columns") == ["id"]
        and options.get("ondelete") == "RESTRICT"
        and options.get("onupdate") in (None, "NO ACTION")
        and not options.get("deferrable", False),
        f"Financial user FK does not match the V4 contract: {table_name}.",
    )
    return foreign_key


def verify_after_v4(connection, evidence):
    after = capture(connection)
    require(
        set(after["tables"]) == set(evidence["tables"]),
        "Table inventory changed during V4.",
    )
    normalized = copy.deepcopy(after)
    transaction = normalized["tables"]["payment_transactions"]
    transaction["columns"] = [
        column for column in transaction["columns"]
        if column["name"] != "plan_name_snapshot"
    ]
    rows, digest = row_fingerprint_without_new_columns(
        connection,
        "payment_transactions",
    )
    transaction["rows"] = rows
    transaction["digest"] = digest

    for table_name in USER_FK_NAMES:
        _financial_user_fk(after["tables"][table_name], table_name)
        original_foreign_keys = evidence["tables"][table_name]["fk"]
        original_user_fk = [
            foreign_key
            for foreign_key in original_foreign_keys
            if foreign_key.get("constrained_columns") == ["user_id"]
        ]
        require(
            len(original_user_fk) == 1,
            f"V3 evidence does not contain one user FK on {table_name}.",
        )
        current_foreign_keys = normalized["tables"][table_name]["fk"]
        current_index = next(
            index for index, foreign_key in enumerate(current_foreign_keys)
            if foreign_key.get("constrained_columns") == ["user_id"]
        )
        current_foreign_keys[current_index] = original_user_fk[0]

    for table_name, original in evidence["tables"].items():
        normalized["tables"][table_name]["fk"] = sorted(
            normalized["tables"][table_name]["fk"],
            key=canonical,
        )
        expected = copy.deepcopy(original)
        expected["fk"] = sorted(original["fk"], key=canonical)
        require(
            normalized["tables"][table_name] == expected,
            f"Financial-history migration changed preserved table data or schema: {table_name}.",
        )

    _verify_financial_contract(connection, after, evidence["triggers"])
    require(after["sequences"] == evidence["sequences"], "Sequence changed during V4.")
    require(after["enums"] == evidence["enums"], "Enum changed during V4.")
    require(
        after.get("row_security") == evidence.get("row_security")
        and after.get("event_triggers") == evidence.get("event_triggers"),
        "RLS or event-trigger definitions changed during V4.",
    )


def _verify_financial_contract(connection, after, old_triggers):
    expected_trigger_names = set(ROW_TRIGGERS.values()) | set(TRUNCATE_TRIGGERS.values())
    require(
        all(trigger in after["triggers"] for trigger in old_triggers),
        "An existing trigger changed during V4.",
    )
    added_triggers = [
        trigger for trigger in after["triggers"]
        if trigger not in old_triggers
    ]
    require(
        {trigger["tgname"] for trigger in added_triggers} == expected_trigger_names
        and len(added_triggers) == len(expected_trigger_names)
        and all(trigger["tgenabled"] == "O" for trigger in added_triggers),
        "V4 financial-history triggers are missing, disabled or unexpected.",
    )
    for table_name, trigger_name in (
        *ROW_TRIGGERS.items(),
        *TRUNCATE_TRIGGERS.items(),
    ):
        trigger = next(
            item for item in added_triggers if item["tgname"] == trigger_name
        )
        definition = trigger["definition"].upper()
        is_truncate = trigger_name in TRUNCATE_TRIGGERS.values()
        require(
            trigger["table_name"] == table_name
            and ("TRUNCATE" in definition if is_truncate else "UPDATE" in definition and "DELETE" in definition)
            and "EXECUTE FUNCTION" in definition
            and FUNCTION_NAME.upper() in definition,
            f"V4 trigger definition mismatch: {trigger_name}.",
        )

    function_source = connection.execute(sa.text("""
        SELECT p.prosrc
        FROM pg_catalog.pg_proc AS p
        JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = :function_name
    """), {"function_name": FUNCTION_NAME}).scalar_one_or_none()
    require(
        function_source is not None
        and "financial history is immutable" in function_source.lower()
        and "55000" in function_source,
        "V4 financial-history trigger function does not match the reviewed contract.",
    )
    require(
        connection.execute(sa.text(
            "SELECT count(*) FROM public.payment_transactions "
            "WHERE plan_name_snapshot IS NOT NULL"
        )).scalar_one() == 0,
        "V4 must not invent snapshots for historical purchases.",
    )
    snapshot = {
        column["name"]: column
        for column in after["tables"]["payment_transactions"]["columns"]
    }.get("plan_name_snapshot")
    require(
        snapshot is not None
        and snapshot["type"] == "VARCHAR(50)"
        and snapshot["nullable"],
        "V4 snapshot column does not match the reviewed contract.",
    )


DEBIAN_STAGES = (
    "d0001_adopt_debian", "d0002_admin_audit_set_null",
    "d0003_subscription_period", "d0004_financial_history",
)


def _strip_nullable_fields(connection, normalized, table_name, fields):
    table = normalized["tables"][table_name]
    columns = {column["name"]: column for column in table["columns"]}
    for name, sql_type in fields.items():
        column = columns.get(name)
        require(column is not None and column["type"] == sql_type
                and column["nullable"] and column.get("default") is None
                and not column.get("identity") and not column.get("computed"),
                f"Unexpected cumulative field definition: {table_name}.{name}.")
    # These columns were added nullable without backfill. Do not hide writes by
    # merely removing them from a hash comparison.
    condition = " OR ".join(f"{name} IS NOT NULL" for name in fields)
    require(connection.execute(sa.text(
        f"SELECT count(*) FROM public.{table_name} WHERE {condition}"
    )).scalar_one() == 0, f"New fields contain unexpected data: {table_name}.")
    table["columns"] = [column for column in table["columns"] if column["name"] not in fields]
    table["rows"], table["digest"] = row_fingerprint_without_new_columns(connection, table_name)


def verify_complete_chain(connection, evidence, revision):
    """Compare a pre-d0001 manifest to V1-V4, reversing only verified additions.

    Normalization is in memory only. Original evidence and DB remain untouched;
    the d0001 frozen structural checker still validates the normalized result.
    """
    require(revision in DEBIAN_STAGES, "Unexpected Debian revision.")
    require(set(evidence["tables"]) == CORE | LEGACY, "Expected pre-adoption evidence.")
    stage = DEBIAN_STAGES.index(revision) + 1
    after = capture(connection)
    require(set(after["tables"]) == set(evidence["tables"]) | NEW,
            "Unexpected cumulative table inventory.")
    require(evidence["tables"]["payment_transactions"]["rows"] == 0,
            "Original payment table must be empty for adoption.")
    normalized = copy.deepcopy(after)

    if stage >= 4:
        _verify_financial_contract(connection, after, evidence["triggers"])
        for table_name in USER_FK_NAMES:
            _financial_user_fk(after["tables"][table_name], table_name)
            table = normalized["tables"][table_name]
            index = next(i for i, fk in enumerate(table["fk"]) if fk["constrained_columns"] == ["user_id"])
            if table_name == "payment_transactions":
                original = [fk for fk in evidence["tables"][table_name]["fk"] if fk["constrained_columns"] == ["user_id"]]
                require(len(original) == 1, "Original evidence lacks the payment user FK.")
                table["fk"][index] = copy.deepcopy(original[0])
            else:
                # invoices did not exist in the original manifest. Its d0001
                # FK has NO ACTION, validated against the frozen definition below.
                table["fk"][index]["options"] = {}
        _strip_nullable_fields(connection, normalized, "payment_transactions", {"plan_name_snapshot": "VARCHAR(50)"})
        names = set(ROW_TRIGGERS.values()) | set(TRUNCATE_TRIGGERS.values())
        normalized["triggers"] = [t for t in normalized["triggers"] if t["tgname"] not in names]

    if stage >= 3:
        _strip_nullable_fields(connection, normalized, "subscriptions", {
            "current_period_start": "TIMESTAMP WITH TIME ZONE",
            "current_period_end": "TIMESTAMP WITH TIME ZONE",
        })
        _strip_nullable_fields(connection, normalized, "invoices", {"pdf_metadata": "JSONB"})
    if stage >= 2:
        _verify_audit_fk(after["tables"]["admin_audit_logs"])
        fk = next(f for f in normalized["tables"]["admin_audit_logs"]["fk"] if f["constrained_columns"] == ["target_instance_id"])
        fk["options"] = {}  # reverse only the validated SET NULL change

    frozen = expected_metadata("debian")
    new_sequences = set()
    for table_name in NEW:
        table = normalized["tables"][table_name]
        require(table["rows"] == 0, f"New table contains unexpected rows: {table_name}.")
        require(not table["checks"] and len(table["fk"]) == len(frozen.tables[table_name].foreign_keys),
                f"Unexpected new-table constraints: {table_name}.")
        sequence = connection.execute(sa.text("SELECT pg_get_serial_sequence(:table, 'id')"), {"table": "public." + table_name}).scalar_one()
        require(sequence == "public." + table_name + "_id_seq", f"Unexpected new ID generator: {table_name}.")
        name = table_name + "_id_seq"
        for column in table["columns"]:
            valid_defaults = (None,) if column["name"] != "id" else (
                f"nextval('{name}'::regclass)", f"nextval('public.{name}'::regclass)",
                f"""nextval('"public".{name}'::regclass)""",
            )
            require(column.get("default") in valid_defaults
                    and not column.get("identity") and not column.get("computed"),
                    f"Unexpected new-table column generator/default: {table_name}.{column['name']}.")
        new_sequences.add(name)
        state = after["sequences"].get(name, {})
        require(state.get("last_value") == 1 and state.get("is_called") is False
                and state.get("start_value") == 1 and state.get("min_value") == 1
                and state.get("max_value") == 2147483647 and state.get("data_type") == "integer"
                and state.get("increment_by") == 1 and state.get("cycle") is False,
                f"Unexpected new sequence state: {name}.")
    require(set(after["sequences"]) == set(evidence["sequences"]) | new_sequences,
            "Unexpected cumulative sequence inventory.")
    require(after["enums"] == evidence["enums"], "Unexpected cumulative enum change.")
    for row in after.get("row_security", []):
        if row["relname"] in NEW:
            require(not row["relrowsecurity"] and not row["relforcerowsecurity"], "Unexpected RLS on new table.")

    # Compare legacy data/columns/FKs/sequences to the ORIGINAL manifest, then
    # validate every d0001 table/column/FK/index using the existing checker.
    original = copy.deepcopy(evidence)
    for snapshot in (original, normalized):
        for table in snapshot["tables"].values():
            table["fk"] = sorted(table["fk"], key=canonical)
    verify_after(connection, original, after=normalized)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--capture", metavar="NEW_JSON_FILE")
    group.add_argument("--verify-before", metavar="MANIFEST")
    group.add_argument("--verify-after", metavar="MANIFEST")
    parser.add_argument("--use-project-database", action="store_true")
    args = parser.parse_args()
    engine = sa.create_engine(migration_url(args.use_project_database), hide_parameters=True)
    try:
        with engine.connect() as connection, connection.begin():
            connection.execute(sa.text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
            session_settings(connection)
            if args.capture:
                evidence = capture(connection)
                with Path(args.capture).open("x", encoding="utf-8") as output:
                    output.write(canonical(evidence) + "\n")
                print("Evidence SHA256:", fingerprint(evidence))
                validate_before(connection, evidence)
            else:
                evidence = json.loads(Path(args.verify_before or args.verify_after).read_text(encoding="utf-8"))
                if args.verify_before:
                    require(capture(connection) == evidence, "Evidence drift detected.")
                    validate_before(connection, evidence)
                else:
                    revision = connection.execute(sa.text("SELECT version_num FROM public.alembic_version")).scalars().all()
                    if (set(evidence["tables"]) == CORE | LEGACY
                            and revision in [[name] for name in DEBIAN_STAGES]):
                        verify_complete_chain(connection, evidence, revision[0])
                    elif revision == ["d0001_adopt_debian"]:
                        verify_after(connection, evidence)
                    elif revision == ["d0002_admin_audit_set_null"]:
                        verify_after_v2(connection, evidence)
                    elif revision == ["d0003_subscription_period"]:
                        verify_after_v3(connection, evidence)
                    elif revision == ["d0004_financial_history"]:
                        verify_after_v4(connection, evidence)
                    else:
                        require(False, "Unexpected Alembic revision.")
            print("Read-only verification OK.")
    except ReconciliationBlocked as error:
        print("BLOCKED:", str(error))
        return 2
    except Exception:
        print("Audit failed; check permissions, target and evidence file. No credentials or row values were printed.")
        return 2
    finally:
        engine.dispose()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
