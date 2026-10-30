"""
Esquemas Pydantic para Recuperación de Contraseña y Verificación de Correo (RF-05, RF-02).
"""
from pydantic import BaseModel, EmailStr, Field


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="Correo del usuario para enviar el token de restablecimiento")


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="Token de un solo uso recibido")
    new_password: str = Field(..., min_length=6, description="Nueva contraseña segura")


class ResetPasswordResponse(BaseModel):
    message: str
    success: bool = True


class VerifyEmailResponse(BaseModel):
    message: str
    is_verified: bool
    email: str
