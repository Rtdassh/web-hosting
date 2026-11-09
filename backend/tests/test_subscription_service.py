import logging
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services.instance_service import InstanceService
from app.services.subscription_service import require_current_subscription_plan


def make_subscription(
    plan_name="Developer",
    *,
    status="active",
    current_period_end=None,
    end_date=None,
):
    plan = SimpleNamespace(
        name=plan_name,
        max_instances=3,
        max_ram_mb=512,
        cpu_quota=1.0,
    )
    return SimpleNamespace(
        status=status,
        plan=plan,
        current_period_end=current_period_end,
        end_date=end_date,
    )


def test_free_active_subscription_without_period_is_allowed():
    subscription = make_subscription("Free")

    plan = require_current_subscription_plan(subscription)

    assert plan is subscription.plan


@pytest.mark.parametrize("plan_name", ["Developer", "Pro"])
def test_paid_subscription_with_future_current_period_is_allowed(plan_name):
    now = datetime(2026, 10, 26, 12, tzinfo=timezone.utc)
    subscription = make_subscription(
        plan_name,
        current_period_end=now + timedelta(seconds=1),
    )

    assert require_current_subscription_plan(subscription, now) is subscription.plan


def test_current_period_end_in_past_is_rejected():
    now = datetime(2026, 10, 26, 12, tzinfo=timezone.utc)
    subscription = make_subscription(
        current_period_end=now - timedelta(microseconds=1),
    )

    with pytest.raises(HTTPException) as exc_info:
        require_current_subscription_plan(subscription, now)

    assert exc_info.value.status_code == 403


@pytest.mark.parametrize(
    ("end_date", "allowed"),
    [
        (datetime(2026, 10, 26, 12, 0, 1, tzinfo=timezone.utc), True),
        (datetime(2026, 10, 26, 11, 59, 59, tzinfo=timezone.utc), False),
    ],
)
def test_legacy_end_date_is_used_when_current_period_end_is_null(end_date, allowed):
    now = datetime(2026, 10, 26, 12, tzinfo=timezone.utc)
    subscription = make_subscription(end_date=end_date)

    if allowed:
        assert require_current_subscription_plan(subscription, now) is subscription.plan
    else:
        with pytest.raises(HTTPException) as exc_info:
            require_current_subscription_plan(subscription, now)
        assert exc_info.value.status_code == 403


def test_paid_subscription_without_either_end_date_is_allowed_with_safe_warning(caplog):
    subscription = make_subscription()
    original_values = (
        subscription.status,
        subscription.current_period_end,
        subscription.end_date,
        subscription.plan,
    )

    with caplog.at_level(logging.WARNING, logger="app.services.subscription_service"):
        plan = require_current_subscription_plan(subscription)

    assert plan is subscription.plan
    assert "no end date" in caplog.text
    assert "user" not in caplog.text.lower()
    assert "email" not in caplog.text.lower()
    assert original_values == (
        subscription.status,
        subscription.current_period_end,
        subscription.end_date,
        subscription.plan,
    )


def test_cancelled_subscription_is_rejected():
    subscription = make_subscription(status="cancelled")

    with pytest.raises(HTTPException) as exc_info:
        require_current_subscription_plan(subscription)

    assert exc_info.value.status_code == 403


def test_subscription_is_expired_at_exact_end_instant():
    now = datetime(2026, 10, 26, 12, tzinfo=timezone.utc)
    subscription = make_subscription(current_period_end=now)

    with pytest.raises(HTTPException) as exc_info:
        require_current_subscription_plan(subscription, now)

    assert exc_info.value.status_code == 403


def test_timezone_offsets_are_compared_as_utc():
    now = datetime(2026, 10, 26, 12, tzinfo=timezone.utc)
    subscription = make_subscription(
        current_period_end=datetime(2026, 10, 26, 14, tzinfo=timezone(timedelta(hours=2))),
    )

    with pytest.raises(HTTPException) as exc_info:
        require_current_subscription_plan(subscription, now)

    assert exc_info.value.status_code == 403


def test_naive_legacy_datetime_is_interpreted_as_utc():
    now = datetime(2026, 10, 26, 12, tzinfo=timezone.utc)
    subscription = make_subscription(
        end_date=datetime(2026, 10, 26, 12),
    )

    with pytest.raises(HTTPException) as exc_info:
        require_current_subscription_plan(subscription, now)

    assert exc_info.value.status_code == 403


def test_expired_subscription_blocks_zip_deploy_before_port_reservation(monkeypatch):
    now = datetime.now(timezone.utc)
    subscription = make_subscription(current_period_end=now - timedelta(seconds=1))
    db = SimpleNamespace(
        query=lambda _model: SimpleNamespace(
            filter=lambda *args: SimpleNamespace(first=lambda: subscription)
        )
    )
    user = SimpleNamespace(id=1)
    reserve_port = SimpleNamespace(get_and_reserve_available_port=lambda _db: pytest.fail(
        "Port reservation must not happen for an expired subscription"
    ))
    monkeypatch.setattr("app.services.instance_service.port_service", reserve_port)

    with pytest.raises(HTTPException) as exc_info:
        InstanceService.deploy("site", None, user, db)

    assert exc_info.value.status_code == 403


def test_free_plan_with_expired_legacy_period_is_allowed():
    now = datetime(2026, 11, 2, 12, tzinfo=timezone.utc)

    subscription = make_subscription(
        "Free",
        current_period_end=datetime(
            2026, 11, 1, tzinfo=timezone.utc
        ),
        end_date=datetime(
            2026, 11, 1, tzinfo=timezone.utc
        ),
    )

    assert require_current_subscription_plan(
        subscription, now
    ) is subscription.plan