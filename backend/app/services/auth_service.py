"""
AuthService: Gestiona exclusivamente credenciales, registro, login y tokens JWT.
Cumple el principio de Responsabilidad Única (S de SOLID) definido en AGENTS.md §2.1.
"""
import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.hashing import get_password_hash, verify_password
from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.models.plan import Plan, Subscription
from app.models.instance import Instance, InstanceStatus
from app.schemas.user_schema import UserCreate, UserLogin, PlanInfo

logger = logging.getLogger(__name__)


class AuthService:

    @staticmethod
    def register_user(user_in: UserCreate, db: Session) -> User:
        """
        RF-01: Registro de nuevos usuarios con rol Cliente y asignación de Plan Free.
        Raises HTTPException 400 si el correo ya existe.
        """
        existing_user = db.query(User).filter(User.email == user_in.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un usuario registrado con este correo electrónico."
            )

        db_user = User(
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password),
            full_name=user_in.full_name,
            role=UserRole.CLIENT,
            is_active=True,
            is_verified=True  # Simulado para entorno local (RF-02)
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        # Asignar suscripción Free por defecto (RF-08)
        free_plan = db.query(Plan).filter(Plan.name == "Free").first()
        if free_plan:
            sub = Subscription(user_id=db_user.id, plan_id=free_plan.id, status="active")
            db.add(sub)
            db.commit()

        return db_user

    @staticmethod
    def authenticate_user(login_data: UserLogin, db: Session) -> dict:
        """
        RF-03: Autenticación segura y emisión de token JWT firmado.
        Returns dict con access_token, token_type y user.
        Raises HTTPException 401 si las credenciales son incorrectas.
        """
        user = db.query(User).filter(User.email == login_data.email).first()
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales de acceso incorrectas.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(status_code=400, detail="Usuario inactivo.")

        access_token = create_access_token(subject=user.id, role=user.role.value)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }

    @staticmethod
    def get_user_profile(current_user: User, db: Session) -> dict:
        """Obtiene el perfil del usuario autenticado y su cuota actual de instancias."""
        sub = db.query(Subscription).filter(
            Subscription.user_id == current_user.id,
            Subscription.status == "active"
        ).first()

        plan_info = None
        if sub and sub.plan:
            active_count = db.query(Instance).filter(
                Instance.user_id == current_user.id,
                Instance.status != InstanceStatus.FAILED
            ).count()
            plan_info = PlanInfo(
                name=sub.plan.name,
                max_instances=sub.plan.max_instances,
                max_ram_mb=sub.plan.max_ram_mb,
                cpu_quota=sub.plan.cpu_quota,
                active_instances=active_count,
                available_slots=max(0, sub.plan.max_instances - active_count)
            )

        return {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role,
            "is_active": current_user.is_active,
            "created_at": current_user.created_at,
            "plan": plan_info
        }


auth_service = AuthService()
