from datetime import datetime, timedelta, timezone
import logging

import pytest
import sqlalchemy as sa
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import Base, get_db
from app.models import (
    Instance,
    InstanceStatus,
    Invoice,
    PaymentTransaction,
    Plan,
    Subscription,
    User,
    UserRole,
)
from app.schemas.billing_schema import CheckoutRequest
from app.services.billing_service import BillingService


VISA = "4111111111111111"
MASTER_CARD = "5425233430109903"
AMEX = "378282246310005"
TEST_CVV = "123"


def _normalize_utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@pytest.mark.parametrize(
    ("card_number", "cvv"),
    [
        (VISA, "123"),
        ("4111 1111 1111 1111", "123"),
        ("4111-1111-1111-1111", "123"),
        (MASTER_CARD, "123"),
        (AMEX, "1234"),
    ],
)
def test_checkout_schema_accepts_supported_card_formats(card_number, cvv):
    request = CheckoutRequest(
        plan_id=1,
        card_holder="Test Customer",
        card_number=card_number,
        exp_month=12,
        exp_year=2040,
        cvv=cvv,
    )

    assert request.card_number.isascii()
    assert request.card_number.isdigit()


@pytest.mark.parametrize(
    ("card_number", "cvv"),
    [
        ("411111111111111X", "123"),
        ("4111/1111/1111/1111", "123"),
        ("411111111111111", "123"),
        ("542523343010990", "123"),
        ("37828224631000", "1234"),
        (VISA, "12A"),
        (VISA, "1234"),
        (AMEX, "123"),
    ],
)
def test_checkout_schema_rejects_invalid_card_and_cvv(card_number, cvv):
    with pytest.raises(ValueError):
        CheckoutRequest(
            plan_id=1,
            card_holder="Test Customer",
            card_number=card_number,
            exp_month=12,
            exp_year=2040,
            cvv=cvv,
        )


def test_luhn_and_brand_checks_reject_invalid_inputs():
    assert BillingService.validate_luhn(VISA)
    assert not BillingService.validate_luhn("4111111111111112")
    assert not BillingService.validate_luhn("٤١١١١١١١١١١١١١١١")
    assert BillingService.detect_card_brand(VISA) == "Visa"
    assert BillingService.detect_card_brand(MASTER_CARD) == "Mastercard"
    assert BillingService.detect_card_brand(AMEX) == "American Express"


@pytest.fixture
def billing_db(tmp_path):
    engine = sa.create_engine(
        sa.engine.URL.create("sqlite", database=str(tmp_path / "billing.sqlite"))
    )
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(
            email="billing-test@example.invalid",
            hashed_password="synthetic-hash",
            full_name="Billing Test",
            role=UserRole.CLIENT,
        )
        plan = Plan(
            name="Billing Test Plan",
            price=9.99,
            max_instances=2,
            max_ram_mb=256,
            cpu_quota=0.5,
        )
        db.add_all([user, plan])
        db.commit()
        user_id, plan_id = user.id, plan.id
    try:
        yield engine, user_id, plan_id
    finally:
        engine.dispose()


def checkout_request(plan_id, *, exp_month=12, exp_year=2040):
    return CheckoutRequest(
        plan_id=plan_id,
        card_holder="Test Customer",
        card_number=VISA,
        exp_month=exp_month,
        exp_year=exp_year,
        cvv=TEST_CVV,
    )


def test_expired_card_is_rejected_without_persisting(billing_db):
    engine, user_id, plan_id = billing_db
    now = datetime.now(timezone.utc)
    previous_month = now.replace(day=1) - timedelta(days=1)

    with Session(engine) as db:
        user = db.get(User, user_id)
        with pytest.raises(HTTPException) as error:
            BillingService().process_checkout(
                checkout_request(plan_id, exp_month=previous_month.month, exp_year=previous_month.year),
                user,
                db,
            )
    assert error.value.status_code == 400
    with Session(engine) as db:
        assert db.query(Plan).count() == 1
        assert db.query(PaymentTransaction).count() == 0
        assert db.query(Invoice).count() == 0
        assert db.query(Subscription).count() == 0


