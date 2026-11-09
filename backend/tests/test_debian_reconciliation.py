"""Contracts and opt-in tests for the separate Debian lineage.

Unknown remote SQL types/defaults are fixture choices, NOT asserted Debian DDL.
The actual copy must pass preflight independently.
"""
import copy
from contextlib import redirect_stdout
from io import StringIO
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from datetime import datetime, timezone
import unittest
from unittest.mock import MagicMock, patch

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session
from alembic import command
from alembic.config import Config
from app.models import User, Plan, Subscription, Instance, PortAllocation, InstanceStatus, UserRole
from app.seed import seed_db
from app.core.legacy_schema_policy import include_object
from alembic_debian.contract import CORE, LEGACY, expected_metadata
from alembic_debian.evidence import capture, fingerprint, session_settings
from alembic_debian.verify import validate_before, validate_preserved, ReconciliationBlocked, primary_index_covers
from alembic_debian.reconcile import verify_after
from tests.test_migrations import BACKEND
from tests.test_migrations_postgres import (
    DEBIAN_DATABASES,
    _assert_empty_test_database,
    _assert_test_postgres_environment,
    _assert_test_postgres_major,
    _configured_test_database,
)


def config(connection, evidence=None):
    cfg = Config(str(BACKEND / "alembic-debian.ini"))
    cfg.attributes["connection"] = connection
    if evidence is not None:
        cfg.attributes["debian_evidence"] = evidence
        cfg.attributes["debian_digest"] = fingerprint(evidence)
    return cfg


