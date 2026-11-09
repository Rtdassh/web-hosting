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
from app.services.subscription_service import require_current_subscription_plan
from app.services.password_reset_delivery import (
    PasswordResetDeliveryProvider,
    create_password_reset_delivery_provider,
)

logger = logging.getLogger(__name__)

EMAIL_VERIFICATION_TOKEN_PREFIX = "email-verification:"
EMAIL_VERIFICATION_TOKEN_TTL = timedelta(hours=24)


def subscription_is_current(subscription):
    try:
        require_current_subscription_plan(subscription)
        return True
    except HTTPException:
        return False


class AuthService:

    def __init__(self, password_reset_delivery: PasswordResetDeliveryProvider | None = None):
        self.password_reset_delivery = password_reset_delivery

    def register_user(self, user_in: UserCreate, db: Session) -> User:
        """
        RF-01: Registro de nuevos usuarios con rol Cliente y asignación de Plan Free.
        Creates an unverified account and delivers a single-use verification link.
        """
        delivery = self.password_reset_delivery
        if delivery is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="La verificación por correo no está configurada.",
            )

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
            is_verified=False,
        )
        db.add(db_user)
        try:
            db.flush()
            db.add(Subscription(
                user_id=db_user.id,
                plan_id=free_plan.id,
                status="active",
                auto_renew=False,
            ))
            raw_token, token_record = self._create_email_verification_token(
                db_user.id,
                db,
                commit=False,
            )
            db.commit()
        except Exception:
            db.rollback()
            raise

        try:
            delivery.send_email_verification(db_user.email, raw_token)
        except Exception as delivery_error:
            self._invalidate_email_verification_token(token_record.id, db)
            logger.warning(
                "Email verification delivery failed during registration "
                "(error_type=%s).",
                type(delivery_error).__name__,
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "La cuenta se creó, pero no se pudo enviar el correo. "
                    "Solicita un nuevo enlace de verificación."
                ),
            ) from None

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
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales de acceso incorrectas.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Debes verificar tu correo antes de iniciar sesión.",
            )

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
                available_slots=max(0, sub.plan.max_instances - active_count),
                subscription_status=sub.status,
                current_period_end=sub.current_period_end or sub.end_date,
                is_current=subscription_is_current(sub),
            )

        return {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role,
            "is_active": current_user.is_active,
            "is_verified": current_user.is_verified,
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

    def resend_email_verification(self, email: str, db: Session) -> dict:
        """Issue a fresh 24-hour verification token without disclosing account state."""
        generic_response = {
            "message": (
                "Si la cuenta existe y aún requiere verificación, recibirás un nuevo enlace."
            )
        }
        delivery = self.password_reset_delivery
        if delivery is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="La verificación por correo no está configurada.",
            )

        user = db.query(User).filter(User.email == email).first()
        if user is None or user.is_verified:
            return generic_response

        raw_token, token_record = self._create_email_verification_token(user.id, db)
        try:
            delivery.send_email_verification(email, raw_token)
        except Exception as delivery_error:
            self._invalidate_email_verification_token(token_record.id, db)
            logger.warning(
                "Email verification delivery failed during resend (error_type=%s).",
                type(delivery_error).__name__,
            )
        return generic_response

    @staticmethod
    def _create_email_verification_token(
        user_id: int,
        db: Session,
        commit: bool = True,
    ):
        from app.models.token import PasswordResetToken

        db.execute(
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user_id,
                PasswordResetToken.token_hash.like(
                    f"{EMAIL_VERIFICATION_TOKEN_PREFIX}%"
                ),
                PasswordResetToken.used.is_(False),
            )
            .values(used=True)
        )
        raw_token = secrets.token_urlsafe(32)
        token_hash = EMAIL_VERIFICATION_TOKEN_PREFIX + hashlib.sha256(
            raw_token.encode("utf-8")
        ).hexdigest()
        token_record = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + EMAIL_VERIFICATION_TOKEN_TTL,
            used=False,
        )
        db.add(token_record)
        if commit:
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise
        return raw_token, token_record

    @staticmethod
    def _invalidate_email_verification_token(token_id: int, db: Session) -> None:
        from app.models.token import PasswordResetToken

        try:
            invalidated_id = db.execute(
                update(PasswordResetToken)
                .where(PasswordResetToken.id == token_id)
                .values(used=True)
                .returning(PasswordResetToken.id)
            ).scalar_one_or_none()
            if invalidated_id is None:
                raise RuntimeError("The email verification token was not invalidated.")
            db.commit()
        except Exception as invalidation_error:
            try:
                db.rollback()
            except Exception as rollback_error:
                logger.critical(
                    "Email verification token invalidation failed "
                    "(invalidation_error_type=%s, rollback_error_type=%s).",
                    type(invalidation_error).__name__,
                    type(rollback_error).__name__,
                )
            else:
                logger.critical(
                    "Email verification token invalidation failed "
                    "(error_type=%s).",
                    type(invalidation_error).__name__,
                )

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
        """Atomically consume a valid 24-hour token and verify its account."""
        from app.models.token import PasswordResetToken

        now = datetime.now(timezone.utc)
        token_hash = EMAIL_VERIFICATION_TOKEN_PREFIX + hashlib.sha256(
            token.encode("utf-8")
        ).hexdigest()
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
                    detail="Token de verificación inválido, expirado o ya utilizado.",
                )

            verified_user_id = db.execute(
                update(User)
                .where(User.id == user_id, User.is_verified.is_(False))
                .values(is_verified=True)
                .returning(User.id)
            ).scalar_one_or_none()
            if verified_user_id is None:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Token de verificación inválido, expirado o ya utilizado.",
                )

            user = db.query(User).filter(User.id == verified_user_id).first()
            if user is None:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Token de verificación inválido, expirado o ya utilizado.",
                )
            db.commit()
            return {
                "message": "Correo verificado exitosamente.",
                "is_verified": True,
                "email": user.email,
            }
        except HTTPException:
            raise
        except Exception:
            db.rollback()
            raise



auth_service = AuthService(
    password_reset_delivery=create_password_reset_delivery_provider()
)