def test_successful_checkout_persists_transaction_invoice_and_subscription(billing_db):
    engine, user_id, plan_id = billing_db
    with Session(engine) as db:
        result = BillingService().process_checkout(
            checkout_request(plan_id),
            db.get(User, user_id),
            db,
        )

    assert result["status"] == "approved"
    with Session(engine) as db:
        assert db.query(PaymentTransaction).count() == 1
        assert db.query(Invoice).count() == 1
        subscription = db.query(Subscription).one()
        assert subscription.current_period_start is not None
        assert subscription.current_period_end > subscription.current_period_start
        from app.services.billing_service import _add_calendar_month
        assert subscription.current_period_end == _add_calendar_month(subscription.current_period_start)
        assert _normalize_utc(subscription.start_date) == _normalize_utc(
            subscription.current_period_start
        )
        assert subscription.auto_renew is False


def test_naive_datetime_normalizes_to_utc():
    naive = datetime(2026, 10, 26, 12, 30)

    normalized = _normalize_utc(naive)

    assert normalized == datetime(2026, 10, 26, 12, 30, tzinfo=timezone.utc)


def test_calendar_month_period_clamps_month_end_and_leap_year():
    from app.services.billing_service import _add_calendar_month

    assert _add_calendar_month(datetime(2026, 1, 31, 10, tzinfo=timezone.utc)) == datetime(
        2026, 2, 28, 10, tzinfo=timezone.utc
    )
    assert _add_calendar_month(datetime(2028, 1, 31, 10, tzinfo=timezone.utc)) == datetime(
        2028, 2, 29, 10, tzinfo=timezone.utc
    )


@pytest.mark.parametrize(
    ("field", "value", "expected_status"),
    [
        ("billing_period", "annual", 400),
        ("is_active", False, 404),
    ],
)
def test_checkout_rejects_unsupported_or_inactive_plans(
    billing_db,
    field,
    value,
    expected_status,
):
    engine, user_id, plan_id = billing_db
    with Session(engine) as db:
        plan = db.get(Plan, plan_id)
        setattr(plan, field, value)
        db.commit()
        with pytest.raises(HTTPException) as error:
            BillingService().process_checkout(
                checkout_request(plan_id),
                db.get(User, user_id),
                db,
            )
        assert error.value.status_code == expected_status
    with Session(engine) as db:
        assert db.query(PaymentTransaction).count() == 0
        assert db.query(Invoice).count() == 0


def test_checkout_monthly_period_does_not_overwrite_legacy_subscription_dates(billing_db):
    engine, user_id, plan_id = billing_db
    old_start = datetime(2025, 1, 1, tzinfo=timezone.utc)
    old_end = datetime(2025, 2, 1, tzinfo=timezone.utc)
    with Session(engine) as db:
        db.add(Subscription(
            user_id=user_id,
            plan_id=plan_id,
            status="active",
            start_date=old_start,
            end_date=old_end,
            auto_renew=False,
        ))
        db.commit()
        BillingService().process_checkout(
            checkout_request(plan_id),
            db.get(User, user_id),
            db,
        )
    with Session(engine) as db:
        subscription = db.query(Subscription).one()
        assert subscription.start_date == old_start
        assert subscription.end_date == old_end
        assert subscription.auto_renew is False
        assert subscription.current_period_start is not None
        assert subscription.current_period_end > subscription.current_period_start


@pytest.mark.parametrize("failure_point", ["flush", "commit"])
def test_checkout_failure_rolls_back_every_persisted_record(billing_db, failure_point, caplog):
    engine, user_id, plan_id = billing_db
    with Session(engine) as db:
        target_plan = Plan(
            name="Rollback Target Plan",
            price=19.99,
            max_instances=4,
            max_ram_mb=512,
            cpu_quota=1.0,
        )
        db.add(target_plan)
        db.flush()
        db.add(Subscription(user_id=user_id, plan_id=plan_id, status="active"))
        db.commit()
        target_plan_id = target_plan.id

    class FailingSession(Session):
        fail_at = None

        def flush(self, objects=None):
            if self.fail_at == "flush":
                self.fail_at = None
                raise RuntimeError("synthetic database failure")
            return super().flush(objects)

        def commit(self):
            if self.fail_at == "commit":
                self.fail_at = None
                raise RuntimeError("synthetic database failure")
            return super().commit()

    with Session(engine) as db:
        user = db.get(User, user_id)
    with FailingSession(bind=engine) as db:
        db.fail_at = failure_point
        caplog.set_level(logging.ERROR, logger="app.services.billing_service")
        with pytest.raises(HTTPException) as error:
            BillingService().process_checkout(checkout_request(target_plan_id), user, db)
        assert error.value.status_code == 500
        assert error.value.detail == "No se pudo completar el checkout. Inténtalo de nuevo."
    assert "Checkout persistence failed" in caplog.text
    assert VISA not in caplog.text
    assert TEST_CVV not in caplog.text

    with Session(engine) as db:
        assert db.query(PaymentTransaction).count() == 0
        assert db.query(Invoice).count() == 0
        subscription = db.query(Subscription).one()
        assert subscription.plan_id == plan_id


