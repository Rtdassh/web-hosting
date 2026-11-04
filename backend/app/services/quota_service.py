from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.instance import Instance, InstanceStatus
from app.models.plan import Plan


def validate_quota_downgrade(
    db: Session,
    user_id: int,
    new_plan: Plan,
    additional_sites: int = 0,
) -> None:
    """Rechaza cambios de plan que excedan la cuota de sitios existentes (incluidos los detenidos)."""
    active_sites = db.query(Instance).filter(
        Instance.user_id == user_id,
        Instance.status != InstanceStatus.FAILED
    ).count()

    excess = active_sites + additional_sites - new_plan.max_instances

    if excess > 0:
        raise HTTPException(
            status_code=400,
            detail=(
                f"No puedes cambiar al plan {new_plan.name}. "
                f"Tienes {active_sites} instancias activas y el plan "
                f"permite {new_plan.max_instances}. "
                f"Antes de continuar, elimina {excess} instancia(s)."
            )
        )