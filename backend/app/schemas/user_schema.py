import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator, ConfigDict, Field
from app.models.user import UserRole

def validate_bcrypt_password(value: str) -> str:
    if len(value.encode("utf-8")) > 72:
        raise ValueError("La contraseña no puede exceder 72 bytes en UTF-8.")
    return value


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
    password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="Contraseña de 8 a 72 caracteres (límite bcrypt).",
        examples=["ClaveSegura123!"],
    )

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        return validate_bcrypt_password(value)

class UserLogin(BaseModel):
    email: str
    password: str = Field(..., min_length=1, max_length=72)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        return validate_bcrypt_password(value)

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

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
    subscription_status: str = "active"
    current_period_end: Optional[datetime] = None
    is_current: bool = True

class UserMeResponse(UserResponse):
    plan: Optional[PlanInfo] = None
