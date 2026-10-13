"""
Router de Autenticación – Controlador delgado.
Toda la lógica de negocio está delegada a AuthService.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user_schema import UserCreate, UserLogin, UserResponse, TokenResponse, UserMeResponse
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """RF-01: Registro de nuevos usuarios con rol Cliente y asignación de Plan Free."""
    return auth_service.register_user(user_in, db)


@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """RF-03: Autenticación segura y emisión de token JWT firmado."""
    return auth_service.authenticate_user(login_data, db)


@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtiene el perfil del usuario autenticado y su cuota actual de instancias."""
    return auth_service.get_user_profile(current_user, db)
