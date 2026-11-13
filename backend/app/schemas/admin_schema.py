"""
Esquemas Pydantic para el Panel de Gobernanza Administrativa (Hito 80% - Rol 3).
Contratos para /api/v1/admin/dashboard, /api/v1/admin/instances y acciones forzosas.
"""
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


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
    name: str
    owner_id: int
    status: str

    model_config = {"from_attributes": True}


class ForceActionRequest(BaseModel):
    action: Literal["force_stop", "force_destroy"]
    reason: str = Field(..., min_length=3, max_length=500)

    @field_validator("reason", mode="before")
    @classmethod
    def trim_reason(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class ForceActionResponse(BaseModel):
    message: str
    action: str
    instance_id: int
    audit_logged: bool = True
