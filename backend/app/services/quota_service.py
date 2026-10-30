from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.instance import Instance, InstanceStatus
from app.models.plan import Plan


def validate_quota_downgrade(
    db: Session,
    user_id: int,
    new_plan: Plan
) -> None:
    """Rechaza cambios de plan que excedan la cuota de sitios activos."""
    active_sites = db.query(Instance).filter(
        Instance.user_id == user_id,
        Instance.status.in_([
            InstanceStatus.RUNNING,
            InstanceStatus.PENDING
        ])
    ).count()

    excess = active_sites - new_plan.max_instances

    if excess > 0:
        raise HTTPException(
            status_code=400,
            detail=(
                f"No puedes cambiar al plan {new_plan.name}. "
                f"Tienes {active_sites} instancias activas y el plan "
                f"permite {new_plan.max_instances}. "
                f"Detén o elimina {excess} instancia(s) antes de continuar."
            )
        )