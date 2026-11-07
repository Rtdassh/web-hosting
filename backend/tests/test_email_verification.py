import hashlib
from datetime import datetime, timedelta, timezone

import pytest
import sqlalchemy as sa
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.models import PasswordResetToken, Plan, User, UserRole
from app.schemas.user_schema import UserCreate
from app.services import auth_service as auth_service_module
from app.services.auth_service import AuthService, EMAIL_VERIFICATION_TOKEN_PREFIX


class CapturingDelivery:
    def __init__(self):
        self.verification_deliveries = []

    def send_password_reset(self, email, token):
        pass

    def send_email_verification(self, email, token):
        self.verification_deliveries.append((email, token))


@pytest.fixture
def verification_db(tmp_path):
    engine = sa.create_engine(
        sa.engine.URL.create("sqlite", database=str(tmp_path / "email-verification.sqlite")),
        connect_args={"check_same_thread": False, "timeout": 10},
    )
    Base.metadata.create_all(engine)
    try:
        yield engine
    finally:
        engine.dispose()


def create_user(engine, *, verified=False, email="client@example.com"):
    from app.core.hashing import get_password_hash

    with Session(engine) as db:
        user = User(
            email=email,
            hashed_password=get_password_hash("OldPassword123!"),
            full_name="Test Client",
            role=UserRole.CLIENT,
            is_active=True,
            is_verified=verified,
        )
        db.add(user)
        db.commit()
        return user.id


def test_registration_creates_unverified_user_and_sends_hashed_24_hour_token(
    verification_db,
):
    delivery = CapturingDelivery()
    service = AuthService(password_reset_delivery=delivery)
    with Session(verification_db) as db:
        db.add(Plan(name="Free", price=0, max_instances=1, max_ram_mb=128, cpu_quota=0.25))
        db.commit()
        user = service.register_user(
            UserCreate(
                email="new@example.com",
                password="SecurePassword123!",
                full_name="New Client",
            ),
            db,
        )
        assert user.is_verified is False

    delivered_email, raw_token = delivery.verification_deliveries[0]
    assert delivered_email == "new@example.com"
    assert len(raw_token) >= 32
    with Session(verification_db) as db:
        record = db.query(PasswordResetToken).one()
        assert record.token_hash == (
            EMAIL_VERIFICATION_TOKEN_PREFIX
            + hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        )
        assert raw_token not in record.token_hash
        remaining = record.expires_at - datetime.now(timezone.utc)
        assert timedelta(hours=23, minutes=59) < remaining <= timedelta(hours=24)


def test_resending_revokes_previous_token_and_verification_is_single_use(
    verification_db,
):
    user_id = create_user(verification_db)
    delivery = CapturingDelivery()
    service = AuthService(password_reset_delivery=delivery)

    with Session(verification_db) as db:
        first_response = service.resend_email_verification("client@example.com", db)
    with Session(verification_db) as db:
        second_response = service.resend_email_verification("client@example.com", db)
    with Session(verification_db) as db:
        missing_response = service.resend_email_verification("missing@example.com", db)

    assert first_response == second_response
    assert missing_response == first_response
    assert len(delivery.verification_deliveries) == 2
    first_token = delivery.verification_deliveries[0][1]
    second_token = delivery.verification_deliveries[1][1]
    assert first_token != second_token

    with Session(verification_db) as db:
        tokens = db.query(PasswordResetToken).filter_by(user_id=user_id).all()
        assert len(tokens) == 2
        assert sum(token.used for token in tokens) == 1
        with pytest.raises(HTTPException) as expired_link:
            service.verify_email(first_token, db)
        assert expired_link.value.status_code == 400

    with Session(verification_db) as db:
        result = service.verify_email(second_token, db)
        user = db.get(User, user_id)
        assert result == {
            "message": "Correo verificado exitosamente.",
            "is_verified": True,
            "email": "client@example.com",
        }
        assert user.is_verified is True
        with pytest.raises(HTTPException) as reused:
            service.verify_email(second_token, db)
        assert reused.value.status_code == 400


def test_expired_or_wrong_purpose_tokens_cannot_verify_accounts(verification_db):
    user_id = create_user(verification_db)
    expired_raw_token = "expired-verification-token"
    reset_raw_token = "password-reset-token"
    with Session(verification_db) as db:
        db.add_all([
            PasswordResetToken(
                user_id=user_id,
                token_hash=EMAIL_VERIFICATION_TOKEN_PREFIX + hashlib.sha256(
                    expired_raw_token.encode("utf-8")
                ).hexdigest(),
                expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
                used=False,
            ),
            PasswordResetToken(
                user_id=user_id,
                token_hash=hashlib.sha256(reset_raw_token.encode("utf-8")).hexdigest(),
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
                used=False,
            ),
        ])
        db.commit()

    for token in (expired_raw_token, reset_raw_token, "unknown-token"):
        with Session(verification_db) as db, pytest.raises(HTTPException) as result:
            AuthService.verify_email(token, db)
        assert result.value.status_code == 400

    with Session(verification_db) as db:
        assert db.get(User, user_id).is_verified is False


