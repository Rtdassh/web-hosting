import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status

from app.models.plan import Plan, PlanType, Subscription

logger = logging.getLogger(__name__)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def require_current_subscription_plan(
    subscription: Optional[Subscription],
    now: Optional[datetime] = None,
) -> Plan:
    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes una suscripción activa y vigente para desplegar instancias.",
        )

    sub_status = getattr(subscription, "status", "active")
    plan = getattr(subscription, "plan", None)
    if sub_status != "active" or plan is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes una suscripción activa y vigente para desplegar instancias.",
        )
    if plan.name.casefold() == PlanType.FREE.value.casefold():
        return plan
    period_end = subscription.current_period_end
    if period_end is None:
        period_end = subscription.end_date

    if period_end is not None:
        current_time = _as_utc(now if now is not None else datetime.now(timezone.utc))
        if _as_utc(period_end) <= current_time:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu suscripción ha vencido. Renueva tu plan para desplegar instancias.",
            )
    elif plan.name.casefold() != PlanType.FREE.value.casefold():
        logger.warning(
            "Active paid subscription has no end date; allowing deployment for legacy compatibility"
        )

    return plan