@pytest.fixture
def billing_client(billing_db):
    engine, user_id, _ = billing_db
    app = FastAPI()
    from app.api.v1.billing import router
    app.include_router(router, prefix="/api/v1")
    from app.main import safe_checkout_validation_error
    from fastapi.exceptions import RequestValidationError
    app.add_exception_handler(RequestValidationError, safe_checkout_validation_error)
    user = User(
        id=user_id,
        email="billing-test@example.invalid",
        hashed_password="synthetic-hash",
        full_name="Billing Test",
        role=UserRole.CLIENT,
    )

    def override_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    from app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: user
    with TestClient(app) as client:
        yield client


def test_plan_catalog_returns_model_billing_period_and_filters_inactive_plans(
    billing_client,
    billing_db,
):
    engine, _, active_plan_id = billing_db
    with Session(engine) as db:
        active_plan = db.get(Plan, active_plan_id)
        active_plan.billing_period = "annual"
        inactive_plan = Plan(
            name="Inactive Catalog Plan",
            price=19.99,
            billing_period="monthly",
            is_active=False,
            max_instances=4,
            max_ram_mb=512,
            cpu_quota=1.0,
        )
        db.add(inactive_plan)
        db.commit()

    response = billing_client.get("/api/v1/plans")

    assert response.status_code == 200
    plans = response.json()
    returned_active_plan = next(plan for plan in plans if plan["id"] == active_plan_id)
    assert returned_active_plan["billing_period"] == "annual"
    assert "Inactive Catalog Plan" not in {plan["name"] for plan in plans}
    assert set(returned_active_plan) == {
        "id",
        "name",
        "description",
        "price",
        "billing_period",
        "max_instances",
        "max_ram_mb",
        "cpu_quota",
        "is_active",
    }


def test_checkout_422_never_echoes_card_number_or_cvv(billing_client, caplog):
    invalid_inputs = [
        ("411111111111111X", TEST_CVV),
        (VISA, "9876"),
    ]
    for invalid_pan, invalid_cvv in invalid_inputs:
        response = billing_client.post(
            "/api/v1/billing/checkout",
            json={
                "plan_id": 1,
                "card_holder": "Test Customer",
                "card_number": invalid_pan,
                "exp_month": 12,
                "exp_year": 2040,
                "cvv": invalid_cvv,
            },
        )

        assert response.status_code == 422
        assert invalid_pan not in response.text
        assert invalid_cvv not in response.text
        assert invalid_pan not in caplog.text
        assert invalid_cvv not in caplog.text


def test_checkout_luhn_rejection_does_not_persist_or_expose_card_data(billing_client, billing_db):
    engine, _, plan_id = billing_db
    invalid_pan = "4111111111111112"
    response = billing_client.post(
        "/api/v1/billing/checkout",
        json={
            "plan_id": plan_id,
            "card_holder": "Test Customer",
            "card_number": invalid_pan,
            "exp_month": 12,
            "exp_year": 2040,
            "cvv": TEST_CVV,
        },
    )

    assert response.status_code == 400
    assert invalid_pan not in response.text
    assert TEST_CVV not in response.text
    with Session(engine) as db:
        assert db.query(PaymentTransaction).count() == 0
        assert db.query(Invoice).count() == 0
        assert db.query(Subscription).count() == 0