def test_jwt_creation_rejects_invalid_role_subject_and_lifetime():
    token = create_access_token(12, UserRole.CLIENT.value)
    header = jwt.get_unverified_header(token)
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=["HS256"],
    )
    assert header["alg"] == "HS256"
    assert payload["sub"] == "12"
    assert payload["role"] == "client"
    assert 0 < payload["exp"] - payload["iat"] <= 60 * 60 * 24

    with pytest.raises(ValueError):
        create_access_token(0, UserRole.CLIENT.value)
    with pytest.raises(ValueError):
        create_access_token(12, "superuser")
    with pytest.raises(ValueError):
        create_access_token(12, UserRole.CLIENT.value, timedelta(0))
    with pytest.raises(ValueError):
        create_access_token(
            12,
            UserRole.CLIENT.value,
            timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES + 1),
        )


def test_email_delivery_failure_invalidates_token_without_logging_secrets(
    verification_db,
    caplog,
):
    user_id = create_user(verification_db)

    class FailingDelivery(CapturingDelivery):
        def send_email_verification(self, email, token):
            self.verification_deliveries.append((email, token))
            raise RuntimeError(f"failure containing {email} and {token}")

    delivery = FailingDelivery()
    service = AuthService(password_reset_delivery=delivery)
    with Session(verification_db) as db:
        response = service.resend_email_verification("client@example.com", db)

    raw_token = delivery.verification_deliveries[0][1]
    assert response["message"].startswith("Si la cuenta existe")
    assert raw_token not in caplog.text
    assert "client@example.com" not in caplog.text
    with Session(verification_db) as db:
        token = db.query(PasswordResetToken).filter_by(user_id=user_id).one()
        assert token.used is True
        with pytest.raises(HTTPException):
            service.verify_email(raw_token, db)


def test_registration_delivery_failure_keeps_account_pending_and_invalidates_link(
    verification_db,
    caplog,
):
    class FailingDelivery(CapturingDelivery):
        def send_email_verification(self, email, token):
            self.verification_deliveries.append((email, token))
            raise RuntimeError(f"failure containing {email} and {token}")

    delivery = FailingDelivery()
    service = AuthService(password_reset_delivery=delivery)
    with Session(verification_db) as db:
        db.add(Plan(name="Free", price=0, max_instances=1, max_ram_mb=128, cpu_quota=0.25))
        db.commit()
        with pytest.raises(HTTPException) as unavailable:
            service.register_user(
                UserCreate(
                    email="pending@example.com",
                    password="SecurePassword123!",
                    full_name="Pending Client",
                ),
                db,
            )
        assert unavailable.value.status_code == 503
        assert delivery.verification_deliveries[0][1] not in unavailable.value.detail

    with Session(verification_db) as db:
        user = db.query(User).filter_by(email="pending@example.com").one()
        token = db.query(PasswordResetToken).filter_by(user_id=user.id).one()
        assert user.is_verified is False
        assert token.used is True
    assert "pending@example.com" not in caplog.text
    assert delivery.verification_deliveries[0][1] not in caplog.text


def test_missing_email_delivery_is_reported_without_creating_a_registration(
    verification_db,
):
    with Session(verification_db) as db:
        db.add(Plan(name="Free", price=0, max_instances=1, max_ram_mb=128, cpu_quota=0.25))
        db.commit()
        with pytest.raises(HTTPException) as unavailable:
            AuthService().register_user(
                UserCreate(
                    email="nodelivery@example.com",
                    password="SecurePassword123!",
                    full_name="No Delivery",
                ),
                db,
            )
        assert unavailable.value.status_code == 503
        assert db.query(User).filter_by(email="nodelivery@example.com").count() == 0


def test_auth_endpoints_require_verification_and_allow_login_after_activation(
    verification_db,
    monkeypatch,
):
    user_id = create_user(verification_db)
    delivery = CapturingDelivery()
    monkeypatch.setattr(
        auth_service_module.auth_service,
        "password_reset_delivery",
        delivery,
    )

    from app.api.v1.auth import router

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")

    def override_get_db():
        with Session(verification_db) as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            payload = {"email": "client@example.com", "password": "OldPassword123!"}
            unverified_login = client.post("/api/v1/auth/login", json=payload)
            assert unverified_login.status_code == 403

            resend = client.post(
                "/api/v1/auth/resend-verification",
                json={"email": "client@example.com"},
            )
            assert resend.status_code == 200
            assert "client@example.com" not in resend.text
            email, token = delivery.verification_deliveries[0]
            assert email == "client@example.com"
            verified = client.get(
                "/api/v1/auth/verify-email",
                params={"token": token},
            )
            assert verified.status_code == 200
            assert verified.json()["is_verified"] is True
            login = client.post("/api/v1/auth/login", json=payload)
            assert login.status_code == 200
            authenticated = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {login.json()['access_token']}"},
            )
            assert authenticated.status_code == 200
            assert authenticated.json()["is_verified"] is True
            no_token = client.get("/api/v1/auth/me")
            assert no_token.status_code == 401
            stale_role = create_access_token(user_id, UserRole.ADMIN.value)
            wrong_role = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {stale_role}"},
            )
            assert wrong_role.status_code == 401
    finally:
        app.dependency_overrides.clear()
