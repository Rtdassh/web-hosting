"""Explicit profiles must preserve behavior without weakening unknown differences."""
from datetime import datetime, timezone, timedelta
import unittest
from sqlalchemy.dialects.postgresql import dialect

from app.core.database import Base
import app.models  # noqa: F401
from app.models import (
    AdminAuditLog,
    Invoice,
    PaymentTransaction,
    Plan,
    Subscription,
    User,
    UserRole,
    Instance,
    InstanceStatus,
)
from app.core.model_types import UTCDateTime
from app.core.schema_profiles import metadata_for_profile
from app.core.schema_profiles_v4 import apply_profile as apply_profile_v4
from alembic_debian.contract import expected_metadata
from tests.test_migrations import signature


class SchemaProfileTests(unittest.TestCase):
    def test_both_explicit_profiles_match_frozen_history_plus_declared_variations(self):
        for profile in ("fresh", "debian"):
            runtime = metadata_for_profile(Base.metadata, profile)
            expected = apply_profile_v4(expected_metadata(profile), profile)
            self.assertEqual(set(runtime.tables), set(expected.tables))
            self.assertEqual(
                runtime.tables["plans"].c.created_at.nullable,
                profile == "fresh",
            )
            self.assertEqual(
                runtime.tables["subscriptions"].c.start_date.nullable,
                profile == "fresh",
            )
            for name in expected.tables:
                with self.subTest(profile=profile, table=name):
                    self.assertEqual(signature(runtime.tables[name]), signature(expected.tables[name]))
            audit_fk = next(iter(runtime.tables["admin_audit_logs"].c.target_instance_id.foreign_keys))
            self.assertEqual(audit_fk.ondelete, "SET NULL")
            self.assertEqual(
                audit_fk.constraint.name,
                "fk_admin_audit_logs_target_instance_id_instances",
            )
        self.assertFalse(User.__table__.c.role.type.native_enum)
        self.assertFalse(Plan.__table__.c.billing_period.nullable)
        self.assertFalse(Plan.__table__.c.is_active.nullable)
        self.assertEqual(
            Plan.__table__.c.created_at.type.compile(dialect=dialect()),
            "TIMESTAMP WITH TIME ZONE",
        )
        self.assertEqual(next(iter(Instance.__table__.c.user_id.foreign_keys)).ondelete, "CASCADE")
        self.assertEqual(
            next(iter(AdminAuditLog.__table__.c.target_instance_id.foreign_keys)).ondelete,
            "SET NULL",
        )
        self.assertEqual(User.__table__.c.created_at.type.compile(dialect=dialect()), "TIMESTAMP WITH TIME ZONE")
        self.assertTrue(Subscription.__table__.c.current_period_start.nullable)
        self.assertTrue(Subscription.__table__.c.current_period_end.nullable)
        self.assertTrue(Subscription.__table__.c.start_date.nullable)
        self.assertTrue(Subscription.__table__.c.end_date.nullable)
        self.assertFalse(Subscription.__table__.c.auto_renew.nullable)
        self.assertTrue(Invoice.__table__.c.pdf_metadata.nullable)
        self.assertEqual(
            Invoice.__table__.c.pdf_metadata.type.dialect_impl(dialect()).compile(dialect=dialect()),
            "JSONB",
        )
        self.assertTrue(PaymentTransaction.__table__.c.plan_name_snapshot.nullable)
        self.assertEqual(PaymentTransaction.__table__.c.plan_name_snapshot.type.length, 50)
        for table_name in ("payment_transactions", "invoices"):
            user_fk = next(
                fk
                for fk in Base.metadata.tables[table_name].c.user_id.foreign_keys
                if fk.target_fullname == "users.id"
            )
            self.assertEqual(user_fk.ondelete, "RESTRICT")

    def test_member_names_are_preserved_and_api_values_still_lowercase(self):
        for column, member in ((User.__table__.c.role, UserRole.CLIENT),
                               (Instance.__table__.c.status, InstanceStatus.RUNNING)):
            self.assertEqual(column.type.compile(dialect=dialect()), "VARCHAR(50)")
            self.assertEqual(column.type.bind_processor(dialect())(member), member.name)
            self.assertEqual(column.type.result_processor(dialect(), None)(member.name), member)
            self.assertEqual(member.value, member.name.lower())
            with self.assertRaises(LookupError):
                column.type.bind_processor(dialect())("unrecognized")

    def test_utc_mapping_normalizes_instants_without_accepting_ambiguous_writes(self):
        typ = UTCDateTime()
        offset = datetime(2026, 10, 24, 9, tzinfo=timezone(timedelta(hours=-6)))
        expected = datetime(2026, 10, 24, 15, tzinfo=timezone.utc)
        self.assertEqual(typ.process_bind_param(offset, dialect()), expected)
        self.assertEqual(typ.process_result_value(offset, dialect()), expected)
        self.assertEqual(typ.process_result_value(expected.replace(tzinfo=None), dialect()), expected)
        with self.assertRaises(ValueError):
            typ.process_bind_param(expected.replace(tzinfo=None), dialect())
        self.assertIsNone(typ.process_bind_param(None, dialect()))
        self.assertIsNone(typ.process_result_value(None, dialect()))


if __name__ == "__main__":
    unittest.main()
