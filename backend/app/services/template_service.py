"""
Servicio de Catálogo y Aprovisionamiento por Plantillas 1-Clic (Hito 80% - Rol 4).
Permite desplegar sitios preconfigurados en menos de 5 segundos sin cargar archivos ZIP.
"""
import os
import shutil
import uuid
import logging
from pathlib import Path
from typing import List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.plan import Subscription, Plan
from app.models.instance import Instance, InstanceStatus
from app.models.instance_status_history import InstanceStatusHistory
from app.services.port_service import port_service
from app.services.docker_service import docker_service

logger = logging.getLogger(__name__)

AVAILABLE_TEMPLATES = [
    {
        "id": "landing-business",
        "name": "Landing Page Moderna",
        "description": "Sitio comercial responsivo con hero, servicios y llamada a la acción.",
        "category": "Negocios",
        "preview_url": "/templates/previews/landing-business.png"
    },
    {
        "id": "personal-portfolio",
        "name": "Portafolio de Desarrollador",
        "description": "Página personal minimalista para destacar habilidades, proyectos y redes.",
        "category": "Personal",
        "preview_url": "/templates/previews/personal-portfolio.png"
    },
    {
        "id": "html5-docs",
        "name": "Documentación Técnica",
        "description": "Plantilla limpia con barra de navegación lateral y estilos claros.",
        "category": "Documentación",
        "preview_url": "/templates/previews/html5-docs.png"
    }
]


