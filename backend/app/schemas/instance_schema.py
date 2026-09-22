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
