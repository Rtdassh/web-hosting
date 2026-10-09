import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator
from app.models.user import UserRole

class UserBase(BaseModel):
    email: str
    full_name: str

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Formato de correo electrónico inválido.")
        return v

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PlanInfo(BaseModel):
    name: str
    max_instances: int
    max_ram_mb: int
    cpu_quota: float
    active_instances: int
    available_slots: int

class UserMeResponse(UserResponse):
    plan: Optional[PlanInfo] = None
