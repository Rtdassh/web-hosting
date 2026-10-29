"""Opt-in PostgreSQL tests. Only fixed local disposable databases are accepted.

No database is cleared. Each test refuses to run unless the selected database is empty.
"""
import os
import hashlib
import unittest
from unittest.mock import patch
from datetime import timezone

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session
from sqlalchemy.exc import DBAPIError, IntegrityError, DataError
from fastapi import HTTPException
from alembic import command
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.autogenerate import compare_metadata

from app.core.database import Base
from app.models import (
    User,
    Plan,
    Subscription,
    Instance,
    PortAllocation,
    UserRole,
    InstanceStatus,
    TransactionStatus,
    Invoice,
    PaymentTransaction,
)
from app.seed import seed_db
from app.core.schema_profiles import metadata_for_profile
from tests.test_migrations import BACKEND, CORE, frozen_metadata

FRESH_DATABASES = frozenset({
    "codrop_migration_new",
    "codrop_v3_fresh_test",
    "codrop_v3_fresh_retry",
    "codrop_v4_fresh_test",
    "codrop_v4_fresh_retry2",
})

LEGACY_DATABASES = frozenset({
    "codrop_migration_legacy",
    "codrop_v3_legacy_test",
    "codrop_v3_legacy_retry",
    "codrop_v4_legacy_test",
})

DEBIAN_DATABASES = frozenset({
    "codrop_migration_debian",
    "codrop_v3_debian_test",
    "codrop_v3_debian_retry",
    "codrop_v3_debian_final",
    "codrop_v3_debian_check2",
    "codrop_v3_debian_verify3",
    "codrop_v4_debian_test",
    "codrop_v4_debian_retry2",
})


def _configured_test_database(test, variable, default, allowed_names):
    database = os.environ.get(variable, default)
    test.assertIn(database, allowed_names, f"{variable} must name an approved test database.")
    return database


def _assert_test_postgres_environment(test, connection, expected_database):
    url = connection.engine.url
    test.assertEqual(url.host, "127.0.0.1")
    test.assertEqual(url.port, 55432)
    test.assertEqual(url.username, "codrop_migration_test")
    test.assertEqual(url.database, expected_database)
    database, username = connection.execute(sa.text(
        "SELECT current_database(), current_user"
    )).one()
    test.assertEqual(database, expected_database)
    test.assertEqual(username, "codrop_migration_test")


def _assert_empty_test_database(test, connection):
    inspector = sa.inspect(connection)
    user_schemas = {
        schema for schema in inspector.get_schema_names()
        if schema != "information_schema" and not schema.startswith(("pg_", "pg_toast"))
    }
    test.assertEqual(user_schemas, {"public"}, "Test database must contain only the default public schema.")
    public_objects = (
        inspector.get_table_names(schema="public")
        + inspector.get_view_names(schema="public")
        + inspector.get_materialized_view_names(schema="public")
        + inspector.get_sequence_names(schema="public")
    )
    test.assertEqual(public_objects, [], "Test database must be empty; no cleanup is performed.")


def _assert_test_postgres_major(test, connection):
    major = connection.dialect.server_version_info[0]
    test.assertIn(major, (16, 17), "Integration tests are supported on PostgreSQL 16 and 17.")
    expected = os.environ.get("CODROP_TEST_POSTGRES_VERSION")
    if expected:
        test.assertEqual(major, int(expected))


