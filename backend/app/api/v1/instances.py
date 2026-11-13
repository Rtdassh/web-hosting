"""
Router de Instancias – Controlador delgado.
Toda la lógica de negocio está delegada a InstanceService.
Re-exporta dependencias para compatibilidad con la suite de pruebas unitarias (Role 3).
"""
import shutil
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse, StreamingResponse
from app.schemas.site_management_schema import SiteRenameRequest, SiteFilesResponse, SiteActivityResponse

from app.core.database import get_db
from app.core.security import get_current_client
from app.models.instance import Instance, InstanceStatus
from app.models.instance_status_history import InstanceStatusHistory
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
from app.schemas.site_schema import SiteVersionResponse, SiteInsightsResponse, SiteHealthResponse
from app.services.action_audit_service import audit_action
from app.services.artifact_service import artifact_service
from app.services.docker_service import docker_service
from app.services.port_service import port_service
from app.services.instance_service import instance_service

router = APIRouter(prefix="/instances", tags=["Instancias de Hosting (PaaS Core)"])


@router.get("", response_model=List[InstanceResponse])
def list_instances(
    current_user: User = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Lista únicamente las instancias del cliente autenticado."""
    return instance_service.list_instances(current_user, db)


@router.post(
    "/deploy",
    response_model=InstanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Desplegar un sitio desde ZIP",
    responses={429: {"description": "Se excedió el límite de despliegues por IP."}},
)
def deploy_instance(
    name: str = Form(..., description="Nombre comercial del proyecto web"),
    file: UploadFile = File(..., description="Archivo .zip con el sitio web estático"),
    current_user: User = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Aprovisionamiento automatizado de extremo a extremo."""
    return instance_service.deploy(name, file, current_user, db)


@router.post(
    "/{instance_id}/action",
    response_model=InstanceActionResponse,
    summary="Controlar el ciclo de vida de una instancia",
    responses={429: {"description": "Se excedió el límite de acciones por IP."}},
)
def instance_action(
    instance_id: int,
    action_data: InstanceActionRequest,
    current_user: User = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """RF-16: Control de ciclo de vida interactivo (Start, Stop, Restart) con validación de propiedad."""
    return instance_service.execute_action(
        instance_id,
        action_data.action,
        current_user,
        db,
        docker_svc=docker_service,
        audit_fn=audit_action
    )


@router.delete(
    "/{instance_id}",
    response_model=InstanceDestroyResponse,
    summary="Eliminar una instancia",
    responses={429: {"description": "Se excedió el límite de acciones por IP."}},
)
def destroy_instance(
    instance_id: int,
    current_user: User = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """RF-17: Eliminación definitiva (Destroy) del contenedor, liberación del puerto y limpieza segura de disco."""
    return instance_service.destroy(
        instance_id,
        current_user,
        db,
        docker_svc=docker_service,
        port_svc=port_service,
        audit_fn=audit_action,
        path_cls=Path,
        shutil_mod=shutil
    )


@router.get("/{instance_id}/metrics", response_model=InstanceMetricsResponse)
def get_instance_metrics(
    instance_id: int,
    current_user: User = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """T3.1, RF-20: Obtiene métricas de CPU y Memoria en tiempo real desde la API de Docker."""
    return instance_service.get_metrics(
        instance_id,
        current_user,
        db,
        docker_svc=docker_service
    )


@router.get("/{instance_id}/logs", response_model=InstanceLogsResponse)
def get_instance_logs(
    instance_id: int,
    tail: int = Query(default=100, ge=1, le=1000, description="Número de líneas finales a recuperar"),
    current_user: User = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """T3.1, RF-21: Obtiene el buffer de logs de Nginx (stdout/stderr) para la consola web."""
    return instance_service.get_logs(
        instance_id,
        tail,
        current_user,
        db,
        docker_svc=docker_service
    )


@router.post(
    "/{instance_id}/sync",
    response_model=InstanceSyncResponse,
    summary="Sincronizar estado de una instancia",
    responses={429: {"description": "Se excedió el límite de acciones por IP."}},
)
def sync_instance_status(
    instance_id: int,
    current_user: User = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """T3.3: Comprueba el estado real del contenedor en Docker Engine y sincroniza la BD."""
    return instance_service.sync_status(
        instance_id,
        current_user,
        db,
        docker_svc=docker_service,
        audit_fn=audit_action,
        history_model=InstanceStatusHistory
    )


@router.get("/{instance_id}/versions", response_model=list[SiteVersionResponse])
def list_site_versions(instance_id: int, current_user: User = Depends(get_current_client), db: Session = Depends(get_db)):
    from app.services.site_release_service import site_release_service
    instance = site_release_service.owned(instance_id, current_user, db)
    return site_release_service.versions(instance)


@router.post("/{instance_id}/versions", response_model=list[SiteVersionResponse])
def publish_site_version(instance_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_client), db: Session = Depends(get_db)):
    from app.services.site_release_service import site_release_service
    return site_release_service.publish(instance_id, current_user, db, file=file)


@router.post("/{instance_id}/versions/{version_id}/restore", response_model=list[SiteVersionResponse])
def restore_site_version(instance_id: int, version_id: str, current_user: User = Depends(get_current_client), db: Session = Depends(get_db)):
    from app.services.site_release_service import site_release_service
    return site_release_service.publish(instance_id, current_user, db, version_id=version_id)


@router.get("/{instance_id}/insights", response_model=SiteInsightsResponse)
def site_insights(instance_id: int, current_user: User = Depends(get_current_client), db: Session = Depends(get_db)):
    from app.services.site_release_service import site_release_service
    from app.services.site_monitor_service import site_monitor_service, summarize_access_logs
    instance = site_release_service.owned(instance_id, current_user, db)
    try:
        traffic = summarize_access_logs(docker_service.get_container_logs(instance.container_id, tail=1000))
        traffic['available'] = True
    except Exception:
        traffic = {"available": False, "scope": "No se pudieron leer los logs del contenedor."}
    return {"monitor": site_monitor_service.report(instance), "traffic": traffic}


@router.get("/health", response_model=list[SiteHealthResponse])
def list_site_health(current_user: User = Depends(get_current_client), db: Session = Depends(get_db)):
    from app.services.site_monitor_service import site_monitor_service
    return [{"id": instance.id, "name": instance.name, "monitor": site_monitor_service.report(instance)}
            for instance in instance_service.list_instances(current_user, db)]


@router.patch("/{instance_id}", response_model=InstanceResponse)
def rename_site(instance_id: int, data: SiteRenameRequest, current_user: User = Depends(get_current_client), db: Session = Depends(get_db)) -> Instance:
    from app.services.site_management_service import site_management_service
    return site_management_service.rename(instance_id, data.name, current_user, db)


@router.get("/{instance_id}/files", response_model=SiteFilesResponse)
def list_site_files(instance_id: int, path: str = Query(default='', max_length=1024), offset: int = Query(default=0, ge=0), limit: int = Query(default=50, ge=1, le=100), current_user: User = Depends(get_current_client), db: Session = Depends(get_db)) -> dict:
    from app.services.site_release_service import site_release_service
    from app.services.site_management_service import site_management_service
    instance = site_release_service.owned(instance_id, current_user, db, lock=True)
    return site_management_service.files(instance, path, offset, limit)


@router.get("/{instance_id}/files/download", response_class=FileResponse)
def download_site_file(instance_id: int, path: str = Query(min_length=1, max_length=1024), current_user: User = Depends(get_current_client), db: Session = Depends(get_db)) -> FileResponse:
    from fastapi import HTTPException
    from app.services.site_release_service import site_release_service
    from app.services.site_management_service import site_management_service
    instance = site_release_service.owned(instance_id, current_user, db, lock=True)
    target = site_management_service.resolve(site_management_service.root(instance), path)
    if not target.is_file():
        raise HTTPException(400, 'Selecciona un archivo para descargar.')
    return FileResponse(target, filename=target.name, media_type='application/octet-stream')


@router.get("/{instance_id}/backup", response_class=StreamingResponse)
def download_site_backup(instance_id: int, current_user: User = Depends(get_current_client), db: Session = Depends(get_db)) -> StreamingResponse:
    from app.services.site_release_service import site_release_service
    from app.services.site_management_service import site_management_service
    instance = site_release_service.owned(instance_id, current_user, db, lock=True)
    filename = f'sitio-{instance.id}.zip'
    archive = site_management_service.backup(instance)
    db.rollback()  # The archive is now independent of live storage; release the row lock.
    def chunks():
        try:
            while chunk := archive.read(65536):
                yield chunk
        finally:
            archive.close()
    return StreamingResponse(chunks(), media_type='application/zip', headers={'Content-Disposition': f'attachment; filename="{filename}"'})


@router.get("/{instance_id}/activity", response_model=list[SiteActivityResponse])
def get_site_activity(instance_id: int, current_user: User = Depends(get_current_client), db: Session = Depends(get_db)) -> list[InstanceStatusHistory]:
    from app.services.site_release_service import site_release_service
    from app.services.site_management_service import site_management_service
    instance = site_release_service.owned(instance_id, current_user, db)
    return site_management_service.activity(instance, db)
