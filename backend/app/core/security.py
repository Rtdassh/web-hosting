"""
Módulo de seguridad: autenticación JWT y dependencias de autorización para FastAPI.
Las funciones puras de hashing están en app.core.hashing.
"""
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.hashing import verify_password, get_password_hash  # noqa: F401 – re-exportado
from app.models.user import User, UserRole


security_scheme = HTTPBearer(auto_error=False)


def create_access_token(
    subject: int | str,
    role: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Crea un token JWT firmado con subject (user id), role y expiración."""
    subject_value = str(subject)
    if not subject_value.isdecimal() or int(subject_value) < 1:
        raise ValueError("JWT subject must be a positive user identifier.")
    if role not in {user_role.value for user_role in UserRole}:
        raise ValueError("JWT role is invalid.")

    max_lifetime = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    lifetime = max_lifetime if expires_delta is None else expires_delta
    if lifetime <= timedelta(0) or lifetime > max_lifetime:
        raise ValueError("JWT lifetime must be positive and within the configured maximum.")

    expire = datetime.now(timezone.utc) + lifetime

    to_encode = {
        "sub": subject_value,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Valida el token JWT del encabezado Authorization: Bearer <token> y retorna el usuario."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de acceso inválido o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise credentials_exception

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id_str = payload.get("sub")
        role_claim = payload.get("role")
        if (
            not isinstance(user_id_str, str)
            or not user_id_str.isdecimal()
            or int(user_id_str) < 1
            or not isinstance(role_claim, str)
            or role_claim not in {role.value for role in UserRole}
        ):
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active or not user.is_verified or user.role.value != role_claim:
        raise credentials_exception
    return user


def get_current_client(current_user: User = Depends(get_current_user)) -> User:
    """Reserva las operaciones de clientes al rol cliente."""
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="El administrador solo puede acceder a la consola administrativa.")
    return current_user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Verifica que el usuario actual tenga rol de Administrador."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación restringida exclusivamente al Administrador."
        )
    return current_user
