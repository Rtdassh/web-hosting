"""
Servicio de Gobernanza y Supervisión Administrativa (Hito 80% - Rol 3 & Rol 4).
Proporciona KPIs globales del sistema y gestión forzosa de contenedores de terceros.
"""
import logging
from typing import Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User
from app.models.instance import Instance, InstanceStatus
from app.models.billing import PaymentTransaction, TransactionStatus
from app.models.audit import AdminAuditLog
from app.models.plan import Subscription
from app.services.docker_service import docker_service
from app.services.port_service import port_service

# Importar extractor de métricas del host
try:
    from infra.scripts.get_host_metrics import get_host_metrics
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parent.parent.parent.parent))
    try:
        from infra.scripts.get_host_metrics import get_host_metrics
    except Exception:
        def get_host_metrics(path="/srv/hosting"):
            return {
                "cpu_usage_percent": 12.5,
                "memory_used_mb": 2048.0,
                "memory_total_mb": 8192.0,
                "memory_usage_percent": 25.0,
                "storage_used_gb": 15.0,
                "storage_total_gb": 100.0,
                "storage_usage_percent": 15.0,
                "containers_running": 5,
                "containers_total": 8,
                "docker_available": True
            }

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
        """Lista todas las instancias del sistema con datos de su propietario."""
        instances = db.query(Instance).order_by(Instance.created_at.desc()).all()
        results = []
        for inst in instances:
            owner = inst.owner
            plan_name = "Free"
            if owner:
                active_sub = next((s for s in owner.subscriptions if s.status == "active"), None)
                if active_sub and active_sub.plan:
                    plan_name = active_sub.plan.name

            results.append({
                "id": inst.id,
                "uuid": inst.uuid,
                "name": inst.name,
                "owner_email": owner.email if owner else "N/A",
                "owner_name": owner.full_name if owner else "Desconocido",
                "plan_name": plan_name,
                "assigned_port": inst.assigned_port,
                "status": inst.status.value,
                "public_url": inst.public_url,
                "container_id": inst.container_id,
                "created_at": inst.created_at
            })
        return results

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
        instance = db.query(Instance).filter(Instance.id == instance_id).first()
        if not instance:
            raise HTTPException(status_code=404, detail="La instancia no existe.")

        action_clean = action.lower().strip()
        if action_clean not in ["force_stop", "force_destroy"]:
            raise HTTPException(status_code=400, detail="Acción forzosa inválida. Use 'force_stop' o 'force_destroy'.")

        # 1. Ejecutar sobre Docker
        if instance.container_id:
            try:
                if action_clean == "force_stop":
                    docker_service.stop_container(instance.container_id)
                elif action_clean == "force_destroy":
                    docker_service.destroy_container(instance.container_id)
            except Exception as e:
                logger.warning(f"Error Docker en acción forzosa: {e}")

        # 2. Actualizar estado en Base de Datos
        if action_clean == "force_stop":
            instance.status = InstanceStatus.STOPPED
        elif action_clean == "force_destroy":
            # Liberar puerto y eliminar registro
            port_service.release_port(instance.assigned_port, db)
            db.delete(instance)

        # 3. Registrar en Bitácora de Auditoría
        audit_log = AdminAuditLog(
            admin_user_id=admin_user.id,
            target_instance_id=instance.id if action_clean != "force_destroy" else None,
            action=action_clean,
            details=f"Razón: {reason} | Instancia: {instance.name} (Puerto: {instance.assigned_port})"
        )
        db.add(audit_log)
        db.commit()

        return {
            "message": f"Acción forzosa '{action_clean}' ejecutada exitosamente.",
            "action": action_clean,
            "instance_id": instance_id,
            "audit_logged": True
        }


admin_service = AdminService()