class PostgreSQLTestConfigurationTests(unittest.TestCase):
    def test_database_variables_accept_only_their_approved_names(self):
        variables = (
            (
                "CODROP_TEST_DB_FRESH",
                "codrop_migration_new",
                FRESH_DATABASES,
                {"codrop_v3_fresh_test", "codrop_v3_fresh_retry", "codrop_v4_fresh_test", "codrop_v4_fresh_retry2"},
            ),
            (
                "CODROP_TEST_DB_LEGACY",
                "codrop_migration_legacy",
                LEGACY_DATABASES,
                {"codrop_v3_legacy_test", "codrop_v3_legacy_retry", "codrop_v4_legacy_test"},
            ),
            (
                "CODROP_TEST_DB_DEBIAN",
                "codrop_migration_debian",
                DEBIAN_DATABASES,
                {
                    "codrop_v3_debian_test",
                    "codrop_v3_debian_retry",
                    "codrop_v3_debian_final",
                    "codrop_v3_debian_check2",
                    "codrop_v3_debian_verify3",
                    "codrop_v4_debian_test",
                    "codrop_v4_debian_retry2",
                },
            ),
        )
        self.assertEqual(
            FRESH_DATABASES | LEGACY_DATABASES | DEBIAN_DATABASES,
            frozenset({
                "codrop_migration_new",
                "codrop_migration_legacy",
                "codrop_migration_debian",
                "codrop_v3_fresh_test",
                "codrop_v3_legacy_test",
                "codrop_v3_debian_test",
                "codrop_v3_fresh_retry",
                "codrop_v3_legacy_retry",
                "codrop_v3_debian_retry",
                "codrop_v3_debian_final",
                "codrop_v3_debian_check2",
                "codrop_v3_debian_verify3",
                "codrop_v4_fresh_test",
                "codrop_v4_fresh_retry2",
                "codrop_v4_legacy_test",
                "codrop_v4_debian_test",
                "codrop_v4_debian_retry2",
            }),
        )
        for variable, default, allowed, overrides in variables:
            with self.subTest(variable=variable):
                with patch.dict(os.environ, {}, clear=True):
                    self.assertEqual(_configured_test_database(self, variable, default, allowed), default)
                for override in overrides:
                    with patch.dict(os.environ, {variable: override}, clear=True):
                        self.assertEqual(
                            _configured_test_database(self, variable, default, allowed),
                            override,
                        )
                with patch.dict(os.environ, {variable: "unapproved_database"}, clear=True):
                    with self.assertRaises(AssertionError):
                        _configured_test_database(self, variable, default, allowed)


def config(connection):
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.attributes["connection"] = connection
    return cfg


def assert_schema(test, connection, expected):
    names = set(expected.tables)
    def include_object(obj, name, type_, reflected, compare_to):
        return type_ != "table" or name in names
    ctx = MigrationContext.configure(connection, opts={"include_object": include_object, "compare_type": True})
    test.assertEqual(compare_metadata(ctx, expected), [])
    enums = {e["name"]: e["labels"] for e in sa.inspect(connection).get_enums(schema="public")}
    for table in expected.tables.values():
        for column in table.columns:
            if isinstance(column.type, sa.Enum) and column.type.native_enum:
                test.assertEqual(enums[column.type.name], column.type.enums)
    connection.rollback()  # end reflection's read transaction before Alembic


@unittest.skipUnless(os.environ.get("CODROP_RUN_MIGRATION_TESTS") == "1",
                     "Requires explicit isolated PostgreSQL test environment")
