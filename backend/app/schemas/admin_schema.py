"""
Esquemas Pydantic para el Panel de Gobernanza Administrativa (Hito 80% - Rol 3).
Contratos para /api/v1/admin/dashboard, /api/v1/admin/instances y acciones forzosas.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class HostMetricsResponse(BaseModel):
    cpu_usage_percent: float
    memory_used_mb: float
    memory_total_mb: float
    memory_usage_percent: float
    storage_used_gb: float
    storage_total_gb: float
    storage_usage_percent: Optional[float] = 0.0
    containers_running: int
    containers_total: int
    docker_available: bool = True


class AdminSummaryResponse(BaseModel):
    total_users: int
    total_revenue_simulated: float
    total_instances: int
    active_instances: int
    stopped_instances: int


class AdminDashboardResponse(BaseModel):
    summary: AdminSummaryResponse
    host_resources: HostMetricsResponse


class AdminInstanceResponse(BaseModel):
    id: int
    uuid: str
    name: str
    owner_email: str
    owner_name: str
    plan_name: str
    assigned_port: int
    status: str
    public_url: str
    container_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ForceActionRequest(BaseModel):
    action: str = Field(..., description="'force_stop' o 'force_destroy'")
    reason: Optional[str] = Field("Acción administrativa de emergencia", description="Motivo de la acción")


class ForceActionResponse(BaseModel):
    message: str
    action: str
    instance_id: int
    audit_logged: bool = True
