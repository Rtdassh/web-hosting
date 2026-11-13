"""
Servicio de Gobernanza y Supervisión Administrativa (Hito 80% - Rol 3 & Rol 4).
Proporciona KPIs globales del sistema y gestión forzosa de contenedores de terceros.
"""
import logging
import shutil
from pathlib import Path
from app.core.config import settings
from typing import Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User, UserRole
from app.models.instance import Instance, InstanceStatus
from app.models.billing import PaymentTransaction, TransactionStatus
from app.models.audit import AdminAuditLog
from app.models.plan import Subscription
from app.services.docker_service import docker_service
from app.services.port_service import port_service

from app.services.host_metrics import get_host_metrics

logger = logging.getLogger(__name__)


class AdminService:
    def get_dashboard_data(self, db: Session) -> Dict[str, Any]:
        """Consolida las métricas de la plataforma y del servidor host."""
        total_users = db.query(User).count()
        
        # Ingresos totales acumulados
        revenue_sum = db.query(func.sum(PaymentTransaction.amount)).filter(
            PaymentTransaction.status == TransactionStatus.APPROVED
        ).scalar() or 0.0

        total_instances = db.query(Instance).count()
        active_instances = db.query(Instance).filter(
            Instance.status.in_([InstanceStatus.RUNNING, InstanceStatus.PENDING])
        ).count()
        stopped_instances = db.query(Instance).filter(
            Instance.status == InstanceStatus.STOPPED
        ).count()

        host_resources = get_host_metrics("/srv/hosting")

        return {
            "summary": {
                "total_users": total_users,
                "total_revenue_simulated": round(float(revenue_sum), 2),
                "total_instances": total_instances,
                "active_instances": active_instances,
                "stopped_instances": stopped_instances
            },
            "host_resources": host_resources
        }

    def list_all_instances(self, db: Session) -> List[Dict[str, Any]]:
        """Metadatos operativos sin datos personales ni rutas de acceso."""
        instances = db.query(Instance).order_by(Instance.created_at.desc()).all()
        return [{
            "id": inst.id,
            "name": inst.name,
            "owner_id": inst.user_id,
            "status": inst.status.value if hasattr(inst.status, "value") else str(inst.status),
        } for inst in instances]

    def execute_force_action(
        self,
        admin_user: User,
        instance_id: int,
        action: str,
        reason: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Ejecuta detención o eliminación forzada sobre un contenedor de terceros y registra auditoría.
        """
        
        if admin_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=403,
                detail="Solo un administrador puede ejecutar acciones forzosas."
            )

        if not reason or not reason.strip():
            raise HTTPException(
                status_code=400,
                detail="Debes indicar el motivo de la acción administrativa."
            )

        instance = db.query(Instance).filter(Instance.id == instance_id).with_for_update().first()
        if not instance:
            raise HTTPException(status_code=404, detail="La instancia no existe.")

        action_clean = action.lower().strip()
        if action_clean not in ["force_stop", "force_destroy"]:
            raise HTTPException(status_code=400, detail="Acción forzosa inválida. Use 'force_stop' o 'force_destroy'.")

        target_dir = None

        if action_clean == "force_destroy":
            if not instance.storage_path:
                raise HTTPException(
                    status_code=409,
                    detail="La instancia no tiene una ruta de almacenamiento válida."
                )

            target_dir = Path(instance.storage_path).resolve()
            base_dir = settings.RESOLVED_STORAGE_PATH.resolve()

            if target_dir == base_dir or not target_dir.is_relative_to(base_dir):
                raise HTTPException(
                    status_code=409,
                    detail="La ruta está fuera del almacenamiento permitido."
                )

        # 1. Ejecutar sobre Docker y comprobar el resultado.
        if instance.container_id:
            if docker_service.client is None:
                raise HTTPException(
                    status_code=503,
                    detail="Docker no está disponible."
                )

            try:
                if action_clean == "force_stop":
                    completed = docker_service.stop_instance(
                        instance.container_id
                    )
                else:
                    completed = docker_service.remove_instance(
                        instance.container_id
                    )
            except Exception as exc:
                logger.exception("Falló la acción administrativa en Docker.")
                raise HTTPException(
                    status_code=503,
                    detail="No se pudo ejecutar la acción en Docker."
                ) from exc

            if not completed:
                raise HTTPException(
                    status_code=503,
                    detail="Docker no pudo completar la acción solicitada."
                )

        # 2. Actualizar estado o limpiar recursos.
        if action_clean == "force_stop":
            instance.status = InstanceStatus.STOPPED

        elif action_clean == "force_destroy":
            try:
                shutil.rmtree(target_dir)
            except FileNotFoundError:
                pass  # La carpeta ya no existe.
            except OSError as exc:
                logger.exception(
                    "Error limpiando archivos de la instancia %s",
                    instance_id
                )
                raise HTTPException(
                    status_code=500,
                    detail="No se pudo limpiar el almacenamiento. Reintentá la eliminación."
                ) from exc

            from app.services.site_release_service import site_release_service
            site_release_service.cleanup(instance)

            port_service.release_port(
                db, instance.assigned_port, commit=False
            )
            db.delete(instance)

        # 3. Guardar auditoría y cambios pendientes juntos.
        try:
            audit_log = AdminAuditLog(
                admin_user_id=admin_user.id,
                target_instance_id=(
                    instance.id if action_clean != "force_destroy" else None
                ),
                action=action_clean,
                details=(
                    f"Razón: {reason.strip()} | "
                    f"Instancia ID: {instance_id} | "
                    f"Nombre: {instance.name} | "
                    f"Puerto: {instance.assigned_port}"
                )
            )
            db.add(audit_log)
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.exception(
                "No se pudo guardar la acción administrativa sobre %s",
                instance_id
            )
            raise HTTPException(
                status_code=500,
                detail="No se pudo guardar la acción administrativa."
            ) from exc

        return {
            "message": f"Acción forzosa '{action_clean}' ejecutada exitosamente.",
            "action": action_clean,
            "instance_id": instance_id,
            "audit_logged": True
        }


admin_service = AdminService()
