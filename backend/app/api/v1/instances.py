import os
import uuid
from typing import List
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.instance import Instance, InstanceStatus
from app.models.user import User
from app.schemas.instance_schema import InstanceResponse, InstanceActionRequest
from app.services.artifact_service import artifact_service
from app.services.docker_service import docker_service
from app.services.port_service import port_service

router = APIRouter(prefix="/instances", tags=["Instancias de Hosting (PaaS Core)"])

@router.get("", response_model=List[InstanceResponse])
def list_instances(db: Session = Depends(get_db)):
    """Lista las instancias desplegadas en el sistema."""
    return db.query(Instance).order_by(Instance.created_at.desc()).all()

@router.post("/deploy", response_model=InstanceResponse, status_code=status.HTTP_201_CREATED)
def deploy_instance(
    name: str = Form(..., description="Nombre comercial del proyecto web"),
    file: UploadFile = File(..., description="Archivo .zip con el sitio web estático"),
    db: Session = Depends(get_db)
):
    """
    Hito del 30%: Aprovisionamiento automatizado de extremo a extremo.
    1. Reserva un puerto libre en el rango 30001 - 30100 (RF-18).
    2. Extrae el paquete .zip en el host con protección Anti-Zip Slip (RF-13, RNF-05).
    3. Inicia un contenedor nginx:alpine con volumen en solo lectura (RF-15, RNF-04).
    4. Registra la instancia y retorna la URL directa funcional (RF-19).
    """
    instance_uuid = str(uuid.uuid4())[:8]
    
    # Usuario por defecto para el hito del 30%
    default_user = db.query(User).first()
    user_id = default_user.id if default_user else 1

    # 1. Asignar puerto libre
    assigned_port = port_service.get_and_reserve_available_port(db)

    # 2. Directorio aislado en host: /srv/hosting/instancias/<user_id>_<instance_uuid>
    storage_dir = settings.RESOLVED_STORAGE_PATH / f"{user_id}_{instance_uuid}"
    storage_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Extraer el zip de manera segura
        artifact_service.sanitize_and_extract_zip(file, str(storage_dir))
    except Exception as e:
        port_service.release_port(db, assigned_port)
        raise e

    # 3. Levantar contenedor Docker
    container_name = f"paas_web_{instance_uuid}"
    try:
        container_id = docker_service.run_nginx_instance(
            container_name=container_name,
            host_port=assigned_port,
            host_storage_path=str(storage_dir),
            ram_limit_mb=128
        )
    except Exception as e:
        port_service.release_port(db, assigned_port)
        raise HTTPException(
            status_code=500,
            detail=f"Falla en el motor Docker al aprovisionar la instancia: {str(e)}"
        )

    # 4. Guardar en Base de Datos
    public_url = f"http://localhost:{assigned_port}"
    db_instance = Instance(
        uuid=instance_uuid,
        name=name,
        user_id=user_id,
        container_id=container_id,
        assigned_port=assigned_port,
        public_url=public_url,
        status=InstanceStatus.RUNNING,
        storage_path=str(storage_dir)
    )
    db.add(db_instance)
    db.commit()
    db.refresh(db_instance)

    return db_instance

@router.post("/{instance_id}/action")
def instance_action(instance_id: int, action_data: InstanceActionRequest, db: Session = Depends(get_db)):
    """RF-16: Control de ciclo de vida interactivo (Start, Stop, Restart)."""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Instancia no encontrada.")

    action = action_data.action.lower()
    if action == "stop":
        docker_service.stop_instance(instance.container_id)
        instance.status = InstanceStatus.STOPPED
    elif action == "start":
        # Docker restart/start
        docker_service.restart_instance(instance.container_id)
        instance.status = InstanceStatus.RUNNING
    elif action == "restart":
        docker_service.restart_instance(instance.container_id)
        instance.status = InstanceStatus.RUNNING
    else:
        raise HTTPException(status_code=400, detail="Acción no soportada (usar: start, stop, restart).")

    db.commit()
    return {"message": f"Instancia {action} ejecutada exitosamente.", "status": instance.status}

@router.delete("/{instance_id}")
def destroy_instance(instance_id: int, db: Session = Depends(get_db)):
    """RF-17: Eliminación definitiva (Destroy) del contenedor y liberación del puerto."""
    instance = db.query(Instance).filter(Instance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Instancia no encontrada.")

    # 1. Detener y remover contenedor Docker
    if instance.container_id:
        docker_service.remove_instance(instance.container_id)

    # 2. Liberar puerto asignado
    port_service.release_port(db, instance.assigned_port)

    # 3. Eliminar registro en BD
    db.delete(instance)
    db.commit()

    return {"message": "Instancia destruida y puerto liberado correctamente."}