class DebianOfflineTests(unittest.TestCase):
    @staticmethod
    def _v3_preservation_snapshots():
        table = {
            "columns": [],
            "pk": {},
            "fk": [],
            "unique": [],
            "indexes": [],
            "checks": [],
            "rows": 1,
            "digest": "historical-digest",
        }
        before = {
            "tables": {
                name: copy.deepcopy(table)
                for name in (
                    "subscriptions",
                    "invoices",
                    "admin_audit_logs",
                    "password_reset_tokens",
                )
            },
            "triggers": [],
            "row_security": [],
            "event_triggers": [],
            "sequences": {},
            "enums": [],
        }
        before["tables"]["subscriptions"]["columns"] = [
            {"name": "status", "type": "VARCHAR(50)", "nullable": False},
        ]
        before["tables"]["invoices"]["columns"] = [
            {"name": "amount", "type": "DOUBLE PRECISION", "nullable": False},
        ]
        after = copy.deepcopy(before)
        after["tables"]["subscriptions"]["columns"].extend([
            {
                "name": "current_period_start",
                "type": "TIMESTAMP WITH TIME ZONE",
                "nullable": True,
            },
            {
                "name": "current_period_end",
                "type": "TIMESTAMP WITH TIME ZONE",
                "nullable": True,
            },
        ])
        after["tables"]["invoices"]["columns"].append(
            {"name": "pdf_metadata", "type": "JSONB", "nullable": True},
        )
        after["tables"]["subscriptions"]["digest"] = "digest-including-new-periods"
        after["tables"]["invoices"]["digest"] = "digest-including-pdf-metadata"
        return before, after

    def test_distinct_history(self):
        from alembic.script import ScriptDirectory
        scripts = ScriptDirectory.from_config(Config(str(BACKEND / "alembic-debian.ini")))
        self.assertEqual(scripts.get_heads(), ["d0004_financial_history"])
        self.assertIsNone(scripts.get_revision("d0001_adopt_debian").down_revision)
        self.assertEqual(
            scripts.get_revision("d0002_admin_audit_set_null").down_revision,
            "d0001_adopt_debian",
        )
        self.assertEqual(
            scripts.get_revision("d0003_subscription_period").down_revision,
            "d0002_admin_audit_set_null",
        )
        self.assertEqual(
            scripts.get_revision("d0004_financial_history").down_revision,
            "d0003_subscription_period",
        )
        with self.assertRaises(RuntimeError):
            scripts.get_revision("d0004_financial_history").module.downgrade()

    def test_v3_debian_postcheck_requires_nullable_periods_and_jsonb(self):
        from alembic_debian.audit import verify_after_v3

        before = {
            "tables": {
                "subscriptions": {"columns": [], "rows": 0, "digest": ""},
                "admin_audit_logs": {"columns": [], "fk": []},
                "invoices": {"columns": []},
            }
        }
        after = copy.deepcopy(before)
        after["tables"]["subscriptions"]["columns"] = [
            {"name": "current_period_start", "type": "TIMESTAMP WITH TIME ZONE", "nullable": True},
            {"name": "current_period_end", "type": "TIMESTAMP WITH TIME ZONE", "nullable": True},
        ]
        after["tables"]["invoices"]["columns"] = [
            {"name": "pdf_metadata", "type": "JSONB", "nullable": True},
        ]
        with patch("alembic_debian.audit.capture", return_value=after), \
             patch("alembic_debian.audit.row_fingerprint_without_new_columns", return_value=(0, "")), \
             patch("alembic_debian.audit._verify_audit_fk"), \
             patch("alembic_debian.audit.validate_preserved"):
            verify_after_v3(object(), before)

        after["tables"]["invoices"]["columns"][0]["nullable"] = False
        with patch("alembic_debian.audit.capture", return_value=after), \
             patch("alembic_debian.audit.row_fingerprint_without_new_columns", return_value=(0, "")), \
             patch("alembic_debian.audit.validate_preserved"), \
             patch("alembic_debian.audit._verify_audit_fk"), \
             self.assertRaises(ReconciliationBlocked):
            verify_after_v3(object(), before)

    def test_v3_invoice_metadata_does_not_change_historical_fingerprint(self):
        from alembic_debian.audit import verify_after_v3

        before, after = self._v3_preservation_snapshots()
        with patch("alembic_debian.audit.capture", return_value=after), \
             patch(
                 "alembic_debian.audit.row_fingerprint_without_new_columns",
                 side_effect=[
                     (1, "historical-digest"),
                     (1, "historical-digest"),
                 ],
             ) as historical_fingerprint, \
             patch("alembic_debian.audit._verify_audit_fk"):
            verify_after_v3(object(), before)

        self.assertEqual(
            [call.args[1] for call in historical_fingerprint.call_args_list],
            ["subscriptions", "invoices"],
        )

    def test_v3_detects_historical_invoice_value_change(self):
        from alembic_debian.audit import verify_after_v3

        before, after = self._v3_preservation_snapshots()
        with patch("alembic_debian.audit.capture", return_value=after), \
             patch(
                 "alembic_debian.audit.row_fingerprint_without_new_columns",
                 side_effect=[
                     (1, "historical-digest"),
                     (1, "changed-historical-digest"),
                 ],
             ), \
             patch("alembic_debian.audit._verify_audit_fk"), \
             self.assertRaisesRegex(ReconciliationBlocked, "Rows changed: invoices"):
            verify_after_v3(object(), before)

    def test_v3_detects_historical_invoice_count_change(self):
        from alembic_debian.audit import verify_after_v3

        before, after = self._v3_preservation_snapshots()
        with patch("alembic_debian.audit.capture", return_value=after), \
             patch(
                 "alembic_debian.audit.row_fingerprint_without_new_columns",
                 side_effect=[
                     (1, "historical-digest"),
                     (2, "historical-digest"),
                 ],
             ), \
             patch("alembic_debian.audit._verify_audit_fk"), \
             self.assertRaisesRegex(ReconciliationBlocked, "Rows changed: invoices"):
            verify_after_v3(object(), before)

    @staticmethod
    def _v4_preservation_snapshots():
        transaction_user_fk = {
            "name": "payment_transactions_user_id_fkey",
            "constrained_columns": ["user_id"],
            "referred_table": "users",
            "referred_schema": "public",
            "referred_columns": ["id"],
            "options": {},
        }
        transaction_plan_fk = {
            "name": "payment_transactions_plan_id_fkey",
            "constrained_columns": ["plan_id"],
            "referred_table": "plans",
            "referred_schema": "public",
            "referred_columns": ["id"],
            "options": {},
        }
        invoice_user_fk = {
            "name": "invoices_user_id_fkey",
            "constrained_columns": ["user_id"],
            "referred_table": "users",
            "referred_schema": "public",
            "referred_columns": ["id"],
            "options": {},
        }
        invoice_transaction_fk = {
            "name": "invoices_transaction_id_fkey",
            "constrained_columns": ["transaction_id"],
            "referred_table": "payment_transactions",
            "referred_schema": "public",
            "referred_columns": ["id"],
            "options": {},
        }
        tables = {
            "payment_transactions": {
                "columns": [
                    {"name": "id", "type": "INTEGER", "nullable": False},
                    {"name": "user_id", "type": "INTEGER", "nullable": False},
                    {"name": "plan_id", "type": "INTEGER", "nullable": False},
                ],
                "pk": {"constrained_columns": ["id"]},
                "fk": [transaction_user_fk, transaction_plan_fk],
                "unique": [],
                "indexes": [],
                "checks": [],
                "rows": 1,
                "digest": "transaction-without-snapshot",
            },
            "invoices": {
                "columns": [
                    {"name": "id", "type": "INTEGER", "nullable": False},
                    {"name": "user_id", "type": "INTEGER", "nullable": False},
                    {"name": "transaction_id", "type": "INTEGER", "nullable": False},
                ],
                "pk": {"constrained_columns": ["id"]},
                "fk": [invoice_user_fk, invoice_transaction_fk],
                "unique": [],
                "indexes": [],
                "checks": [],
                "rows": 1,
                "digest": "invoice-history",
            },
        }
        before = {
            "tables": copy.deepcopy(tables),
            "triggers": [],
            "sequences": {},
            "enums": [],
            "row_security": [],
            "event_triggers": [],
        }
        after = copy.deepcopy(before)
        after["tables"]["payment_transactions"]["columns"].append({
            "name": "plan_name_snapshot",
            "type": "VARCHAR(50)",
            "nullable": True,
        })
        after["tables"]["payment_transactions"]["fk"] = [
            {
                **transaction_user_fk,
                "name": "fk_payment_transactions_user_id_users",
                "options": {"ondelete": "RESTRICT"},
            },
            transaction_plan_fk,
        ]
        after["tables"]["invoices"]["fk"] = [
            {
                **invoice_transaction_fk,
            },
            {
                **invoice_user_fk,
                "name": "fk_invoices_user_id_users",
                "options": {"ondelete": "RESTRICT"},
            },
        ]
        for table_name, trigger_name in (
            ("payment_transactions", "trg_payment_transactions_immutable_row"),
            ("invoices", "trg_invoices_immutable_row"),
            ("payment_transactions", "trg_payment_transactions_no_truncate"),
            ("invoices", "trg_invoices_no_truncate"),
        ):
            is_truncate = "no_truncate" in trigger_name
            operation = "TRUNCATE" if is_truncate else "UPDATE OR DELETE"
            level = "STATEMENT" if is_truncate else "ROW"
            after["triggers"].append({
                "table_name": table_name,
                "tgname": trigger_name,
                "tgenabled": "O",
                "definition": (
                    f"CREATE TRIGGER {trigger_name} BEFORE {operation} ON public.{table_name} "
                    f"FOR EACH {level} EXECUTE FUNCTION public.codrop_reject_financial_mutation()"
                ),
            })
        return before, after

    @staticmethod
    def _verify_v4_snapshot(before, after, transaction_digest="transaction-without-snapshot"):
        from alembic_debian.audit import verify_after_v4

        class QueryResult:
            def __init__(self, value):
                self.value = value

            def scalar_one_or_none(self):
                return self.value

            def scalar_one(self):
                return self.value

        connection = MagicMock()
        connection.execute.side_effect = [
            QueryResult("RAISE EXCEPTION 'Financial history is immutable.'; 55000"),
            QueryResult(0),
        ]
        with patch("alembic_debian.audit.capture", return_value=after), \
             patch(
                 "alembic_debian.audit.row_fingerprint_without_new_columns",
                 return_value=(1, transaction_digest),
             ):
            verify_after_v4(connection, before)

    def test_v4_fk_order_is_normalized_but_fk_and_historical_data_changes_fail(self):
        before, after = self._v4_preservation_snapshots()
        self._verify_v4_snapshot(before, after)

        altered_fk = copy.deepcopy(after)
        altered_fk["tables"]["invoices"]["fk"][0]["referred_table"] = "users"
        with self.assertRaisesRegex(
            ReconciliationBlocked,
            "preserved table data or schema: invoices",
        ):
            self._verify_v4_snapshot(before, altered_fk)

        altered_data = copy.deepcopy(after)
        altered_data["tables"]["invoices"]["digest"] = "changed-invoice-history"
        with self.assertRaisesRegex(
            ReconciliationBlocked,
            "preserved table data or schema: invoices",
        ):
            self._verify_v4_snapshot(before, altered_data)

    def test_v2_postcheck_requires_named_set_null_audit_fk(self):
        from alembic_debian.audit import verify_after_v2

        before = {
            "tables": {
                "admin_audit_logs": {
                    "columns": [{"name": "target_instance_id", "nullable": True}],
                    "fk": [{
                        "name": "fk_admin_audit_logs_target_instance_id_instances",
                        "constrained_columns": ["target_instance_id"],
                        "referred_table": "instances",
                        "referred_columns": ["id"],
                        "options": {"ondelete": "SET NULL"},
                    }],
                }
            }
        }
        with patch("alembic_debian.audit.capture", return_value=before), \
             patch("alembic_debian.audit.validate_preserved"):
            verify_after_v2(object(), {})
        before["tables"]["admin_audit_logs"]["fk"][0]["options"]["ondelete"] = "NO ACTION"
        with patch("alembic_debian.audit.capture", return_value=before), \
             patch("alembic_debian.audit.validate_preserved"), \
             self.assertRaises(ReconciliationBlocked):
            verify_after_v2(object(), {})

    def test_offline_adoption_cannot_bypass_verification(self):
        with patch("sqlalchemy.engine.Engine.connect", side_effect=AssertionError("No connection")):
            with self.assertRaises(RuntimeError):
                command.upgrade(Config(str(BACKEND / "alembic-debian.ini"), output_buffer=StringIO()), "head", sql=True)

    def test_autogenerate_preserves_legacy_column_and_fk(self):
        metadata = sa.MetaData()
        sa.Table("templates", metadata, sa.Column("id", sa.Integer(), primary_key=True))
        table = sa.Table("instances", metadata, sa.Column("template_id", sa.Integer(), sa.ForeignKey("templates.id", ondelete="SET NULL")))
        self.assertFalse(include_object(table.c.template_id, "template_id", "column", True, None))
        self.assertFalse(include_object(next(iter(table.foreign_key_constraints)), "legacy_fk", "foreign_key_constraint", True, None))
        self.assertTrue(include_object(sa.Column("unreviewed", sa.Text()), "unreviewed", "column", True, None))

    def test_autogenerate_does_not_add_redundant_primary_key_index(self):
        table = sa.Table("sample", sa.MetaData(), sa.Column("id", sa.Integer(), primary_key=True),
                         sa.Column("other", sa.Integer()))
        redundant = sa.Index("ix_sample_id", table.c.id)
        nonredundant = sa.Index("ix_sample_other", table.c.other)
        composite = sa.Index("ix_sample_id_other", table.c.id, table.c.other)
        self.assertFalse(include_object(redundant, redundant.name, "index", False, None))
        self.assertTrue(include_object(redundant, redundant.name, "index", True, None))
        self.assertTrue(include_object(nonredundant, nonredundant.name, "index", False, None))
        self.assertTrue(include_object(composite, composite.name, "index", False, None))

    def test_enum_readers_do_not_implicitly_accept_lowercase_varchar_labels(self):
        from sqlalchemy.dialects.postgresql import dialect
        for column, member, lowercase in ((User.__table__.c.role, UserRole.CLIENT, "client"),
                                          (Instance.__table__.c.status, InstanceStatus.RUNNING, "running")):
            reader = column.type.result_processor(dialect(), None)
            self.assertEqual(reader(member.name), member)
            with self.assertRaises(LookupError):
                reader(lowercase)

    def test_preservation_checker_rejects_row_or_sequence_drift(self):
        before = dict(tables={"users": dict(rows=7, digest="original")}, triggers=[],
                      sequences={"s": dict(last_value=7)}, enums=[], row_security=[], event_triggers=[])
        after = copy.deepcopy(before)
        after["tables"].update({n: {} for n in ("invoices", "admin_audit_logs", "password_reset_tokens")})
        after["tables"]["users"]["digest"] = "changed"
        with self.assertRaises(ReconciliationBlocked):
            validate_preserved(before, after)
        after["tables"]["users"]["digest"] = "original"
        validate_preserved(before, after)
        after["sequences"]["s"]["last_value"] = 8
        with self.assertRaisesRegex(ReconciliationBlocked, "Sequence"):
            validate_preserved(before, after)


