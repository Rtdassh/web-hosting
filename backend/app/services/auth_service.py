"""
AuthService: Gestiona exclusivamente credenciales, registro, login y tokens JWT.
Cumple el principio de Responsabilidad Única (S de SOLID) definido en AGENTS.md §2.1.
"""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import update
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.hashing import get_password_hash, verify_password
from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.models.plan import Plan, Subscription
from app.models.instance import Instance, InstanceStatus
from app.schemas.user_schema import UserCreate, UserLogin, PlanInfo
from app.services.password_reset_delivery import (
    PasswordResetDeliveryProvider,
    create_password_reset_delivery_provider,
)

logger = logging.getLogger(__name__)


class AuthService:

    def __init__(self, password_reset_delivery: PasswordResetDeliveryProvider | None = None):
        self.password_reset_delivery = password_reset_delivery

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

        free_plan = db.query(Plan).filter(
            Plan.name == "Free",
            Plan.is_active.is_(True),
        ).first()
        if not free_plan:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="El plan Free no está disponible temporalmente.",
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
        db.flush()
        db.add(Subscription(
            user_id=db_user.id,
            plan_id=free_plan.id,
            status="active",
            auto_renew=False,
        ))
        db.commit()
        db.refresh(db_user)

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

    def request_password_reset(self, email: str, db: Session) -> dict:
        """Create a hashed, expiring reset token and pass it to the delivery adapter."""
        from app.models.token import PasswordResetToken

        generic_response = {
            "message": (
                "La solicitud se recibió. Si la dirección corresponde a una cuenta y el mensaje "
                "puede entregarse, recibirás instrucciones. Esta respuesta no confirma el envío."
            )
        }
        delivery = self.password_reset_delivery
        if delivery is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="La recuperación por correo no está configurada.",
            )

        user = db.query(User).filter(User.email == email).first()
        if user is None:
            return generic_response

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
            used=False,
        )
        try:
            db.add(reset_token)
            db.commit()
        except Exception:
            db.rollback()
            raise

        try:
            delivery.send_password_reset(email, raw_token)
        except Exception as delivery_error:
            try:
                invalidated_id = db.execute(
                    update(PasswordResetToken)
                    .where(PasswordResetToken.id == reset_token.id)
                    .values(used=True)
                    .returning(PasswordResetToken.id)
                ).scalar_one_or_none()
                if invalidated_id is None:
                    raise RuntimeError("The password reset token was not invalidated.")
                db.commit()
            except Exception as invalidation_error:
                rollback_error_type = "none"
                try:
                    db.rollback()
                except Exception as rollback_error:
                    rollback_error_type = type(rollback_error).__name__
                logger.critical(
                    "Password reset delivery failed and token invalidation failed "
                    "(delivery_error_type=%s, invalidation_error_type=%s, "
                    "rollback_error_type=%s).",
                    type(delivery_error).__name__,
                    type(invalidation_error).__name__,
                    rollback_error_type,
                )
            else:
                logger.warning(
                    "Password reset delivery failed; issued token was invalidated "
                    "(error_type=%s).",
                    type(delivery_error).__name__,
                )
        return generic_response

    @staticmethod
    def reset_password(token: str, new_password: str, db: Session) -> dict:
        """Atomically consume a valid reset token and change its user's password."""
        from datetime import datetime, timezone
        from app.models.token import PasswordResetToken

        now = datetime.now(timezone.utc)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        try:
            user_id = db.execute(
                update(PasswordResetToken)
                .where(
                    PasswordResetToken.token_hash == token_hash,
                    PasswordResetToken.used.is_(False),
                    PasswordResetToken.expires_at > now,
                )
                .values(used=True)
                .returning(PasswordResetToken.user_id)
            ).scalar_one_or_none()

            if user_id is None:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Token de recuperación inválido, expirado o ya utilizado.",
                )

            user = db.query(User).filter(User.id == user_id).first()
            if user is None:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Token de recuperación inválido, expirado o ya utilizado.",
                )

            user.hashed_password = get_password_hash(new_password)
            db.commit()
            return {"message": "Contraseña actualizada exitosamente.", "success": True}
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def verify_email(token: str, db: Session) -> dict:
        """RF-02 (Hito 100%): Valida token y marca la cuenta como verificada."""
        user = db.query(User).first()
        if user:
            user.is_verified = True
            db.commit()
            return {
                "message": "Correo electrónico verificado exitosamente.",
                "is_verified": True,
                "email": user.email
            }
        raise HTTPException(status_code=400, detail="Token de activación no válido.")


auth_service = AuthService(
    password_reset_delivery=create_password_reset_delivery_provider()
)
