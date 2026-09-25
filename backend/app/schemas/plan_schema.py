from pydantic import BaseModel, ConfigDict
from typing import Optional

class PlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = 0.0
    max_instances: int = 1
    max_ram_mb: int = 128
    cpu_quota: float = 0.25

class PlanCreate(PlanBase):
    pass

class PlanResponse(PlanBase):
    id: int

    model_config = ConfigDict(from_attributes=True)