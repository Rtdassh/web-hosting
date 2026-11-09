"""
Esquemas Pydantic para el Despliegue de Sitios por Plantillas 1-Clic (Hito 80% - Rol 4).
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    preview_url: Optional[str] = None


class DeployTemplateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=50, description="Nombre descriptivo para la nueva instancia")
    template_id: str = Field(..., description="Identificador de la plantilla (ej. 'personal-portfolio')")


class DeployTemplateResponse(BaseModel):
    id: int
    uuid: str
    name: str
    assigned_port: int
    status: str
    public_url: str
    template_used: str
    created_at: datetime

    model_config = {"from_attributes": True}