def test_invoice_history_uses_plan_name_snapshot_after_plan_rename(billing_client, billing_db):
    engine, _, plan_id = billing_db
    checkout = billing_client.post(
        "/api/v1/billing/checkout",
        json={
            "plan_id": plan_id,
            "card_holder": "Test Customer",
            "card_number": VISA,
            "exp_month": 12,
            "exp_year": 2040,
            "cvv": TEST_CVV,
        },
    )
    assert checkout.status_code == 200
    with Session(engine) as db:
        transaction = db.query(PaymentTransaction).one()
        assert transaction.plan_name_snapshot == "Billing Test Plan"
        db.get(Plan, plan_id).name = "Renamed Billing Plan"
        db.commit()

    response = billing_client.get("/api/v1/billing/invoices")

    assert response.status_code == 200
    assert response.json()[0]["plan_name"] == "Billing Test Plan"
    assert set(response.json()[0]) == {
        "id",
        "invoice_number",
        "transaction_id",
        "plan_name",
        "amount",
        "tax",
        "status",
        "auth_code",
        "card_last_four",
        "card_brand",
        "created_at",
    }


def test_legacy_invoice_without_snapshot_uses_explicit_unknown_name(billing_client, billing_db):
    engine, _, plan_id = billing_db
    checkout = billing_client.post(
        "/api/v1/billing/checkout",
        json={
            "plan_id": plan_id,
            "card_holder": "Test Customer",
            "card_number": VISA,
            "exp_month": 12,
            "exp_year": 2040,
            "cvv": TEST_CVV,
        },
    )
    assert checkout.status_code == 200
    with Session(engine) as db:
        transaction = db.query(PaymentTransaction).one()
        transaction.plan_name_snapshot = None
        db.get(Plan, plan_id).name = "Current Plan Name"
        db.commit()

    response = billing_client.get("/api/v1/billing/invoices")

    assert response.status_code == 200
    assert response.json()[0]["plan_name"] == "Nombre del plan no registrado"


def _create_free_plan(db, *, max_instances=1):
    free_plan = Plan(
        name="Free",
        price=0.0,
        max_instances=max_instances,
        max_ram_mb=128,
        cpu_quota=0.25,
    )
    db.add(free_plan)
    db.flush()
    return free_plan


def test_change_plan_rejects_paid_upgrade_without_checkout(billing_client, billing_db):
    engine, user_id, paid_plan_id = billing_db
    with Session(engine) as db:
        free_plan = _create_free_plan(db)
        db.add(Subscription(user_id=user_id, plan_id=free_plan.id, status="active"))
        free_plan_id = free_plan.id
        db.commit()

    response = billing_client.post(
        "/api/v1/subscriptions/change-plan",
        json={"target_plan_id": paid_plan_id},
    )

    assert response.status_code == 400
    with Session(engine) as db:
        subscription = db.query(Subscription).one()
        assert subscription.plan_id == free_plan_id
        assert db.query(PaymentTransaction).count() == 0
        assert db.query(Invoice).count() == 0


def test_checkout_approves_payment_and_immediately_updates_subscription(billing_db):
    engine, user_id, paid_plan_id = billing_db
    with Session(engine) as db:
        free_plan = _create_free_plan(db)
        db.add(Subscription(user_id=user_id, plan_id=free_plan.id, status="active"))
        free_plan_id = free_plan.id
        db.commit()

        result = BillingService().process_checkout(
            checkout_request(paid_plan_id),
            db.get(User, user_id),
            db,
        )

        assert result["status"] == "approved"
        assert result["plan_name"] == "Billing Test Plan"
        subscription = db.query(Subscription).one()
        assert subscription.plan_id == paid_plan_id
        assert subscription.plan_id != free_plan_id
        assert db.query(PaymentTransaction).count() == 1
        assert db.query(Invoice).count() == 1


