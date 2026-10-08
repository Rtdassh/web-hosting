import os
import uuid
import shutil
import logging
from datetime import datetime, timezone
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.models.instance import Instance, InstanceStatus
from app.models.user import User, UserRole
from app.models.plan import Subscription
from app.schemas.instance_schema import (
    InstanceResponse,
    InstanceActionRequest,
    InstanceActionResponse,
    InstanceLogsResponse,
    InstanceMetricsResponse,
    InstanceSyncResponse,
    InstanceDestroyResponse
)
from app.services.artifact_service import artifact_service
from app.services.docker_service import docker_service
from app.services.port_service import port_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/instances", tags=["Instancias de Hosting (PaaS Core)"])

@router.get("", response_model=List[InstanceResponse])
def list_instances(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista las instancias del usuario autenticado (o todas si es Administrador)."""
    if current_user.role == UserRole.ADMIN:
        return db.query(Instance).order_by(Instance.created_at.desc()).all()
    return (
        db.query(Instance)
        .filter(Instance.user_id == current_user.id)
        .order_by(Instance.created_at.desc())
        .all()
    )

@router.post("/deploy", response_model=InstanceResponse, status_code=status.HTTP_201_CREATED)
def deploy_instance(
    name: str = Form(..., description="Nombre comercial del proyecto web"),
    file: UploadFile = File(..., description="Archivo .zip con el sitio web estático"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Hito del 30%: Aprovisionamiento automatizado de extremo a extremo.
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
    plan = sub.plan if sub and sub.plan else None
    max_instances = plan.max_instances if plan else 1
    ram_limit_mb = plan.max_ram_mb if plan else 128
    cpu_quota = plan.cpu_quota if plan else 0.25

    active_count = db.query(Instance).filter(
        Instance.user_id == current_user.id,
        Instance.status != InstanceStatus.FAILED
    ).count()

    if active_count >= max_instances:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Has alcanzado el límite máximo de {max_instances} instancia(s) de tu plan '{plan.name if plan else 'Free'}'. Actualiza tu suscripción para desplegar más sitios."
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

@router.post("/{instance_id}/action", response_model=InstanceActionResponse)
def instance_action(
    instance_id: int,
    action_data: InstanceActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """RF-16: Control de ciclo de vida interactivo (Start, Stop, Restart) con validación de propiedad."""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instancia no encontrada.")

    if instance.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para operar sobre esta instancia."
        )

    action = action_data.action.lower()
    if action == "stop":
        docker_service.stop_instance(instance.container_id)
        instance.status = InstanceStatus.STOPPED
    elif action == "start":
        docker_service.start_instance(instance.container_id)
        instance.status = InstanceStatus.RUNNING
    elif action == "restart":
        docker_service.restart_instance(instance.container_id)
        instance.status = InstanceStatus.RUNNING
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción no soportada (usar: start, stop, restart)."
        )

    db.commit()
    db.refresh(instance)

    # T3.4: Bitácora estructurada de auditoría de acciones
    logger.info(
        f"[ACTION_AUDIT] user_id={current_user.id} instance_id={instance.id} action={action} result=success"
    )

    return InstanceActionResponse(
        message=f"Instancia {action} ejecutada exitosamente.",
        status=instance.status
    )

@router.delete("/{instance_id}", response_model=InstanceDestroyResponse)
def destroy_instance(
    instance_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """RF-17: Eliminación definitiva (Destroy) del contenedor, liberación del puerto y limpieza segura de disco."""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instancia no encontrada.")

    if instance.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar esta instancia."
        )

    # Validar la ruta antes de modificar Docker o la base de datos.
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
            detail="La ruta de la instancia está fuera del almacenamiento permitido."
        )

    # 1. Eliminar el contenedor y comprobar el resultado.
    if instance.container_id:
        removed = docker_service.remove_instance(instance.container_id)
        if not removed:
            raise HTTPException(
                status_code=503,
                detail="No se pudo eliminar el contenedor de Docker."
            )

    # 2. Eliminar únicamente la carpeta previamente validada.
    try:
        shutil.rmtree(target_dir)
    except FileNotFoundError:
        pass  # La carpeta ya fue eliminada.
    except OSError as exc:
        logger.exception(
            "Error limpiando almacenamiento de la instancia %s",
            instance.id
        )
        raise HTTPException(
            status_code=500,
            detail="No se pudo limpiar el almacenamiento. Reintentá la eliminación."
        ) from exc

    # 3. Liberar el puerto después de completar la limpieza.
    port_service.release_port(db, instance.assigned_port)

    # 4. Eliminar registro en BD
    db.delete(instance)
    db.commit()

    # T3.4: Bitácora de auditoría
    logger.info(
        f"[ACTION_AUDIT] user_id={current_user.id} instance_id={instance_id} action=destroy result=success"
    )

    return InstanceDestroyResponse(
        message="Instancia destruida, puerto liberado y almacenamiento limpiado correctamente.",
        instance_id=instance_id
    )

@router.get("/{instance_id}/metrics", response_model=InstanceMetricsResponse)
def get_instance_metrics(
    instance_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """T3.1, RF-20: Obtiene métricas de CPU y Memoria en tiempo real desde la API de Docker."""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instancia no encontrada.")

    if instance.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para consultar telemetría de esta instancia."
        )

    # Obtener límite de RAM del plan para cálculo relativo
    sub = db.query(Subscription).filter(
        Subscription.user_id == instance.user_id,
        Subscription.status == "active"
    ).first()
    ram_limit_mb = float(sub.plan.max_ram_mb) if sub and sub.plan else 128.0

    stats = docker_service.get_container_stats(instance.container_id, ram_limit_mb=ram_limit_mb)

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

@router.get("/{instance_id}/logs", response_model=InstanceLogsResponse)
def get_instance_logs(
    instance_id: int,
    tail: int = Query(default=100, ge=1, le=1000, description="Número de líneas finales a recuperar"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """T3.1, RF-21: Obtiene el buffer de logs de Nginx (stdout/stderr) para la consola web."""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instancia no encontrada.")

    if instance.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para consultar logs de esta instancia."
        )

    lines = docker_service.get_container_logs(instance.container_id, tail=tail)

    return InstanceLogsResponse(
        instance_id=instance.id,
        container_id=instance.container_id,
        total_lines=len(lines),
        lines=lines
    )

@router.post("/{instance_id}/sync", response_model=InstanceSyncResponse)
def sync_instance_status(
    instance_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """T3.3: Comprueba el estado real del contenedor en Docker Engine y sincroniza la BD."""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instancia no encontrada.")

    if instance.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para sincronizar esta instancia."
        )

    previous_status = instance.status
    docker_status = docker_service.get_container_status(instance.container_id)

    if docker_status == "running":
        current_status = InstanceStatus.RUNNING
    elif docker_status in ("exited", "stopped"):
        current_status = InstanceStatus.STOPPED
    elif docker_status == "not_found":
        current_status = InstanceStatus.STOPPED
    else:
        current_status = previous_status

    synced = False
    if current_status != previous_status:
        instance.status = current_status
        db.commit()
        db.refresh(instance)
        synced = True

    logger.info(
        f"[ACTION_AUDIT] user_id={current_user.id} instance_id={instance.id} action=sync result=success previous={previous_status} current={instance.status}"
    )

    return InstanceSyncResponse(
        instance_id=instance.id,
        previous_status=previous_status,
        current_status=instance.status,
        synced=synced
    )

