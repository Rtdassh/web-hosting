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

    expected_trigger_names = set(ROW_TRIGGERS.values()) | set(TRUNCATE_TRIGGERS.values())
    old_triggers = evidence["triggers"]
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
    require(after["sequences"] == evidence["sequences"], "Sequence changed during V4.")
    require(after["enums"] == evidence["enums"], "Enum changed during V4.")
    require(
        after.get("row_security") == evidence.get("row_security")
        and after.get("event_triggers") == evidence.get("event_triggers"),
        "RLS or event-trigger definitions changed during V4.",
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
                    if revision == ["d0001_adopt_debian"]:
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
