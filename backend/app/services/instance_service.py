"""
InstanceService: Orquesta el ciclo de vida completo de instancias de hosting.
Coordina ArtifactService, DockerService, PortService y la persistencia en BD.
Cumple el principio de Responsabilidad Única (S de SOLID) definido en AGENTS.md §2.1.
"""
import uuid
import shutil
import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException, status

from app.core.config import settings
from app.models.instance import Instance, InstanceStatus
from app.models.instance_status_history import InstanceStatusHistory
from app.models.user import User, UserRole
from app.models.plan import Subscription
from app.services.artifact_service import artifact_service
from app.services.docker_service import docker_service
from app.services.port_service import port_service
from app.services.action_audit_service import audit_action
from app.services.subscription_service import require_current_subscription_plan

logger = logging.getLogger(__name__)


class InstanceService:

    @staticmethod
    def list_instances(current_user: User, db: Session) -> list[Instance]:
        """Lista las instancias del usuario autenticado (o todas si es Administrador)."""
        if current_user.role == UserRole.ADMIN:
            return db.query(Instance).order_by(Instance.created_at.desc()).all()
        return (
            db.query(Instance)
            .filter(Instance.user_id == current_user.id)
            .order_by(Instance.created_at.desc())
            .all()
        )

    @staticmethod
    def _get_instance_or_404(instance_id: int, db: Session) -> Instance:
        """Obtiene una instancia o lanza 404."""
        instance = db.query(Instance).filter(Instance.id == instance_id).first()
        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instancia no encontrada."
            )
        return instance

    @staticmethod
    def _enforce_ownership(instance: Instance, current_user: User) -> None:
        """Verifica que el usuario sea dueño de la instancia o Administrador."""
        if instance.user_id != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para operar sobre esta instancia."
            )

    @staticmethod
    def deploy(name: str, file: UploadFile, current_user: User, db: Session) -> Instance:
        """
        Aprovisionamiento automatizado de extremo a extremo.
        1. Valida identidad mediante JWT y verifica cuota del plan (RNF-06, RF-08).
        2. Reserva un puerto libre en el rango 30001 - 30100 con bloqueo pesimista (RF-18).
        3. Extrae el paquete .zip en el host con protección Anti-Zip Slip y valida index.html (RF-13, RNF-05).
        4. Inicia un contenedor Nginx con volumen en solo lectura (:ro) y cgroups según el plan (RF-15, RNF-04).
        5. Registra la instancia y retorna la URL directa funcional (RF-19).
        Aplica compensación (Rollback) automática en caso de error en cualquier paso.
        """
        # 1. Enforzamiento estricto de cuota por suscripción activa
        sub = db.query(Subscription).filter(
            Subscription.user_id == current_user.id,
            Subscription.status == "active"
        ).first()
        plan = require_current_subscription_plan(sub)
        max_instances = plan.max_instances
        ram_limit_mb = plan.max_ram_mb
        cpu_quota = plan.cpu_quota

        active_count = db.query(Instance).filter(
            Instance.user_id == current_user.id,
            Instance.status != InstanceStatus.FAILED
        ).count()

        if active_count >= max_instances:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Has alcanzado el límite máximo de {max_instances} instancia(s) de tu plan '{plan.name}'. Actualiza tu suscripción para desplegar más sitios."
            )

        instance_uuid = str(uuid.uuid4())[:8]

        # 2. Asignar puerto libre en rango seguro
        assigned_port = port_service.get_and_reserve_available_port(db)

        # 3. Directorio aislado en host: /srv/hosting/instancias/<user_id>_<instance_uuid>
        storage_dir = settings.RESOLVED_STORAGE_PATH / f"{current_user.id}_{instance_uuid}"
        storage_dir.mkdir(parents=True, exist_ok=True)

        try:
            # Extraer el zip de manera segura con Anti-Zip Slip y comprobación de index.html
            artifact_service.sanitize_and_extract_zip(file, str(storage_dir))
        except Exception as e:
            port_service.release_port(db, assigned_port)
            shutil.rmtree(storage_dir, ignore_errors=True)
            raise e

        # 4. Levantar contenedor Docker con cgroups dinámicos
        container_name = f"paas_web_{instance_uuid}"
        container_id = None
        try:
            container_id = docker_service.run_nginx_instance(
                container_name=container_name,
                host_port=assigned_port,
                host_storage_path=str(storage_dir),
                ram_limit_mb=ram_limit_mb,
                cpu_quota=cpu_quota,
                user_id=current_user.id,
                instance_uuid=instance_uuid
            )
        except Exception as e:
            port_service.release_port(db, assigned_port)
            shutil.rmtree(storage_dir, ignore_errors=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Falla en el motor Docker al aprovisionar la instancia: {str(e)}"
            )

        # 5. Persistir en Base de Datos y asociar el puerto
        try:
            public_url = f"http://{settings.HOST_PUBLIC_IP}:{assigned_port}"
            db_instance = Instance(
                uuid=instance_uuid,
                name=name,
                user_id=current_user.id,
                container_id=container_id,
                assigned_port=assigned_port,
                public_url=public_url,
                status=InstanceStatus.RUNNING,
                storage_path=str(storage_dir)
            )
            db.add(db_instance)
            db.commit()
            db.refresh(db_instance)
            port_service.link_instance_to_port(db, assigned_port, db_instance.id)
        except Exception as e:
            if container_id:
                docker_service.remove_instance(container_id)
            port_service.release_port(db, assigned_port)
            shutil.rmtree(storage_dir, ignore_errors=True)
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Falla al persistir la instancia en base de datos: {str(e)}"
            )

        return db_instance

    @staticmethod
    def execute_action(
        instance_id: int,
        action: str,
        current_user: User,
        db: Session,
        docker_svc=None,
        audit_fn=None
    ):
        """RF-16: Control de ciclo de vida interactivo (Start, Stop, Restart) con validación de propiedad."""
        docker_svc = docker_svc if docker_svc is not None else docker_service
        audit_fn = audit_fn if audit_fn is not None else audit_action

        instance = InstanceService._get_instance_or_404(instance_id, db)
        InstanceService._enforce_ownership(instance, current_user)

        operations = {
            "stop": (docker_svc.stop_instance, InstanceStatus.STOPPED),
            "start": (docker_svc.start_instance, InstanceStatus.RUNNING),
            "restart": (docker_svc.restart_instance, InstanceStatus.RUNNING),
        }
        if action not in operations:
            audit_fn(current_user.id, instance.id, action, "failed")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Acción no soportada (usar: start, stop, restart)."
            )

        operation, target_status = operations[action]
        try:
            operation_succeeded = operation(instance.container_id)
        except Exception:
            db.rollback()
            audit_fn(current_user.id, instance.id, action, "failed")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo ejecutar la acción en Docker."
            )

        if not operation_succeeded:
            db.rollback()
            audit_fn(current_user.id, instance.id, action, "failed")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Docker no pudo completar la acción solicitada."
            )

        try:
            instance.status = target_status
            db.commit()
            db.refresh(instance)
        except Exception:
            db.rollback()
            audit_fn(current_user.id, instance.id, action, "failed")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo actualizar el estado de la instancia."
            )

        audit_fn(current_user.id, instance.id, action, "success")

        from app.schemas.instance_schema import InstanceActionResponse
        return InstanceActionResponse(
            message=f"Instancia {action} ejecutada exitosamente.",
            status=instance.status
        )

    @staticmethod
    def destroy(
        instance_id: int,
        current_user: User,
        db: Session,
        docker_svc=None,
        port_svc=None,
        audit_fn=None,
        path_cls=None,
        shutil_mod=None
    ):
        """RF-17: Eliminación definitiva (Destroy) del contenedor, liberación del puerto y limpieza segura de disco."""
        docker_svc = docker_svc if docker_svc is not None else docker_service
        port_svc = port_svc if port_svc is not None else port_service
        audit_fn = audit_fn if audit_fn is not None else audit_action
        path_cls = path_cls if path_cls is not None else Path
        shutil_mod = shutil_mod if shutil_mod is not None else shutil

        instance = InstanceService._get_instance_or_404(instance_id, db)
        InstanceService._enforce_ownership(instance, current_user)

        # 1. Detener y remover contenedor Docker
        if instance.container_id:
            try:
                removal_succeeded = docker_svc.remove_instance(instance.container_id)
            except Exception:
                db.rollback()
                audit_fn(current_user.id, instance_id, "destroy", "failed")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="No se pudo eliminar el contenedor en Docker."
                )

            if not removal_succeeded:
                db.rollback()
                audit_fn(current_user.id, instance_id, "destroy", "failed")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Docker no pudo eliminar el contenedor."
                )

        try:
            # 2. Liberar puerto asignado en la BD
            port_svc.release_port(db, instance.assigned_port, commit=False)

            # 3. Limpiar almacenamiento en disco en el host de forma segura (T4.4)
            storage_path = instance.storage_path
            if storage_path:
                target_dir = path_cls(storage_path).resolve()
                base_dir = settings.RESOLVED_STORAGE_PATH.resolve()
                # Verificar confinamiento dentro del directorio base de instancias (RNF-04)
                is_safe_relative = (
                    target_dir.is_relative_to(base_dir)
                    if hasattr(target_dir, "is_relative_to")
                    else str(target_dir).startswith(str(base_dir))
                )
                if (
                    target_dir != base_dir
                    and is_safe_relative
                    and target_dir.exists()
                ):
                    shutil_mod.rmtree(target_dir, ignore_errors=True)
                else:
                    logger.warning(f"Intento de eliminar ruta fuera de almacenamiento permitido o inexistente: {target_dir}")

            # 4. Eliminar registro en BD
            db.delete(instance)
            db.commit()
        except Exception:
            db.rollback()
            audit_fn(current_user.id, instance_id, "destroy", "failed")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo completar la eliminación de la instancia."
            )

        audit_fn(current_user.id, instance_id, "destroy", "success")

        from app.schemas.instance_schema import InstanceDestroyResponse
        return InstanceDestroyResponse(
            message="Instancia destruida, puerto liberado y almacenamiento limpiado correctamente.",
            instance_id=instance_id
        )

    @staticmethod
    def get_metrics(
        instance_id: int,
        current_user: User,
        db: Session,
        docker_svc=None
    ):
        """T3.1, RF-20: Obtiene métricas de CPU y Memoria en tiempo real desde la API de Docker."""
        from app.core.exceptions import (
            DockerUnavailableError,
            ContainerNotFoundError,
            ContainerMockError,
            DockerOperationError,
        )
        from app.schemas.instance_schema import InstanceMetricsResponse

        docker_svc = docker_svc if docker_svc is not None else docker_service

        instance = InstanceService._get_instance_or_404(instance_id, db)
        InstanceService._enforce_ownership(instance, current_user)

        # Obtener límite de RAM del plan para cálculo relativo
        sub = db.query(Subscription).filter(
            Subscription.user_id == instance.user_id,
            Subscription.status == "active"
        ).first()
        ram_limit_mb = float(sub.plan.max_ram_mb) if sub and sub.plan else 128.0

        try:
            stats = docker_svc.get_container_stats(instance.container_id, ram_limit_mb=ram_limit_mb)
        except ContainerNotFoundError:
            raise HTTPException(status_code=404, detail="Contenedor no encontrado en Docker.")
        except ContainerMockError:
            raise HTTPException(status_code=404, detail="La instancia simulada no tiene un contenedor real.")
        except DockerUnavailableError:
            raise HTTPException(status_code=503, detail="No hay conexión con Docker.")
        except DockerOperationError:
            raise HTTPException(status_code=503, detail="No se pudieron consultar las métricas de Docker.")

        # Mapear estado al enum InstanceStatus
        reported_status = instance.status
        if stats.get("status") == "stopped" and instance.status == InstanceStatus.RUNNING:
            reported_status = InstanceStatus.STOPPED

        return InstanceMetricsResponse(
            instance_id=instance.id,
            status=reported_status,
            cpu_percent=stats.get("cpu_percent", 0.0),
            memory_usage_mb=stats.get("memory_usage_mb", 0.0),
            memory_limit_mb=stats.get("memory_limit_mb", ram_limit_mb),
            memory_percent=stats.get("memory_percent", 0.0),
            updated_at=datetime.now(timezone.utc)
        )

    @staticmethod
    def get_logs(
        instance_id: int,
        tail: int,
        current_user: User,
        db: Session,
        docker_svc=None
    ):
        """T3.1, RF-21: Obtiene el buffer de logs de Nginx (stdout/stderr) para la consola web."""
        from app.core.exceptions import (
            DockerUnavailableError,
            ContainerNotFoundError,
            ContainerMockError,
            DockerOperationError,
        )
        from app.schemas.instance_schema import InstanceLogsResponse

        docker_svc = docker_svc if docker_svc is not None else docker_service

        instance = InstanceService._get_instance_or_404(instance_id, db)
        InstanceService._enforce_ownership(instance, current_user)

        try:
            lines = docker_svc.get_container_logs(instance.container_id, tail=tail)
        except ContainerNotFoundError:
            raise HTTPException(status_code=404, detail="Contenedor no encontrado en Docker.")
        except ContainerMockError:
            raise HTTPException(status_code=404, detail="La instancia simulada no tiene un contenedor real.")
        except DockerUnavailableError:
            raise HTTPException(status_code=503, detail="No hay conexión con Docker.")
        except DockerOperationError:
            raise HTTPException(status_code=503, detail="No se pudieron obtener los logs de Docker.")

        return InstanceLogsResponse(
            instance_id=instance.id,
            container_id=instance.container_id,
            total_lines=len(lines),
            lines=lines
        )

    @staticmethod
    def sync_status(
        instance_id: int,
        current_user: User,
        db: Session,
        docker_svc=None,
        audit_fn=None,
        history_model=None
    ):
        """T3.3: Comprueba el estado real del contenedor en Docker Engine y sincroniza la BD."""
        from app.schemas.instance_schema import InstanceSyncResponse

        docker_svc = docker_svc if docker_svc is not None else docker_service
        audit_fn = audit_fn if audit_fn is not None else audit_action
        history_model = history_model if history_model is not None else InstanceStatusHistory

        instance = InstanceService._get_instance_or_404(instance_id, db)
        InstanceService._enforce_ownership(instance, current_user)

        previous_status = instance.status
        try:
            docker_status = docker_svc.get_container_status(instance.container_id)
        except Exception:
            db.rollback()
            audit_fn(current_user.id, instance.id, "sync", "failed")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo consultar el estado del contenedor en Docker."
            )

        if docker_status == "error":
            db.rollback()
            audit_fn(current_user.id, instance.id, "sync", "failed")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Docker no pudo informar el estado del contenedor."
            )

        if docker_status == "running":
            current_status = InstanceStatus.RUNNING
        elif docker_status in ("exited", "stopped"):
            current_status = InstanceStatus.STOPPED
        elif docker_status == "not_found":
            # Contrato con Rol 4: not_found es ausencia real, no indisponibilidad de Docker.
            current_status = InstanceStatus.FAILED
        else:
            db.rollback()
            audit_fn(current_user.id, instance.id, "sync", "failed")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Docker informó un estado no soportado: {docker_status}."
            )

        if current_status == previous_status:
            audit_fn(current_user.id, instance.id, "sync", "success")
            return InstanceSyncResponse(
                instance_id=instance.id,
                previous_status=previous_status,
                current_status=instance.status,
                synced=False
            )

        try:
            instance.status = current_status
            db.add(history_model(
                instance_id=instance.id,
                previous_status=previous_status.value,
                new_status=current_status.value,
                reason="Docker status sync",
            ))
            db.commit()
            db.refresh(instance)
        except Exception:
            db.rollback()
            audit_fn(current_user.id, instance.id, "sync", "failed")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo persistir la sincronización de estado."
            )

        audit_fn(current_user.id, instance.id, "sync", "success")

        return InstanceSyncResponse(
            instance_id=instance.id,
            previous_status=previous_status,
            current_status=instance.status,
            synced=True
        )


instance_service = InstanceService()
