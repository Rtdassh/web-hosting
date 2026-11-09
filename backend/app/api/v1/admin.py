"""
Router de Gobernanza y Supervisión Administrativa (Hito 80% - Rol 3 & Rol 4).
Exclusivo para usuarios con rol 'admin'. Protegido por get_current_admin.
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.schemas.admin_schema import (
    AdminDashboardResponse,
    AdminInstanceResponse,
    ForceActionRequest,
    ForceActionResponse
)
from app.services.admin_service import admin_service

router = APIRouter(prefix="/admin", tags=["Administración & Gobernanza"])


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    RF-22: Consola de métricas consolidadas de la plataforma (usuarios, MRR, contenedores)
    y telemetría de hardware del host (CPU, RAM, Disco).
    """
    return admin_service.get_dashboard_data(db)


@router.get("/instances", response_model=List[AdminInstanceResponse])
def get_all_instances(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """RF-23: Tabla global de instancias de todos los usuarios para auditoría."""
    return admin_service.list_all_instances(db)


@router.post("/instances/{instance_id}/force-action", response_model=ForceActionResponse)
def force_instance_action(
    instance_id: int,
    request: ForceActionRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    RF-23: Detención o eliminación forzosa de instancias anómalas de terceros,
    con registro estricto en la bitácora de auditoría.
    """
    return admin_service.execute_force_action(
        admin_user=current_admin,
        instance_id=instance_id,
        action=request.action,
        reason=request.reason,
        db=db
    )
