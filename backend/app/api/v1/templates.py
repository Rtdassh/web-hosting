"""
Router de Catálogo y Despliegue de Plantillas en 1-Clic (Hito 80% - Rol 4).
Endpoints: /templates, /instances/deploy-template.
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.template_schema import (
    TemplateResponse,
    DeployTemplateRequest,
    DeployTemplateResponse
)
from app.services.template_service import template_service

router = APIRouter(tags=["Plantillas 1-Clic"])


@router.get("/templates", response_model=List[TemplateResponse])
def get_templates():
    """RF-14: Retorna el catálogo de sitios estáticos preconfigurados listos para producción."""
    return template_service.get_catalog()


@router.post("/instances/deploy-template", response_model=DeployTemplateResponse, status_code=status.HTTP_201_CREATED)
def deploy_template(
    request: DeployTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    RF-14: Despliegue instantáneo (< 5 segundos) a partir de una plantilla interna
    sin necesidad de empaquetar ni cargar un archivo .ZIP.
    """
    return template_service.deploy_template(
        user=current_user,
        name=request.name,
        template_id=request.template_id,
        db=db
    )
