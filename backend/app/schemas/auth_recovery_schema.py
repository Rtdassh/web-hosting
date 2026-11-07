"""
Esquemas Pydantic para Recuperación de Contraseña y Verificación de Correo (RF-05, RF-02).
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.schemas.user_schema import validate_bcrypt_password


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="Correo del usuario para enviar el enlace de recuperación.",
        examples=["usuario@ejemplo.com"],
    )


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str = Field(
        ...,
        min_length=1,
        max_length=256,
        description="Token de recuperación de un solo uso, recibido por correo.",
    )
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="Nueva contraseña (8 a 72 caracteres).",
        examples=["ClaveSegura123!"],
    )

    @field_validator("new_password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        return validate_bcrypt_password(value)


class ResetPasswordResponse(BaseModel):
    message: str
    success: bool = True


class VerifyEmailResponse(BaseModel):
    message: str
    is_verified: bool
    email: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="Correo asociado a la cuenta que requiere verificación.",
        examples=["usuario@ejemplo.com"],
    )


class ResendVerificationResponse(BaseModel):
    message: str