@unittest.skipUnless(os.environ.get("CODROP_RUN_MIGRATION_TESTS") == "1", "Requires isolated local PostgreSQL")
class DebianPostgreSQLTests(unittest.TestCase):
    def test_adoption_guards_rollback_preservation_and_backend(self):
        database = _configured_test_database(
            self,
            "CODROP_TEST_DB_DEBIAN",
            "codrop_migration_debian",
            DEBIAN_DATABASES,
        )
        password = os.environ.get("CODROP_TEST_POSTGRES_PASSWORD")
        self.assertTrue(password)
        engine = sa.create_engine(URL.create("postgresql+psycopg2", username="codrop_migration_test", password=password,
                                             host="127.0.0.1", port=55432, database=database),
                                  hide_parameters=True, connect_args={"options": "-c timezone=UTC"})
        self.addCleanup(engine.dispose)
        connection = engine.connect()
        self.addCleanup(connection.close)
        _assert_test_postgres_environment(self, connection, database)
        _assert_test_postgres_major(self, connection)
        _assert_empty_test_database(self, connection)
        connection.rollback()
        metadata = sa.MetaData()
        for table in expected_metadata("debian").sorted_tables:
            if table.name in CORE - {"payment_transactions"}:
                table.to_metadata(metadata)
        # Unmanaged tables remain placeholders. Confirmed extra columns below
        # reproduce the report, but base columns deliberately retain the frozen
        # installation contract until an ORM compatibility profile is reviewed.
        for name in sorted(LEGACY):
            key = "port_number" if name == "asignacion_puertos" else "id"
            sa.Table(name, metadata, sa.Column(key, sa.Integer(), primary_key=True))
        sa.Table("payment_transactions", metadata,
                 sa.Column("id", sa.Integer(), primary_key=True),
                 sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
                 sa.Column("amount", sa.Float(), nullable=False),
                 sa.Column("status", sa.String(50), nullable=False),
                 sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))
        for table_name, column_name in (("users", "created_at"), ("subscriptions", "created_at"),
                                        ("instances", "created_at"), ("instances", "updated_at")):
            metadata.tables[table_name].c[column_name].server_default = sa.DefaultClause(sa.text("CURRENT_TIMESTAMP"))
        metadata.tables["users"].c.role.server_default = sa.DefaultClause(sa.text("'client'"))
        metadata.tables["instances"].c.status.server_default = sa.DefaultClause(sa.text("'pending'"))
        metadata.tables["subscriptions"].c.status.server_default = sa.DefaultClause(sa.text("'active'"))
        for name, columns in {
            "users": [sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"))],
            "plans": [sa.Column("billing_period", sa.String(20), nullable=False, server_default=sa.text("'monthly'")),
                      sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
                      sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"))],
            "subscriptions": [sa.Column("start_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
                              sa.Column("end_date", sa.DateTime(timezone=True)),
                              sa.Column("auto_renew", sa.Boolean(), nullable=False, server_default=sa.false())],
            "instances": [sa.Column("template_id", sa.Integer(), sa.ForeignKey("templates.id", ondelete="SET NULL"))],
        }.items():
            for column in columns:
                metadata.tables[name].append_column(column)
        # Reproduce the five redundant-index absences confirmed by the report.
        # Only edit the in-memory fixture BEFORE creation; no DROP is executed.
        primary_only = {"users", "plans", "subscriptions", "instances", "port_allocations"}
        for name in primary_only:
            table = metadata.tables[name]
            for index in list(table.indexes):
                if not index.unique and tuple(c.name for c in index.columns) == tuple(c.name for c in table.primary_key):
                    table.indexes.remove(index)
        metadata.create_all(connection)
        # Reported native types remain present but are not the VARCHAR columns.
        postgresql.ENUM("ADMIN", "CLIENT", name="userrole").create(connection, checkfirst=True)
        postgresql.ENUM("PENDING", "RUNNING", "STOPPED", "FAILED", name="instancestatus").create(connection, checkfirst=True)
        connection.commit()
        for name in primary_only:
            key = tuple(c.name for c in metadata.tables[name].primary_key)
            self.assertTrue(primary_index_covers(connection, name, key))
            self.assertFalse(primary_index_covers(connection, name, (*key, "missing")))
        self.assertFalse(primary_index_covers(connection, "instances", ["user_id"]))
        connection.rollback()
        with Session(engine) as db:
            seed_db(db)
            free = db.query(Plan).filter_by(name="Free").one()
            for identifier in range(1, 8):
                db.add(User(id=identifier, email=f"debian{identifier}@example.com", hashed_password="synthetic",
                            full_name="Synthetic Debian", role=UserRole.CLIENT, is_active=True))
            db.flush()
            for identifier in range(1, 8):
                db.execute(sa.text("""
                    INSERT INTO subscriptions (id, user_id, plan_id, status, created_at)
                    VALUES (:id, :user_id, :plan_id, 'active', CURRENT_TIMESTAMP)
                """), {"id": identifier, "user_id": identifier, "plan_id": free.id})
            db.execute(sa.text("""
                UPDATE subscriptions
                SET start_date = '2026-01-01T00:00:00+00:00',
                    end_date = '2027-01-01T00:00:00+00:00',
                    auto_renew = true
                WHERE id = 1
            """))
            for identifier, port in [(14, 30002), (19, 30001), (22, 30003)]:
                db.add(Instance(id=identifier, uuid=f"debian-{identifier}", name="Synthetic", user_id=1,
                                assigned_port=port, public_url=f"http://localhost:{port}",
                                status=InstanceStatus.RUNNING, storage_path="synthetic-unused"))
            db.flush()
            for identifier, port in [(14, 30002), (19, 30001), (22, 30003)]:
                row = db.get(PortAllocation, port)
                row.is_allocated, row.instance_id = True, identifier
            db.execute(sa.insert(metadata.tables["asignacion_puertos"]), [{"port_number": p} for p in range(30001, 30101)])
            db.commit()
        # Advance only fixture sequences using their own nextval, never reset a real sequence.
        for name, steps in (("users", 7), ("subscriptions", 7), ("instances", 22)):
            connection.execute(sa.text("SELECT nextval(pg_get_serial_sequence(:table, 'id')) FROM generate_series(1, :steps)"),
                               {"table": "public." + name, "steps": steps})
        connection.commit()
        with connection.begin():
            session_settings(connection)
            before = capture(connection)
            validate_before(connection, before)
            blocked = copy.deepcopy(before)
            extra = next(c for c in blocked["tables"]["plans"]["columns"] if c["name"] == "billing_period")
            extra["nullable"] = False
            extra["default"] = None
            with self.assertRaisesRegex(ReconciliationBlocked, "ORM inserts omit"):
                validate_before(connection, blocked)
            # Inverse/unreviewed variations must not be waived by profile support.
            mismatches = [
                ("instances", "created_at", "TIMESTAMP WITHOUT TIME ZONE", False),
                ("instances", "status", "VARCHAR(20)", False),
                ("instances", "updated_at", "TIMESTAMP WITH TIME ZONE", True),
                ("payment_transactions", "created_at", "TIMESTAMP WITHOUT TIME ZONE", False),
                ("plans", "description", "VARCHAR(255)", True),
                ("subscriptions", "created_at", "TIMESTAMP WITHOUT TIME ZONE", False),
                ("users", "created_at", "TIMESTAMP WITHOUT TIME ZONE", False),
                ("users", "role", "VARCHAR(20)", False),
            ]
            for table_name, column_name, sql_type, nullable in mismatches:
                blocked = copy.deepcopy(before)
                col = next(c for c in blocked["tables"][table_name]["columns"] if c["name"] == column_name)
                col.update(type=sql_type, nullable=nullable)
                with self.subTest(column=f"{table_name}.{column_name}"), self.assertRaises(ReconciliationBlocked):
                    validate_before(connection, blocked)
            # Keep exact reported actions; unsupported alternatives remain blockers.
            for table_name, column_name, target, action in [
                ("instances", "user_id", "users", "NO ACTION"),
                ("payment_transactions", "user_id", "users", "NO ACTION"),
                ("port_allocations", "instance_id", "instances", "CASCADE"),
                ("subscriptions", "plan_id", "plans", "NO ACTION"),
                ("subscriptions", "user_id", "users", "NO ACTION"),
            ]:
                blocked = copy.deepcopy(before)
                fks = blocked["tables"][table_name]["fk"]
                actual = next((f for f in fks if f["constrained_columns"] == [column_name]), None)
                if actual is None:
                    actual = dict(constrained_columns=[column_name], referred_table=target,
                                  referred_schema="public", referred_columns=["id"], options={})
                    fks.append(actual)
                actual["options"]["ondelete"] = action
                with self.subTest(fk=f"{table_name}.{column_name}"), self.assertRaises(ReconciliationBlocked):
                    validate_before(connection, blocked)
            for mutation in ("nonempty_payment", "status_default", "enum_labels"):
                blocked = copy.deepcopy(before)
                if mutation == "nonempty_payment":
                    blocked["tables"]["payment_transactions"]["rows"] = 1
                elif mutation == "status_default":
                    next(c for c in blocked["tables"]["payment_transactions"]["columns"] if c["name"] == "status")["default"] = "'pending'"
                else:
                    next(c for c in blocked["tables"]["users"]["columns"] if c["name"] == "role")["enum"] = ["admin", "client"]
                with self.assertRaises(ReconciliationBlocked):
                    validate_before(connection, blocked)
        with connection.begin():
            connection.execute(sa.text("SET TRANSACTION READ ONLY"))
            diagnostic = list(connection.execute(sa.text(
                (BACKEND.parent / "docs/sql/debian_diagnostico_unificado_readonly.sql").read_text(encoding="utf-8")
            )).mappings())
            blockers = [(r["elemento"], r["detalle"]) for r in diagnostic
                        if r["resultado"] in {"BLOQUEO_D0001", "NO_VERIFICADO"}]
            self.assertEqual(blockers, [])
        # Exercise the actual READ ONLY audit CLI against the isolated fixture.
        from alembic_debian import audit
        with TemporaryDirectory(prefix="codrop-evidence-") as temp:
            manifest = str(Path(temp) / "before.json")
            with patch.object(audit, "migration_url", return_value=engine.url), \
                 patch("sys.argv", ["audit", "--capture", manifest]), redirect_stdout(StringIO()):
                self.assertEqual(audit.main(), 0)
            with patch.object(audit, "migration_url", return_value=engine.url), \
                 patch("sys.argv", ["audit", "--verify-before", manifest]), redirect_stdout(StringIO()):
                self.assertEqual(audit.main(), 0)
        with self.assertRaises(RuntimeError):
            command.stamp(config(connection), "head")
        self.assertNotIn("alembic_version", sa.inspect(connection).get_table_names(schema="public"))
        connection.rollback()
        with self.assertRaises(RuntimeError):
            command.upgrade(config(connection), "head")  # missing manifest
        self.assertNotIn("alembic_version", sa.inspect(connection).get_table_names(schema="public"))
        connection.rollback()
        cfg = config(connection, before)
        cfg.attributes["debian_digest"] = "invalid"
        with self.assertRaisesRegex(ReconciliationBlocked, "digest"):
            command.upgrade(cfg, "head")
        # Force failure after DDL: every added table/column and version must roll back.
        with patch("alembic_debian.reconcile.verify_after", side_effect=ReconciliationBlocked("Injected postcheck failure")):
            with self.assertRaises(ReconciliationBlocked):
                command.upgrade(config(connection, before), "d0003_subscription_period")
        with connection.begin():
            session_settings(connection)
            self.assertEqual(capture(connection), before)
        command.upgrade(config(connection, before), "d0001_adopt_debian")
        with connection.begin():
            session_settings(connection)
            verify_after(connection, before)
        with TemporaryDirectory(prefix="codrop-postcheck-") as temp:
            manifest = Path(temp) / "before.json"
            from alembic_debian.evidence import canonical
            manifest.write_text(canonical(before), encoding="utf-8")
            with patch.object(audit, "migration_url", return_value=engine.url), \
                 patch("sys.argv", ["audit", "--verify-after", str(manifest)]), redirect_stdout(StringIO()):
                self.assertEqual(audit.main(), 0)
        from app.models import AdminAuditLog
        with Session(engine) as db:
            audit_record = AdminAuditLog(
                admin_user_id=1,
                target_instance_id=14,
                action="force_destroy",
                details="Created before V2 FK migration",
            )
            db.add(audit_record)
            db.commit()
            audit_id = audit_record.id
        with connection.begin():
            historical_transaction_id = connection.execute(sa.text("""
                INSERT INTO payment_transactions
                    (user_id, plan_id, amount, card_last_four, card_brand, auth_code, status, created_at)
                VALUES (1, (SELECT id FROM plans WHERE name = 'Free'), 1.25, '4242',
                        'Visa', 'AUTH-DEBIAN-HISTORY', 'approved', CURRENT_TIMESTAMP)
                RETURNING id
            """)).scalar_one()
            connection.execute(sa.text("""
                INSERT INTO invoices
                    (transaction_id, user_id, invoice_number, amount, tax, status, created_at)
                VALUES (:transaction_id, 1, 'INV-DEBIAN-HISTORY', 1.25, 0.20, 'paid', CURRENT_TIMESTAMP)
            """), {"transaction_id": historical_transaction_id})
        command.upgrade(config(connection, before), "d0002_admin_audit_set_null")
        with connection.begin():
            session_settings(connection)
            self.assertEqual(
                connection.execute(sa.text(
                    "SELECT version_num FROM public.alembic_version"
                )).scalar_one(),
                "d0002_admin_audit_set_null",
            )
            audit_fks = [
                fk for fk in sa.inspect(connection).get_foreign_keys(
                    "admin_audit_logs", schema="public"
                )
                if fk.get("constrained_columns") == ["target_instance_id"]
            ]
            self.assertEqual(len(audit_fks), 1)
            self.assertEqual(
                audit_fks[0].get("name"),
                "fk_admin_audit_logs_target_instance_id_instances",
            )
            self.assertEqual(
                (audit_fks[0].get("options") or {}).get("ondelete"),
                "SET NULL",
            )
            self.assertEqual(
                connection.execute(sa.text("""
                    SELECT target_instance_id FROM admin_audit_logs WHERE id = :audit_id
                """), {"audit_id": audit_id}).scalar_one(),
                14,
            )
            self.assertNotIn(
                "current_period_start",
                {column["name"] for column in sa.inspect(connection).get_columns(
                    "subscriptions", schema="public"
                )},
            )
            self.assertNotIn(
                "pdf_metadata",
                {column["name"] for column in sa.inspect(connection).get_columns(
                    "invoices", schema="public"
                )},
            )
            before_v3 = capture(connection)
        command.upgrade(config(connection, before), "d0003_subscription_period")
        from alembic_debian.audit import verify_after_v3
        with connection.begin():
            session_settings(connection)
            self.assertEqual(
                connection.execute(sa.text(
                    "SELECT version_num FROM public.alembic_version"
                )).scalar_one(),
                "d0003_subscription_period",
            )
            verify_after_v3(connection, before_v3)
            after_v3 = capture(connection)
            self.assertEqual(before_v3["sequences"], after_v3["sequences"])
            for table_name in ("subscriptions", "invoices"):
                self.assertEqual(
                    before_v3["tables"][table_name]["rows"],
                    after_v3["tables"][table_name]["rows"],
                )
            from alembic_billing_fields import row_fingerprint_without_new_columns
            for table_name in ("subscriptions", "invoices"):
                self.assertEqual(
                    row_fingerprint_without_new_columns(connection, table_name),
                    (
                        before_v3["tables"][table_name]["rows"],
                        before_v3["tables"][table_name]["digest"],
                    ),
                )
            self.assertEqual(
                connection.execute(sa.text("""
                    SELECT start_date, end_date, auto_renew FROM subscriptions WHERE id = 1
                """)).one(),
                (datetime(2026, 1, 1, tzinfo=timezone.utc),
                 datetime(2027, 1, 1, tzinfo=timezone.utc), True),
            )
            self.assertEqual(
                connection.execute(sa.text("""
                    SELECT pdf_metadata FROM invoices WHERE invoice_number = 'INV-DEBIAN-HISTORY'
                """)).scalar_one(),
                None,
            )
        with Session(engine) as db:
            persisted_audit = db.get(AdminAuditLog, audit_id)
            self.assertIsNotNone(persisted_audit)
            self.assertEqual(persisted_audit.target_instance_id, 14)
        with TemporaryDirectory(prefix="codrop-v3-postcheck-") as temp:
            manifest = Path(temp) / "before.json"
            from alembic_debian.evidence import canonical
            manifest.write_text(canonical(before_v3), encoding="utf-8")
            with patch.object(audit, "migration_url", return_value=engine.url), \
                 patch("sys.argv", ["audit", "--verify-after", str(manifest)]), redirect_stdout(StringIO()):
                self.assertEqual(audit.main(), 0)
        with connection.begin():
            session_settings(connection)
            before_v4 = capture(connection)
        command.upgrade(config(connection, before), "head")
        from alembic_debian.audit import verify_after_v4
        with connection.begin():
            session_settings(connection)
            self.assertEqual(
                connection.execute(sa.text(
                    "SELECT version_num FROM public.alembic_version"
                )).scalar_one(),
                "d0004_financial_history",
            )
            verify_after_v4(connection, before_v4)
            self.assertIsNone(connection.execute(sa.text("""
                SELECT plan_name_snapshot
                FROM payment_transactions
                WHERE id = :transaction_id
            """), {"transaction_id": historical_transaction_id}).scalar_one())
        command.check(config(connection))
        with TemporaryDirectory(prefix="codrop-v4-postcheck-") as temp:
            manifest = Path(temp) / "before-v4.json"
            manifest.write_text(canonical(before_v4), encoding="utf-8")
            with patch.object(audit, "migration_url", return_value=engine.url), \
                 patch("sys.argv", ["audit", "--verify-after", str(manifest)]), redirect_stdout(StringIO()):
                self.assertEqual(audit.main(), 0)
        # Real ORM services must accept the upgraded schema and legacy extra columns.
        from app.services.auth_service import auth_service
        from app.services.billing_service import billing_service
        from app.schemas.user_schema import UserCreate
        from app.schemas.billing_schema import CheckoutRequest
        with Session(engine) as db:
            user = auth_service.register_user(UserCreate(email="after@example.com", full_name="After adoption", password="TestOnly123!"), db)
            self.assertEqual(user.id, 8)
            self.assertEqual(user.role, UserRole.CLIENT)
            self.assertEqual(user.created_at.tzinfo, timezone.utc)
            plan = db.query(Plan).filter_by(name="Developer").one()
            result = billing_service.process_checkout(CheckoutRequest(plan_id=plan.id, card_holder="Synthetic",
                card_number="4111111111111111", exp_month=12, exp_year=2040, cvv="123"), user, db)
            self.assertEqual(result["transaction_id"], historical_transaction_id + 1)
            self.assertEqual(len(billing_service.get_user_invoices(user, db)), 1)
            self.assertEqual(db.query(Instance).count(), 3)
            self.assertTrue(all(i.status == InstanceStatus.RUNNING and i.created_at.tzinfo == timezone.utc
                                and i.updated_at is not None and i.updated_at.tzinfo == timezone.utc
                                for i in db.query(Instance).all()))
            long_plan = Plan(name="Long description test", description="x" * 300)
            db.add(long_plan)
            db.commit()
            db.refresh(long_plan)
            self.assertEqual(len(long_plan.description), 300)
            original_instant = user.created_at
            db.execute(sa.text("SET LOCAL TIME ZONE 'America/Guatemala'"))
            db.expire(user)
            self.assertEqual(user.created_at, original_instant)
            self.assertEqual(user.created_at.tzinfo, timezone.utc)
        # HTTP authentication, ownership-aware listing and subscription operations.
        import docker
        from docker.errors import DockerException
        with patch.object(docker, "from_env", side_effect=DockerException("Test isolation")):
            from app.main import app
        from fastapi.testclient import TestClient
        from app.core.database import get_db
        from app.core.security import create_access_token
        def test_db():
            with Session(engine) as db:
                yield db
        app.dependency_overrides[get_db] = test_db
        try:
            with TestClient(app) as client:
                login = client.post("/api/v1/auth/login", json={"email": "after@example.com", "password": "TestOnly123!"})
                self.assertEqual(login.status_code, 200)
                headers = {"Authorization": "Bearer " + login.json()["access_token"]}
                me = client.get("/api/v1/auth/me", headers=headers)
                self.assertEqual(me.status_code, 200)
                self.assertEqual(me.json()["role"], "client")
                self.assertTrue(me.json()["created_at"].endswith(("Z", "+00:00")))
                self.assertEqual(client.get("/api/v1/instances", headers=headers).json(), [])
                free_id = next(p["id"] for p in client.get("/api/v1/plans").json() if p["name"] == "Free")
                self.assertEqual(client.post("/api/v1/subscriptions/change-plan", headers=headers,
                                             json={"target_plan_id": free_id}).status_code, 200)
                owner_headers = {"Authorization": "Bearer " + create_access_token(1, UserRole.CLIENT.value)}
                listed = client.get("/api/v1/instances", headers=owner_headers)
                self.assertEqual(listed.status_code, 200)
                self.assertEqual(len(listed.json()), 3)
                self.assertTrue(all(i["status"] == "running" for i in listed.json()))
                self.assertEqual(client.post("/api/v1/subscriptions/change-plan", headers=owner_headers,
                                             json={"target_plan_id": free_id}).status_code, 400)
        finally:
            app.dependency_overrides.pop(get_db, None)
        # A paid transaction makes the adoption route inapplicable; never backfill fake data.
        with connection.begin():
            session_settings(connection)
            with self.assertRaises(ReconciliationBlocked):
                validate_before(connection, capture(connection))
        with Session(engine) as db:
            persisted_audit = db.get(AdminAuditLog, audit_id)
            self.assertIsNotNone(persisted_audit)
            db.execute(sa.delete(Instance).where(Instance.id == 14))
            db.commit()
            db.expire(persisted_audit)
            self.assertIsNone(persisted_audit.target_instance_id)


if __name__ == "__main__":
    unittest.main()