class TemplateService:
    @staticmethod
    def get_catalog() -> List[Dict[str, Any]]:
        """Retorna la lista de plantillas disponibles en el sistema."""
        return AVAILABLE_TEMPLATES

    def _resolve_template_source(self, template_id: str) -> Path:
        """Ubica el directorio fuente de la plantilla en el host o en el repositorio local."""
        # Ruta 1: /srv/hosting/plantillas/<id>
        srv_candidate = Path(f"/srv/hosting/plantillas/{template_id}")
        if srv_candidate.exists() and srv_candidate.is_dir():
            return srv_candidate

        # Ruta 2: infra/host-storage/templates/<id>
        repo_candidate = (settings.RESOLVED_STORAGE_PATH.parent / "templates" / template_id).resolve()
        if repo_candidate.exists() and repo_candidate.is_dir():
            return repo_candidate

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Los archivos de la plantilla '{template_id}' no fueron encontrados en el servidor."
        )

    def deploy_template(self, user: User, name: str, template_id: str, db: Session) -> Dict[str, Any]:
        """
        Orquesta el despliegue automático en 1-clic a partir de una plantilla estática.
        """
        # 1. Validar existencia de la plantilla en catálogo
        matching_template = next((t for t in AVAILABLE_TEMPLATES if t["id"] == template_id), None)
        if not matching_template:
            raise HTTPException(status_code=400, detail=f"Plantilla '{template_id}' no válida.")

        # 2. Control de Cuota del Usuario
        sub = db.query(Subscription).filter(
            Subscription.user_id == user.id,
            Subscription.status == "active"
        ).first()
        plan = sub.plan if sub and sub.plan else db.query(Plan).filter(Plan.name == "Free").first()
        max_instances = plan.max_instances if plan else 1

        current_count = db.query(Instance).filter(
            Instance.user_id == user.id,
            Instance.status.in_([InstanceStatus.RUNNING, InstanceStatus.PENDING])
        ).count()

        if current_count >= max_instances:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Has alcanzado el límite de {max_instances} sitio(s) de tu plan actual ({plan.name if plan else 'Free'}). Realiza un Upgrade para continuar."
            )
        if docker_service.client is None:
            raise HTTPException(
                status_code=503,
                detail="Docker no está disponible. No se puede desplegar la plantilla."
            )
        src_dir = self._resolve_template_source(template_id)

        # 3. Asignación de Puerto TCP
        assigned_port = port_service.get_and_reserve_available_port(db)

        # 4. Creación de Directorio de Destino para el Inquilino
        instance_uuid = uuid.uuid4().hex[:8]
        dest_dir = settings.RESOLVED_STORAGE_PATH / f"{user.id}_{instance_uuid}"
        
        try:
            dest_dir.mkdir(parents=True, exist_ok=False)
        except OSError as exc:
            port_service.release_port(db, assigned_port)
            raise HTTPException(
                status_code=500,
                detail="No se pudo crear la carpeta de la instancia."
            ) from exc

        # 5. Clonación de Archivos de Plantilla
        try:
            for item in os.listdir(src_dir):
                s = src_dir / item
                d = dest_dir / item
                if s.is_dir():
                    shutil.copytree(s, d, dirs_exist_ok=True)
                else:
                    shutil.copy2(s, d)
        except Exception as exc:
            logger.exception("Error al copiar los archivos de la plantilla.")

            try:
                shutil.rmtree(dest_dir)
            except FileNotFoundError:
                pass
            except OSError:
                logger.exception(
                    "No se pudo limpiar la carpeta de la plantilla."
                )

            port_service.release_port(db, assigned_port)

            raise HTTPException(
                status_code=500,
                detail="No se pudieron copiar los archivos de la plantilla."
            ) from exc
        
        # 6. Creación y Despliegue de Contenedor Docker
        container_name = f"paas_{user.id}_{instance_uuid}"
        public_url = f"http://localhost:{assigned_port}"

        try:
            container_id = docker_service.run_nginx_instance(
                container_name=container_name,
                host_port=assigned_port,
                host_storage_path=str(dest_dir.resolve()),
                ram_limit_mb=plan.max_ram_mb if plan else 128,
                cpu_quota=plan.cpu_quota if plan else 0.25,
                user_id=user.id,
                instance_uuid=instance_uuid
            )
        except Exception as exc:
            logger.exception("Error al desplegar el contenedor de la plantilla.")
            try:
                shutil.rmtree(dest_dir)
            except FileNotFoundError:
                pass
            except OSError:
                logger.exception(
                    "No se pudo limpiar la carpeta del despliegue fallido."
                )

            port_service.release_port(db, assigned_port)

            raise HTTPException(
                status_code=503,
                detail="No se pudo desplegar la plantilla en Docker."
            ) from exc

        # 7. Persistencia en Base de Datos
        try:
            instance = Instance(
                uuid=instance_uuid,
                name=name,
                user_id=user.id,
                container_id=container_id,
                assigned_port=assigned_port,
                public_url=public_url,
                status=InstanceStatus.RUNNING,
                storage_path=str(dest_dir.resolve())
            )
            db.add(instance)
            db.flush()

            history = InstanceStatusHistory(
                instance_id=instance.id,
                previous_status="pending",
                new_status="running",
                reason=f"Desplegado mediante plantilla 1-clic: {template_id}"
            )
            db.add(history)

            from app.models.port import PortAllocation

            allocation = db.query(PortAllocation).filter(
                PortAllocation.port_number == assigned_port
            ).one()
            allocation.instance_id = instance.id

            db.commit()

        except Exception as exc:
            db.rollback()
            logger.exception("Error al guardar la instancia de plantilla.")

            removed = docker_service.remove_instance(container_id)
            if removed:
                try:
                    shutil.rmtree(dest_dir)
                except FileNotFoundError:
                    pass
                except OSError:
                    logger.exception(
                        "No se pudo limpiar el almacenamiento del despliegue."
                    )
                port_service.release_port(db, assigned_port)
            else:
                logger.error(
                    "Contenedor %s pendiente de limpieza; puerto %s reservado.",
                    container_id,
                    assigned_port
                )

            raise HTTPException(
                status_code=500,
                detail="No se pudo guardar la instancia de plantilla."
            ) from exc

        db.refresh(instance)

        return {
            "id": instance.id,
            "uuid": instance.uuid,
            "name": instance.name,
            "assigned_port": instance.assigned_port,
            "status": instance.status.value,
            "public_url": instance.public_url,
            "template_used": template_id,
            "created_at": instance.created_at
        }


template_service = TemplateService()
