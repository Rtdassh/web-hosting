"""Offline migration contracts. No PostgreSQL or Docker connection is permitted."""
import ast
import importlib.util
from io import StringIO
from pathlib import Path
import unittest
from unittest.mock import patch, MagicMock

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory

from app.core.database import Base
import app.models  # noqa: F401
from app.seed import seed_db
from app.core.migration_config import migration_url
from app.core.schema_profiles import metadata_for_profile
from app.core.schema_profiles_v1 import metadata_for_profile as metadata_for_profile_v1
from app.core.schema_profiles_v2 import (
    apply_profile as apply_profile_v2,
    metadata_for_profile as metadata_for_profile_v2,
)
from app.core.schema_profiles_v3 import (
    apply_profile as apply_profile_v3,
)
from app.core.schema_profiles_v4 import (
    metadata_for_profile as metadata_for_profile_v4,
)

BACKEND = Path(__file__).resolve().parents[1]
VERSIONS = BACKEND / "alembic" / "versions"
CORE = {"users", "plans", "subscriptions", "instances", "port_allocations",
        "instance_status_history", "payment_transactions"}
NEW = {"invoices", "admin_audit_logs", "password_reset_tokens"}


def revision_module(filename):
    spec = importlib.util.spec_from_file_location(filename[:-3], VERSIONS / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def frozen_metadata():
    metadata = sa.MetaData()

    class Recorder:
        def create_table(self, name, *columns, **kwargs):
            return sa.Table(name, metadata, *columns, **kwargs)

        def create_index(self, name, table, columns, **kwargs):
            sa.Index(name, *(metadata.tables[table].c[c] for c in columns), **kwargs)

    for filename in ("0001_existing_core.py", "0002_billing_admin_recovery.py"):
        module = revision_module(filename)
        with patch.object(module, "op", Recorder()), patch("alembic.context.is_offline_mode", return_value=True):
            module.upgrade()
    return metadata


def signature(table):
    dialect = postgresql.dialect()
    columns = [(c.name, c.type.compile(dialect=dialect), c.nullable, c.primary_key,
                tuple(c.type.enums) if isinstance(c.type, sa.Enum) else (),
                c.type.name if isinstance(c.type, sa.Enum) else None)
               for c in table.columns]
    foreign_keys = sorted((fk.parent.name, fk.target_fullname, fk.ondelete or "") for fk in table.foreign_keys)
    unique = sorted(tuple(c.name for c in k.columns) for k in table.constraints if isinstance(k, sa.UniqueConstraint))
    indexes = sorted((i.name, tuple(c.name for c in i.columns), bool(i.unique)) for i in table.indexes)
    return columns, foreign_keys, unique, indexes


class MigrationContractTests(unittest.TestCase):
    def test_fresh_history_adds_v2_after_frozen_revisions(self):
        scripts = ScriptDirectory.from_config(Config(str(BACKEND / "alembic.ini")))
        self.assertEqual(scripts.get_heads(), ["0005_financial_history"])
        self.assertEqual(
            scripts.get_revision("0004_subscription_period").down_revision,
            "0003_admin_audit_set_null",
        )
        self.assertEqual(
            scripts.get_revision("0005_financial_history").down_revision,
            "0004_subscription_period",
        )

    def test_no_implicit_project_connection_and_invalid_url_is_redacted(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(RuntimeError):
                migration_url()
        with patch.dict("os.environ", {"CODROP_MIGRATION_DATABASE_URL": "sensitive-invalid-value"}):
            with self.assertRaises(RuntimeError) as error:
                migration_url()
            self.assertNotIn("sensitive", str(error.exception))

    def test_frozen_revisions_match_explicit_fresh_profile(self):
        frozen = frozen_metadata()
        fresh = metadata_for_profile_v1(frozen, "fresh")
        self.assertEqual(set(frozen.tables), CORE | NEW)
        self.assertEqual(set(Base.metadata.tables), CORE | NEW)
        for name in frozen.tables:
            with self.subTest(table=name):
                self.assertEqual(signature(frozen.tables[name]), signature(fresh.tables[name]))
        self.assertEqual(len(list(frozen.sorted_tables)), 10)  # resolve every FK

    def test_offline_sql_requires_no_connection_and_never_removes_tables(self):
        output = StringIO()
        cfg = Config(str(BACKEND / "alembic.ini"), output_buffer=output)
        with patch("sqlalchemy.engine.Engine.connect", side_effect=AssertionError("No database allowed")):
            command.upgrade(cfg, "head", sql=True)
        sql = output.getvalue()
        for name in CORE | NEW:
            self.assertIn("CREATE TABLE " + name + " (", sql)
        self.assertIn("DROP CONSTRAINT admin_audit_logs_target_instance_id_fkey", sql)
        self.assertIn("ON DELETE SET NULL", sql)
        self.assertNotIn("DROP TABLE", sql)
        self.assertNotRegex(sql, r"(?im)^\s*TRUNCATE\s+(?:TABLE\s+)?")
        self.assertNotIn("asignacion_puertos", sql)

    def test_post_baseline_revisions_only_create_recovery_tables_and_change_audit_fk(self):
        output = StringIO()
        command.upgrade(Config(str(BACKEND / "alembic.ini"), output_buffer=output),
                        "0001_existing_core:head", sql=True)
        sql = output.getvalue()
        for name in NEW:
            self.assertIn("CREATE TABLE " + name + " (", sql)
        for name in CORE:
            self.assertNotIn("CREATE TABLE " + name + " (", sql)

    def test_v2_contract_changes_only_the_audit_instance_fk(self):
        for profile in ("fresh", "debian"):
            v1 = metadata_for_profile_v1(frozen_metadata(), profile)
            v2 = sa.MetaData()
            for table in v1.sorted_tables:
                table.to_metadata(v2)
            apply_profile_v2(v2, profile)
            audit_fks = [
                fk for fk in v2.tables["admin_audit_logs"].foreign_keys
                if fk.parent.name == "target_instance_id"
            ]
            self.assertEqual(len(audit_fks), 1)
            self.assertEqual(audit_fks[0].target_fullname, "instances.id")
            self.assertEqual(audit_fks[0].ondelete, "SET NULL")
            self.assertEqual(
                audit_fks[0].constraint.name,
                "fk_admin_audit_logs_target_instance_id_instances",
            )
            for name in set(v1.tables) - {"admin_audit_logs"}:
                self.assertEqual(signature(v1.tables[name]), signature(v2.tables[name]))
            old_columns = signature(v1.tables["admin_audit_logs"])[0]
            new_columns = signature(v2.tables["admin_audit_logs"])[0]
            self.assertEqual(old_columns, new_columns)
            old_signature = signature(v1.tables["admin_audit_logs"])
            new_signature = signature(v2.tables["admin_audit_logs"])
            self.assertEqual(
                [fk for fk in old_signature[1] if fk[0] != "target_instance_id"],
                [fk for fk in new_signature[1] if fk[0] != "target_instance_id"],
            )
            self.assertEqual(old_signature[2:], new_signature[2:])

    def test_v3_contract_maps_legacy_plan_and_subscription_fields(self):
        for profile in ("fresh", "debian"):
            v2 = metadata_for_profile_v2(frozen_metadata(), profile)
            v2_audit_fk = next(
                fk
                for fk in v2.tables["admin_audit_logs"].foreign_keys
                if fk.parent.name == "target_instance_id"
            )
            self.assertEqual(v2_audit_fk.ondelete, "SET NULL")

            v3 = sa.MetaData()
            for table in v2.sorted_tables:
                table.to_metadata(v3)
            apply_profile_v3(v3, profile)
            v3_audit_fk = next(
                fk
                for fk in v3.tables["admin_audit_logs"].foreign_keys
                if fk.parent.name == "target_instance_id"
            )
            self.assertEqual(v3_audit_fk.ondelete, "SET NULL")
            plans = v3.tables["plans"]
            subscriptions = v3.tables["subscriptions"]
            invoices = v3.tables["invoices"]
            self.assertEqual(
                plans.c.billing_period.type.compile(dialect=postgresql.dialect()),
                "VARCHAR(20)",
            )
            self.assertFalse(plans.c.billing_period.nullable)
            self.assertFalse(plans.c.is_active.nullable)
            self.assertEqual(
                plans.c.created_at.type.compile(dialect=postgresql.dialect()),
                "TIMESTAMP WITH TIME ZONE",
            )
            self.assertEqual(plans.c.created_at.nullable, profile == "fresh")
            self.assertEqual(
                subscriptions.c.start_date.type.compile(dialect=postgresql.dialect()),
                "TIMESTAMP WITH TIME ZONE",
            )
            self.assertEqual(subscriptions.c.start_date.nullable, profile == "fresh")
            self.assertEqual(
                subscriptions.c.end_date.type.compile(dialect=postgresql.dialect()),
                "TIMESTAMP WITH TIME ZONE",
            )
            self.assertTrue(subscriptions.c.end_date.nullable)
            self.assertFalse(subscriptions.c.auto_renew.nullable)
            self.assertEqual(
                subscriptions.c.current_period_start.type.compile(dialect=postgresql.dialect()),
                "TIMESTAMP WITH TIME ZONE",
            )
            self.assertEqual(
                subscriptions.c.current_period_end.type.compile(dialect=postgresql.dialect()),
                "TIMESTAMP WITH TIME ZONE",
            )
            self.assertTrue(subscriptions.c.current_period_start.nullable)
            self.assertTrue(subscriptions.c.current_period_end.nullable)
            self.assertEqual(invoices.c.pdf_metadata.type.compile(dialect=postgresql.dialect()), "JSONB")
            self.assertTrue(invoices.c.pdf_metadata.nullable)
            for table_name in set(v2.tables) - {"plans", "subscriptions", "invoices"}:
                self.assertEqual(signature(v2.tables[table_name]), signature(v3.tables[table_name]))
            old_plan_columns = signature(v2.tables["plans"])[0]
            new_plan_columns = signature(v3.tables["plans"])[0]
            self.assertEqual(old_plan_columns, new_plan_columns[:len(old_plan_columns)])
            self.assertEqual(signature(v2.tables["plans"])[1:], signature(v3.tables["plans"])[1:])
            for table_name in ("subscriptions", "invoices"):
                old_signature = signature(v2.tables[table_name])
                new_signature = signature(v3.tables[table_name])
                self.assertEqual(old_signature[0], new_signature[0][:len(old_signature[0])])
                self.assertEqual(old_signature[1:], new_signature[1:])

    def test_v3_offline_upgrade_is_additive(self):
        output = StringIO()
        command.upgrade(
            Config(str(BACKEND / "alembic.ini"), output_buffer=output),
            "head",
            sql=True,
        )
        sql = output.getvalue()
        self.assertIn("ADD COLUMN current_period_start TIMESTAMP WITH TIME ZONE", sql)
        self.assertIn("ADD COLUMN current_period_end TIMESTAMP WITH TIME ZONE", sql)
        self.assertIn("ADD COLUMN pdf_metadata JSONB", sql)
        self.assertIn("ADD COLUMN billing_period VARCHAR(20)", sql)
        self.assertIn("ADD COLUMN is_active BOOLEAN", sql)
        self.assertIn("ADD COLUMN start_date TIMESTAMP WITH TIME ZONE", sql)
        self.assertIn("ADD COLUMN auto_renew BOOLEAN", sql)
        self.assertNotIn("DROP COLUMN", sql)
        self.assertNotIn("DROP TABLE", sql)
        self.assertNotIn("DROP SEQUENCE", sql)

    def test_v4_contract_adds_nullable_snapshot_and_restricts_financial_user_fks(self):
        for profile in ("fresh", "debian"):
            v4 = metadata_for_profile_v4(frozen_metadata(), profile)

            snapshot = v4.tables["payment_transactions"].c.plan_name_snapshot
            self.assertEqual(snapshot.type.compile(dialect=postgresql.dialect()), "VARCHAR(50)")
            self.assertTrue(snapshot.nullable)
            for table_name, expected_name in (
                ("payment_transactions", "fk_payment_transactions_user_id_users"),
                ("invoices", "fk_invoices_user_id_users"),
            ):
                user_fk = next(
                    fk for fk in v4.tables[table_name].foreign_keys
                    if fk.parent.name == "user_id"
                )
                self.assertEqual(user_fk.ondelete, "RESTRICT")
                self.assertEqual(user_fk.constraint.name, expected_name)

    def test_v4_offline_upgrade_is_additive_and_uses_immutable_triggers(self):
        output = StringIO()
        command.upgrade(
            Config(str(BACKEND / "alembic.ini"), output_buffer=output),
            "head",
            sql=True,
        )
        sql = output.getvalue()
        self.assertIn("ADD COLUMN plan_name_snapshot VARCHAR(50)", sql)
        self.assertIn("ON DELETE RESTRICT", sql)
        self.assertIn("BEFORE UPDATE OR DELETE", sql)
        self.assertIn("BEFORE TRUNCATE", sql)
        self.assertIn("Financial history is immutable.", sql)
        self.assertNotIn("DROP COLUMN", sql)
        self.assertNotIn("DROP TABLE", sql)
        revision = revision_module("0005_financial_history_immutable.py")
        with self.assertRaises(RuntimeError):
            revision.downgrade()

    def test_fk_migration_rejects_unexpected_existing_actions(self):
        from alembic_fk import find_existing_audit_instance_fk

        inspector = MagicMock()
        inspector.get_columns.return_value = [
            {"name": "target_instance_id", "nullable": True}
        ]
        inspector.get_foreign_keys.return_value = [{
            "name": "existing_audit_instance_fk",
            "constrained_columns": ["target_instance_id"],
            "referred_table": "instances",
            "referred_schema": "public",
            "referred_columns": ["id"],
            "options": {},
        }]
        with patch("alembic_fk.sa.inspect", return_value=inspector):
            self.assertEqual(
                find_existing_audit_instance_fk(object()),
                "existing_audit_instance_fk",
            )
            inspector.get_foreign_keys.return_value[0]["options"]["ondelete"] = "CASCADE"
            with self.assertRaisesRegex(RuntimeError, "differs"):
                find_existing_audit_instance_fk(object())

    def test_downgrades_are_explicitly_blocked(self):
        for name in ("0001_existing_core.py", "0002_billing_admin_recovery.py",
                     "0003_admin_audit_set_null.py", "0004_subscription_period_invoice_metadata.py",
                     "0005_financial_history_immutable.py"):
            with self.assertRaises(RuntimeError):
                revision_module(name).downgrade()

    def test_startup_does_not_create_or_seed_schema(self):
        tree = ast.parse((BACKEND / "app" / "main.py").read_text(encoding="utf-8-sig"))
        forbidden = {"create_all", "seed_db"}
        self.assertFalse(any(isinstance(n, ast.Call) and
                             ((isinstance(n.func, ast.Attribute) and n.func.attr in forbidden) or
                              (isinstance(n.func, ast.Name) and n.func.id in forbidden))
                             for n in ast.walk(tree)))

    def test_seed_failure_rolls_back_and_propagates_without_values(self):
        db = MagicMock()
        db.execute.side_effect = RuntimeError("sensitive driver information")
        with self.assertRaises(RuntimeError) as error:
            seed_db(db)
        self.assertNotIn("sensitive", str(error.exception))
        db.rollback.assert_called_once()
        db.commit.assert_not_called()

    def test_baseline_rejects_unversioned_nonempty_schema(self):
        module = revision_module("0001_existing_core.py")
        inspector = MagicMock()
        inspector.get_table_names.return_value = ["users", "asignacion_puertos"]
        with patch.object(module, "op") as operation, \
             patch("alembic.context.is_offline_mode", return_value=False), \
             patch.object(module.sa, "inspect", return_value=inspector):
            with self.assertRaises(RuntimeError):
                module.upgrade()
            operation.create_table.assert_not_called()


if __name__ == "__main__":
    unittest.main()
