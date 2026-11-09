"""
Router de Autenticación – Controlador delgado.
Toda la lógica de negocio está delegada a AuthService.
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user_schema import UserCreate, UserLogin, UserResponse, TokenResponse, UserMeResponse
from app.schemas.auth_recovery_schema import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    VerifyEmailResponse,
    ResendVerificationRequest,
    ResendVerificationResponse,
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una cuenta",
    description=(
        "Crea una cuenta de cliente sin verificar y envía un enlace de activación "
        "de un solo uso, válido durante 24 horas."
    ),
    responses={
        400: {"description": "Ya existe una cuenta con ese correo."},
        429: {"description": "Se excedió el límite de solicitudes."},
        503: {"description": "El servicio de correo no está configurado o no pudo entregar el mensaje."},
    },
)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """RF-01/RF-02: Registra una cuenta y solicita la verificación del correo."""
    return auth_service.register_user(user_in, db)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Iniciar sesión",
    description="Emite un JWT HS256 solo para credenciales válidas y correo verificado.",
    responses={
        401: {"description": "Credenciales incorrectas o token de acceso inválido."},
        403: {"description": "La cuenta requiere verificación de correo."},
        429: {"description": "Se excedió el límite de intentos por IP."},
    },
)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """RF-03: Autenticación segura y emisión de token JWT firmado."""
    return auth_service.authenticate_user(login_data, db)


@router.get(
    "/me",
    response_model=UserMeResponse,
    summary="Consultar la cuenta autenticada",
    responses={401: {"description": "Se requiere un JWT vigente y válido."}},
)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtiene el perfil del usuario autenticado y su cuota actual de instancias."""
    return auth_service.get_user_profile(current_user, db)


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    summary="Solicitar recuperación de contraseña",
    description=(
        "La respuesta es genérica para no revelar si el correo está registrado. "
        "Los enlaces caducan en 15 minutos y solo se pueden usar una vez."
    ),
    responses={
        429: {"description": "Se excedió el límite de solicitudes."},
        503: {"description": "La entrega de correo no está configurada."},
    },
)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """RF-05: Genera un token temporal de 15 minutos para recuperación de contraseña."""
    return auth_service.request_password_reset(request.email, db)


@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
    summary="Restablecer contraseña",
    responses={
        400: {"description": "El token es inválido, expiró o ya fue utilizado."},
        422: {"description": "El cuerpo no cumple el contrato de validación."},
        429: {"description": "Se excedió el límite de solicitudes."},
    },
)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """RF-05: Restablece la contraseña utilizando el token de un solo uso."""
    return auth_service.reset_password(request.token, request.new_password, db)


@router.get(
    "/verify-email",
    response_model=VerifyEmailResponse,
    summary="Verificar una dirección de correo",
    description="Consume el token de activación de un solo uso, válido durante 24 horas.",
    responses={
        400: {"description": "El token es inválido, expiró o ya fue utilizado."},
        429: {"description": "Se excedió el límite de solicitudes."},
    },
)
def verify_email(
    token: str = Query(
        ...,
        min_length=1,
        max_length=256,
        description="Token de activación recibido por correo.",
    ),
    db: Session = Depends(get_db),
):
    """RF-02: Verifica la dirección y consume el token de forma atómica."""
    return auth_service.verify_email(token, db)


@router.post(
    "/resend-verification",
    response_model=ResendVerificationResponse,
    summary="Reenviar el enlace de verificación",
    description=(
        "Emite un token nuevo y revoca enlaces anteriores para cuentas pendientes. "
        "La respuesta no revela si el correo existe o ya fue verificado."
    ),
    responses={
        429: {"description": "Se excedió el límite de solicitudes."},
        503: {"description": "La entrega de correo no está configurada."},
    },
)
def resend_verification(
    request: ResendVerificationRequest,
    db: Session = Depends(get_db),
):
    """RF-02: Solicita el reenvío sin revelar el estado de la cuenta."""
    return auth_service.resend_email_verification(request.email, db)