def test_change_plan_allows_valid_free_downgrade_without_changing_period_or_history(
    billing_client,
    billing_db,
):
    engine, user_id, paid_plan_id = billing_db
    period_start = datetime(2026, 10, 1, tzinfo=timezone.utc)
    period_end = datetime(2026, 11, 1, tzinfo=timezone.utc)
    with Session(engine) as db:
        free_plan = _create_free_plan(db)
        subscription = Subscription(
            user_id=user_id,
            plan_id=paid_plan_id,
            status="active",
            current_period_start=period_start,
            current_period_end=period_end,
            start_date=period_start,
            end_date=period_end,
            auto_renew=False,
        )
        db.add(subscription)
        free_plan_id = free_plan.id
        db.commit()

    response = billing_client.post(
        "/api/v1/subscriptions/change-plan",
        json={"target_plan_id": free_plan_id},
    )

    assert response.status_code == 200
    assert response.json()["plan"] == "Free"
    with Session(engine) as db:
        persisted = db.query(Subscription).one()
        assert persisted.plan_id == free_plan_id
        assert _normalize_utc(persisted.current_period_start) == period_start
        assert _normalize_utc(persisted.current_period_end) == period_end
        assert _normalize_utc(persisted.start_date) == period_start
        assert _normalize_utc(persisted.end_date) == period_end
        assert persisted.auto_renew is False
        assert db.query(PaymentTransaction).count() == 0
        assert db.query(Invoice).count() == 0


def test_change_plan_blocks_free_downgrade_when_active_instance_quota_is_exceeded(
    billing_client,
    billing_db,
):
    engine, user_id, paid_plan_id = billing_db
    with Session(engine) as db:
        free_plan = _create_free_plan(db, max_instances=1)
        db.add(Subscription(user_id=user_id, plan_id=paid_plan_id, status="active"))
        for number, instance_status in enumerate(
            (InstanceStatus.RUNNING, InstanceStatus.PENDING),
            start=1,
        ):
            db.add(Instance(
                uuid=f"quota-instance-{number}",
                name=f"Quota instance {number}",
                user_id=user_id,
                assigned_port=31000 + number,
                public_url=f"http://localhost:{31000 + number}",
                status=instance_status,
                storage_path=f"synthetic-{number}",
            ))
        free_plan_id = free_plan.id
        db.commit()

    response = billing_client.post(
        "/api/v1/subscriptions/change-plan",
        json={"target_plan_id": free_plan_id},
    )

    assert response.status_code == 400
    assert "1 instancia(s)" in response.json()["detail"]
    with Session(engine) as db:
        subscription = db.query(Subscription).one()
        assert subscription.plan_id == paid_plan_id

@pytest.mark.parametrize(
    ("subscription_state", "expected_status"),
    [
        ("missing", 400),
        ("inactive", 400),
        ("expired", 400),
    ],
)
def test_change_plan_cannot_grant_paid_plan_without_active_valid_subscription(
    billing_client,
    billing_db,
    subscription_state,
    expected_status,
):
    engine, user_id, paid_plan_id = billing_db
    with Session(engine) as db:
        free_plan = _create_free_plan(db)
        if subscription_state != "missing":
            period_end = (
                datetime(2020, 1, 1, tzinfo=timezone.utc)
                if subscription_state == "expired"
                else None
            )
            db.add(Subscription(
                user_id=user_id,
                plan_id=free_plan.id,
                status="active" if subscription_state == "expired" else "cancelled",
                current_period_end=period_end,
            ))
        db.commit()

    response = billing_client.post(
        "/api/v1/subscriptions/change-plan",
        json={"target_plan_id": paid_plan_id},
    )

    assert response.status_code == expected_status
    with Session(engine) as db:
        subscriptions = db.query(Subscription).all()
        assert len(subscriptions) == (0 if subscription_state == "missing" else 1)
        assert db.query(PaymentTransaction).count() == 0
        assert db.query(Invoice).count() == 0


@pytest.mark.parametrize("destination", ["missing", "disabled"])
def test_change_plan_rejects_missing_or_disabled_destination(
    billing_client,
    billing_db,
    destination,
):
    engine, user_id, _ = billing_db
    target_plan_id = 9999
    if destination == "disabled":
        with Session(engine) as db:
            disabled_plan = Plan(
                name="Disabled Plan",
                price=0.0,
                is_active=False,
                max_instances=1,
                max_ram_mb=128,
                cpu_quota=0.25,
            )
            db.add(disabled_plan)
            db.commit()
            target_plan_id = disabled_plan.id

    response = billing_client.post(
        "/api/v1/subscriptions/change-plan",
        json={"target_plan_id": target_plan_id},
    )

    assert response.status_code == 404
    with Session(engine) as db:
        assert db.query(Subscription).count() == 0
