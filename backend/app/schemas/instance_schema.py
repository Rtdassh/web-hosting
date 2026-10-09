from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.instance import InstanceStatus

class InstanceBase(BaseModel):
    name: str

class InstanceCreate(InstanceBase):
    pass

class InstanceResponse(InstanceBase):
    id: int
    uuid: str
    assigned_port: int
    public_url: str
    status: InstanceStatus
    created_at: datetime
    container_id: Optional[str] = None

    class Config:
        from_attributes = True

class InstanceActionRequest(BaseModel):
    action: str  # start, stop, restart

class InstanceActionResponse(BaseModel):
    message: str
    status: InstanceStatus

class InstanceLogsResponse(BaseModel):
    instance_id: int
    container_id: Optional[str] = None
    total_lines: int
    lines: list[str]

class InstanceMetricsResponse(BaseModel):
    instance_id: int
    status: InstanceStatus
    cpu_percent: float
    memory_usage_mb: float
    memory_limit_mb: float
    memory_percent: float
    updated_at: datetime

class InstanceSyncResponse(BaseModel):
    instance_id: int
    previous_status: InstanceStatus
    current_status: InstanceStatus
    synced: bool

class InstanceDestroyResponse(BaseModel):
    message: str
    instance_id: int