class PostgreSQLMigrationTests(unittest.TestCase):
    def connect_empty(self, lineage):
        if lineage == "fresh":
            name = _configured_test_database(
                self, "CODROP_TEST_DB_FRESH", "codrop_migration_new", FRESH_DATABASES
            )
        elif lineage == "legacy":
            name = _configured_test_database(
                self, "CODROP_TEST_DB_LEGACY", "codrop_migration_legacy", LEGACY_DATABASES
            )
        else:
            self.fail("Unknown PostgreSQL migration test lineage.")
        password = os.environ.get("CODROP_TEST_POSTGRES_PASSWORD")
        self.assertTrue(password, "Set the dedicated test password")
        engine = sa.create_engine(URL.create(
            "postgresql+psycopg2", username="codrop_migration_test", password=password,
            host="127.0.0.1", port=55432, database=name,
        ), hide_parameters=True, connect_args={"options": "-c timezone=UTC"})
        self.addCleanup(engine.dispose)
        connection = engine.connect()
        self.addCleanup(connection.close)
        _assert_test_postgres_environment(self, connection, name)
        _assert_test_postgres_major(self, connection)
        _assert_empty_test_database(self, connection)
        connection.rollback()
        return engine, connection

    def test_new_installation_constraints_seed_and_backend(self):
        engine, connection = self.connect_empty("fresh")
        command.upgrade(config(connection), "0002_billing_admin_recovery")
        from app.models import AdminAuditLog
        with Session(engine) as db:
            user = User(
                email="historical-audit@example.com",
                hashed_password="synthetic",
                full_name="Historical audit",
                role=UserRole.CLIENT,
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            db.flush()
            instance = Instance(
                uuid="historical-audit-instance",
                name="Historical audit instance",
                user_id=user.id,
                assigned_port=30998,
                public_url="http://localhost:30998",
                status=InstanceStatus.RUNNING,
                storage_path="synthetic-unused",
            )
            db.add(instance)
            db.flush()
            audit = AdminAuditLog(
                admin_user_id=user.id,
                target_instance_id=instance.id,
                action="force_destroy",
                details="Created before V2 FK migration",
            )
            db.add(audit)
            plan_id = db.execute(sa.text("""
                INSERT INTO plans (name, description, price, max_instances, max_ram_mb, cpu_quota)
                VALUES ('Developer', 'Historical plan', 1.25, 1, 128, 0.25)
                RETURNING id
            """)).scalar_one()
            historical_transaction_id = db.execute(sa.text("""
                INSERT INTO payment_transactions (
                    user_id, plan_id, amount, card_last_four, card_brand, auth_code, status, created_at
                ) VALUES (
                    :user_id, :plan_id, 1.25, '4242', 'Visa', 'AUTH-HISTORY',
                    'APPROVED', CURRENT_TIMESTAMP
                )
                RETURNING id
            """), {"user_id": user.id, "plan_id": plan_id}).scalar_one()
            db.execute(sa.text("""
                INSERT INTO invoices (
                    transaction_id, user_id, invoice_number, amount, tax, status, created_at
                ) VALUES (
                    :transaction_id, :user_id, 'INV-HISTORICAL', 1.25, 0.20,
                    'paid', CURRENT_TIMESTAMP
                )
            """), {"transaction_id": historical_transaction_id, "user_id": user.id})
            db.execute(sa.text("""
                INSERT INTO subscriptions (user_id, plan_id, status, created_at)
                VALUES (:user_id, :plan_id, 'active', CURRENT_TIMESTAMP)
            """), {"user_id": user.id, "plan_id": plan_id})
            db.commit()
            audit_id = audit.id
            instance_id = instance.id
            historical_invoice_transaction_id = historical_transaction_id
            historical_user_id = user.id
        command.upgrade(config(connection), "head")
        assert_schema(self, connection, metadata_for_profile(Base.metadata, "fresh"))
        command.check(config(connection))
        with Session(engine) as db:
            historical_subscription = db.query(Subscription).filter_by(user_id=historical_user_id).one()
            historical_invoice = db.query(Invoice).filter_by(
                transaction_id=historical_invoice_transaction_id
            ).one()
            self.assertIsNone(historical_subscription.current_period_start)
            self.assertIsNone(historical_subscription.current_period_end)
            self.assertIsNone(historical_subscription.start_date)
            self.assertFalse(historical_subscription.auto_renew)
            self.assertIsNone(historical_invoice.pdf_metadata)
            historical_transaction = db.get(PaymentTransaction, historical_invoice_transaction_id)
            self.assertIsNone(historical_transaction.plan_name_snapshot)
            historical_plan = db.query(Plan).filter_by(name="Developer").one()
            self.assertEqual(historical_plan.billing_period, "monthly")
            self.assertTrue(historical_plan.is_active)
            self.assertIsNone(historical_plan.created_at)
            persisted_audit = db.get(AdminAuditLog, audit_id)
            self.assertIsNotNone(persisted_audit)
            self.assertEqual(persisted_audit.target_instance_id, instance_id)
            db.execute(sa.delete(Instance).where(Instance.id == instance_id))
            db.commit()
            db.expire(persisted_audit)
            self.assertIsNone(persisted_audit.target_instance_id)
        with Session(engine) as db:
            seed_db(db)
            existing_plan = db.query(Plan).filter_by(name="Developer").one()
            existing_plan.price = 12.34
            db.commit()
            seed_db(db)
            self.assertEqual(db.query(Plan).count(), 3)
            self.assertEqual(db.query(Plan).filter_by(name="Developer").one().price, 12.34)
            self.assertEqual(db.query(Plan).filter_by(name="Developer").one().billing_period, "monthly")
            self.assertTrue(db.query(Plan).filter_by(name="Developer").one().is_active)
            self.assertEqual(db.query(PortAllocation).count(), 100)
            self.assertEqual(db.query(User).count(), 1)

        # Import the HTTP app under a Docker guard; startup must not alter schema.
        import docker
        from docker.errors import DockerException
        with patch.object(docker, "from_env", side_effect=DockerException("Test isolation")):
            from app.main import app
        from app.core.database import get_db
        from fastapi.testclient import TestClient
        def test_db():
            with Session(engine) as db:
                yield db
        app.dependency_overrides[get_db] = test_db
        try:
            with TestClient(app) as client:
                payload = {"email": "migration@example.com", "password": "LocalTest123!", "full_name": "Migration Test"}
                self.assertEqual(client.post("/api/v1/auth/register", json=payload).status_code, 201)
                with Session(engine) as db:
                    registered_user = db.query(User).filter_by(email=payload["email"]).one()
                    registered_subscription = db.query(Subscription).filter_by(
                        user_id=registered_user.id,
                        status="active",
                    ).one()
                    self.assertEqual(registered_subscription.plan.name, "Free")
                    self.assertIsNotNone(registered_subscription.start_date)
                    self.assertFalse(registered_subscription.auto_renew)
                login = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
                self.assertEqual(login.status_code, 200)
                headers = {"Authorization": "Bearer " + login.json()["access_token"]}
                self.assertEqual(client.get("/api/v1/auth/me", headers=headers).status_code, 200)
                self.assertEqual(client.get("/api/v1/instances", headers=headers).json(), [])
                self.assertEqual(client.get("/api/v1/admin/dashboard", headers=headers).status_code, 403)
                plans = client.get("/api/v1/plans").json()
                plan_id = next(plan["id"] for plan in plans if plan["name"] == "Developer")
                checkout = client.post("/api/v1/billing/checkout", headers=headers, json={
                    "plan_id": plan_id, "card_holder": "Migration Test",
                    "card_number": "4111111111111111", "exp_month": 12, "exp_year": 2040, "cvv": "123",
                })
                self.assertEqual(checkout.status_code, 200)
                from app.services.billing_service import _add_calendar_month
                with Session(engine) as db:
                    checkout_subscription = db.query(Subscription).filter_by(
                        user_id=registered_user.id,
                        status="active",
                    ).one()
                    self.assertIsNotNone(checkout_subscription.current_period_start)
                    self.assertEqual(
                        checkout_subscription.current_period_end,
                        _add_calendar_month(checkout_subscription.current_period_start),
                    )
                    self.assertFalse(checkout_subscription.auto_renew)
                self.assertEqual(set(client.get(
                    "/api/v1/billing/invoices", headers=headers
                ).json()[0]), {
                    "id", "invoice_number", "transaction_id", "plan_name", "amount", "tax",
                    "status", "auth_code", "card_last_four", "card_brand", "created_at",
                })
                checkout_transaction_id = checkout.json()["transaction_id"]
                invoice_response = client.get("/api/v1/billing/invoices", headers=headers)
                checkout_invoice = next(
                    item
                    for item in invoice_response.json()
                    if item["transaction_id"] == checkout_transaction_id
                )
                self.assertEqual(checkout_invoice["plan_name"], "Developer")
                from app.schemas.billing_schema import CheckoutRequest
                from app.services.billing_service import billing_service
                with Session(engine) as db:
                    user = db.query(User).filter_by(email=payload["email"]).one()
                    for failure_method in ("flush", "commit"):
                        with patch.object(
                            db,
                            failure_method,
                            side_effect=RuntimeError("Synthetic database failure"),
                        ):
                            with self.assertRaises(HTTPException) as checkout_error:
                                billing_service.process_checkout(
                                    CheckoutRequest(
                                        plan_id=plan_id,
                                        card_holder="Migration Test",
                                        card_number="4111111111111111",
                                        exp_month=12,
                                        exp_year=2040,
                                        cvv="123",
                                    ),
                                    user,
                                    db,
                                )
                        self.assertEqual(checkout_error.exception.status_code, 500)
                        self.assertNotIn(
                            "Synthetic database failure",
                            checkout_error.exception.detail,
                        )
                        db.expire_all()
                        self.assertEqual(db.query(PaymentTransaction).count(), 2)
                        self.assertEqual(db.query(Invoice).count(), 2)
                        self.assertEqual(db.query(Subscription).count(), 2)
                with Session(engine) as db:
                    self.assertEqual(db.query(PaymentTransaction).count(), 2)
                    self.assertEqual(db.query(Invoice).count(), 2)
                    self.assertEqual(db.query(Subscription).count(), 2)
                self.assertEqual(client.post("/api/v1/subscriptions/change-plan", headers=headers,
                                             json={"target_plan_id": plan_id}).status_code, 200)
                self.assertEqual(len(client.get("/api/v1/billing/invoices", headers=headers).json()), 1)
                from app.services.auth_service import auth_service
                captured_tokens = []
                previous_delivery = auth_service.password_reset_delivery

                class TestDelivery:
                    def send_password_reset(self, email, token):
                        captured_tokens.append((email, token))

                auth_service.password_reset_delivery = TestDelivery()
                try:
                    recovery = client.post(
                        "/api/v1/auth/forgot-password",
                        json={"email": payload["email"]},
                    )
                    self.assertEqual(recovery.status_code, 200)
                finally:
                    auth_service.password_reset_delivery = previous_delivery
                self.assertEqual(recovery.json(), {
                    "message": (
                        "La solicitud se recibió. Si la dirección corresponde a una cuenta y el mensaje "
                        "puede entregarse, recibirás instrucciones. Esta respuesta no confirma el envío."
                    )
                })
                self.assertEqual(len(captured_tokens), 1)
                reset_token = captured_tokens[0][1]
                from app.models import PasswordResetToken
                with Session(engine) as db:
                    saved_token = db.query(PasswordResetToken).one()
                    self.assertNotEqual(saved_token.token_hash, reset_token)
                    self.assertEqual(
                        saved_token.token_hash,
                        hashlib.sha256(reset_token.encode("utf-8")).hexdigest(),
                    )
                reset = client.post("/api/v1/auth/reset-password", json={
                    "token": reset_token, "new_password": "ChangedTest123!",
                })
                self.assertEqual(reset.status_code, 200)
                reused = client.post("/api/v1/auth/reset-password", json={
                    "token": reset_token, "new_password": "AnotherTest123!",
                })
                self.assertEqual(reused.status_code, 400)
        finally:
            app.dependency_overrides.pop(get_db, None)
        with Session(engine) as db:
            from app.models import PasswordResetToken
            user = db.query(User).first()
            self.assertEqual(user.created_at.tzinfo, timezone.utc)
            with self.assertRaises(DataError):
                with db.begin_nested():
                    db.add(Plan(name="Too long for frozen fresh profile", description="x" * 300))
                    db.flush()
            db.add(AdminAuditLog(admin_user_id=user.id, action="migration_test", details="Synthetic test"))
            db.commit()
            self.assertEqual(db.query(AdminAuditLog).count(), 2)
            invoice = db.query(Invoice).filter_by(transaction_id=checkout_transaction_id).one()
            with self.assertRaises(IntegrityError):
                with db.begin_nested():
                    db.add(Invoice(transaction_id=invoice.transaction_id, user_id=user.id,
                                   invoice_number="duplicate-transaction-test", amount=1.0, tax=0.0))
                    db.flush()
            token = db.query(PasswordResetToken).one()
            with self.assertRaises(IntegrityError):
                with db.begin_nested():
                    db.add(PasswordResetToken(user_id=user.id, token_hash=token.token_hash,
                                              expires_at=token.expires_at))
                    db.flush()
            with self.assertRaises(IntegrityError):
                with db.begin_nested():
                    db.add(AdminAuditLog(admin_user_id=-1, action="invalid-fk-test"))
                    db.flush()
        with Session(engine) as db:
            financial_user = User(
                email="financial-retention@example.com",
                hashed_password="synthetic",
                full_name="Financial retention",
                role=UserRole.CLIENT,
            )
            db.add(financial_user)
            db.flush()
            financial_transaction = PaymentTransaction(
                user_id=financial_user.id,
                plan_id=plan_id,
                amount=2.50,
                card_last_four="4242",
                card_brand="Visa",
                auth_code="AUTH-IMMUTABLE",
                status=TransactionStatus.APPROVED,
                plan_name_snapshot="Developer",
            )
            db.add(financial_transaction)
            db.flush()
            financial_invoice = Invoice(
                transaction_id=financial_transaction.id,
                user_id=financial_user.id,
                invoice_number="INV-IMMUTABLE",
                amount=2.50,
                tax=0.40,
                status="paid",
            )
            db.add(financial_invoice)
            unlinked_transaction = PaymentTransaction(
                user_id=financial_user.id,
                plan_id=plan_id,
                amount=3.00,
                card_last_four="1234",
                card_brand="Visa",
                auth_code="AUTH-DELETE-GUARD",
                status=TransactionStatus.APPROVED,
                plan_name_snapshot="Developer",
            )
            db.add(unlinked_transaction)
            db.commit()
            financial_user_id = financial_user.id
            transaction_id = financial_transaction.id
            invoice_id = financial_invoice.id
            unlinked_transaction_id = unlinked_transaction.id

            statements = (
                ("UPDATE payment_transactions SET amount = amount + 1 WHERE id = :id", transaction_id),
                ("DELETE FROM payment_transactions WHERE id = :id", unlinked_transaction_id),
                ("TRUNCATE TABLE payment_transactions CASCADE", None),
                ("UPDATE invoices SET amount = amount + 1 WHERE id = :id", invoice_id),
                ("DELETE FROM invoices WHERE id = :id", invoice_id),
                ("TRUNCATE TABLE invoices", None),
            )
            for statement, row_id in statements:
                with self.subTest(statement=statement):
                    with self.assertRaises(DBAPIError):
                        with db.begin_nested():
                            if row_id is None:
                                db.execute(sa.text(statement))
                            else:
                                db.execute(sa.text(statement), {"id": row_id})
            with self.assertRaises(IntegrityError):
                with db.begin_nested():
                    db.execute(sa.delete(User).where(User.id == financial_user_id))
            db.expire_all()
            self.assertIsNotNone(db.get(PaymentTransaction, transaction_id))
            self.assertIsNotNone(db.get(PaymentTransaction, unlinked_transaction_id))
            self.assertIsNotNone(db.get(Invoice, invoice_id))
            self.assertIsNotNone(db.get(User, financial_user_id))
        with engine.connect() as check:
            with self.assertRaises(IntegrityError):
                check.execute(sa.insert(Subscription).values(user_id=-1, plan_id=-1, status="active"))
            check.rollback()

    def test_verified_synthetic_legacy_adoption_preserves_every_row(self):
        engine, connection = self.connect_empty("legacy")
        # Synthetic legacy fixture from frozen revision, NOT a claimed Debian copy.
        core = sa.MetaData()
        for table in frozen_metadata().sorted_tables:
            if table.name in CORE:
                table.to_metadata(core)
        legacy = sa.Table("asignacion_puertos", core,
                          sa.Column("port_number", sa.Integer(), primary_key=True))
        core.create_all(connection)
        connection.commit()
        legacy_plans = core.tables["plans"]
        legacy_port_allocations = core.tables["port_allocations"]

        def seed_v1_legacy(db):
            db.execute(postgresql_insert(legacy_plans).values([
                {
                    "name": "Free",
                    "description": "1 Sitio Web, 128MB RAM, 0.25 vCPU",
                    "price": 0.0,
                    "max_instances": 1,
                    "max_ram_mb": 128,
                    "cpu_quota": 0.25,
                },
                {
                    "name": "Developer",
                    "description": "3 Sitios Web, 256MB RAM, 0.50 vCPU",
                    "price": 9.99,
                    "max_instances": 3,
                    "max_ram_mb": 256,
                    "cpu_quota": 0.50,
                },
                {
                    "name": "Pro",
                    "description": "10 Sitios Web, 512MB RAM, 1.0 vCPU",
                    "price": 24.99,
                    "max_instances": 10,
                    "max_ram_mb": 512,
                    "cpu_quota": 1.0,
                },
            ]).on_conflict_do_nothing(index_elements=["name"]))
            db.execute(postgresql_insert(legacy_port_allocations).values([
                {"port_number": port, "is_allocated": False, "instance_id": None}
                for port in range(30001, 30101)
            ]).on_conflict_do_nothing(index_elements=["port_number"]))
            db.commit()

        with Session(engine) as db:
            seed_v1_legacy(db)
            free_plan_id = db.execute(
                sa.select(legacy_plans.c.id).where(legacy_plans.c.name == "Free")
            ).scalar_one()
            for identifier in range(1, 8):
                db.add(User(id=identifier, email=f"legacy{identifier}@example.com", hashed_password="synthetic-not-a-password",
                            full_name="Synthetic legacy", role=UserRole.CLIENT, is_active=True))
            db.flush()
            for identifier in range(1, 8):
                db.execute(sa.text("""
                    INSERT INTO subscriptions (user_id, plan_id, status, created_at)
                    VALUES (:user_id, :plan_id, 'active', CURRENT_TIMESTAMP)
                """), {"user_id": identifier, "plan_id": free_plan_id})
            for identifier, port in [(14, 30002), (19, 30001), (22, 30003)]:
                db.add(Instance(id=identifier, uuid=f"legacy-{identifier}", name="Synthetic legacy", user_id=1,
                                assigned_port=port, public_url=f"http://localhost:{port}",
                                status=InstanceStatus.RUNNING, storage_path="synthetic-unused"))
            db.flush()
            for identifier, port in [(14, 30002), (19, 30001), (22, 30003)]:
                db.execute(
                    legacy_port_allocations.update()
                    .where(legacy_port_allocations.c.port_number == port)
                    .values(is_allocated=True, instance_id=identifier)
                )
            db.execute(sa.insert(legacy), [{"port_number": p} for p in range(30001, 30101)])
            db.commit()
        def snapshot():
            result = {t.name: [tuple(row) for row in connection.execute(sa.select(t).order_by(*t.primary_key.columns))]
                      for t in core.sorted_tables}
            connection.rollback()
            return result
        before = snapshot()
        with Session(engine) as db:
            seed_v1_legacy(db)
            seed_v1_legacy(db)
        self.assertEqual(snapshot(), before)
        with self.assertRaises(RuntimeError):
            command.upgrade(config(connection), "head")  # refuses unstamped legacy
        self.assertNotIn("alembic_version", sa.inspect(connection).get_table_names())
        connection.rollback()
        assert_schema(self, connection, core)
        # Only this structurally verified synthetic fixture is stamped in the test.
        command.stamp(config(connection), "0001_existing_core")
        command.upgrade(config(connection), "head")
        self.assertEqual(snapshot(), before)
        self.assertEqual(len(before["users"]), 7)
        self.assertEqual(len(before["subscriptions"]), 7)
        self.assertEqual(len(before["instances"]), 3)
        self.assertEqual(len(before["port_allocations"]), 100)
        self.assertEqual(len(before["asignacion_puertos"]), 100)
        with Session(engine) as db:
            seed_db(db)
            plans = db.query(Plan).order_by(Plan.name).all()
            self.assertEqual(len(plans), 3)
            for plan in plans:
                self.assertEqual(plan.billing_period, "monthly")
                self.assertTrue(plan.is_active)
        self.assertEqual(snapshot(), before)
        assert_schema(self, connection, metadata_for_profile(Base.metadata, "fresh"))
        command.check(config(connection))  # unmanaged legacy table must not be proposed for removal


if __name__ == "__main__":
    unittest.main()
