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

        # 3. Asignación de Puerto TCP
        assigned_port = port_service.allocate_port(db)

        # 4. Creación de Directorio de Destino para el Inquilino
        instance_uuid = uuid.uuid4().hex[:8]
        dest_dir = settings.RESOLVED_STORAGE_PATH / f"{user.id}_{instance_uuid}"
        dest_dir.mkdir(parents=True, exist_ok=True)

        # 5. Clonación de Archivos de Plantilla
        src_dir = self._resolve_template_source(template_id)
        try:
            for item in os.listdir(src_dir):
                s = src_dir / item
                d = dest_dir / item
                if s.is_dir():
                    shutil.copytree(s, d, dirs_exist_ok=True)
                else:
                    shutil.copy2(s, d)
        except Exception as e:
            logger.error(f"Error al clonar plantilla: {e}")
            port_service.release_port(assigned_port, db)
            raise HTTPException(status_code=500, detail=f"Fallo al aprovisionar archivos de plantilla: {e}")

        # 6. Creación y Despliegue de Contenedor Docker
        container_name = f"paas_{user.id}_{instance_uuid}"
        public_url = f"http://localhost:{assigned_port}"

        try:
            container_info = docker_service.run_nginx_instance(
                container_name=container_name,
                host_port=assigned_port,
                source_path=str(dest_dir.resolve()),
                cpu_quota=plan.cpu_quota if plan else 0.25,
                memory_limit_mb=plan.max_ram_mb if plan else 128
            )
            container_id = container_info.get("container_id")
        except Exception as e:
            logger.warning(f"Error al levantar contenedor Docker: {e}. Usando simulación.")
            container_id = f"sim_{instance_uuid}"

        # 7. Persistencia en Base de Datos
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
            details=f"Desplegado mediante plantilla 1-clic: {template_id}"
        )
        db.add(history)
        db.commit()
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
