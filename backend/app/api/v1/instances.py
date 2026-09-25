import os
import uuid
import shutil
from typing import List
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.models.instance import Instance, InstanceStatus
from app.models.user import User, UserRole
from app.models.plan import Subscription
from app.schemas.instance_schema import InstanceResponse, InstanceActionRequest
from app.services.artifact_service import artifact_service
from app.services.docker_service import docker_service
from app.services.port_service import port_service

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

@router.post("/{instance_id}/action")
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
    elif action in ("start", "restart"):
        docker_service.restart_instance(instance.container_id)
        instance.status = InstanceStatus.RUNNING
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción no soportada (usar: start, stop, restart)."
        )

    db.commit()
    return {"message": f"Instancia {action} ejecutada exitosamente.", "status": instance.status}

@router.delete("/{instance_id}")
def destroy_instance(
    instance_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """RF-17: Eliminación definitiva (Destroy) del contenedor, liberación del puerto y limpieza de disco."""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instancia no encontrada.")

    if instance.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar esta instancia."
        )

    # 1. Detener y remover contenedor Docker
    if instance.container_id:
        docker_service.remove_instance(instance.container_id)

    # 2. Liberar puerto asignado en la BD
    port_service.release_port(db, instance.assigned_port)

    # 3. Limpiar almacenamiento en disco en el host
    storage_path = instance.storage_path
    if storage_path and Path(storage_path).exists():
        shutil.rmtree(storage_path, ignore_errors=True)

    # 4. Eliminar registro en BD
    db.delete(instance)
    db.commit()

    return {"message": "Instancia destruida, puerto liberado y almacenamiento limpiado correctamente."}
