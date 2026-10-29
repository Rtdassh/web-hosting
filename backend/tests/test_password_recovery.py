import hashlib
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from threading import Barrier
from unittest.mock import patch

import pytest
import sqlalchemy as sa
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.database import Base, get_db
from app.models import PasswordResetToken, User, UserRole
from app.schemas.auth_recovery_schema import ForgotPasswordResponse
from app.services import auth_service as auth_service_module
from app.services.auth_service import AuthService
from app.services.password_reset_delivery import (
    SMTPPasswordResetDelivery,
    create_password_reset_delivery_provider,
)


class CapturingDeliveryProvider:
    def __init__(self):
        self.deliveries = []

    def send_password_reset(self, email: str, token: str) -> None:
        self.deliveries.append((email, token))


@pytest.fixture
def recovery_db(tmp_path):
    database = tmp_path / "password-recovery.sqlite"
    engine = sa.create_engine(
        sa.engine.URL.create("sqlite", database=str(database)),
        connect_args={"check_same_thread": False, "timeout": 10},
    )
    Base.metadata.create_all(engine)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def recovery_client(recovery_db):
    from app.api.v1.auth import router

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")

    def override_get_db():
        with Session(recovery_db) as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client


def add_user(engine, email="user@example.com"):
    with Session(engine) as db:
        user = User(
            email=email,
            hashed_password=auth_service_module.get_password_hash("old-password"),
            full_name="Test User",
            role=UserRole.CLIENT,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        return user.id


def add_token(engine, user_id, token, expires_at=None, used=False):
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with Session(engine) as db:
        reset_token = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at or datetime.now(timezone.utc) + timedelta(minutes=15),
            used=used,
        )
        db.add(reset_token)
        db.commit()
        return reset_token.id


def test_forgot_password_uses_hashed_token_and_generic_response(recovery_db):
    user_id = add_user(recovery_db)
    delivery = CapturingDeliveryProvider()
    service = AuthService(password_reset_delivery=delivery)

    with Session(recovery_db) as db:
        response = service.request_password_reset("user@example.com", db)
    public_response = ForgotPasswordResponse(**response).model_dump()
    assert public_response == {
        "message": (
            "La solicitud se recibió. Si la dirección corresponde a una cuenta y el mensaje "
            "puede entregarse, recibirás instrucciones. Esta respuesta no confirma el envío."
        )
    }
    assert len(delivery.deliveries) == 1
    email, raw_token = delivery.deliveries[0]
    assert email == "user@example.com"
    assert len(raw_token) >= 32

    with Session(recovery_db) as db:
        saved = db.query(PasswordResetToken).filter_by(user_id=user_id).one()
        assert saved.token_hash == hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        assert saved.token_hash != raw_token
        assert raw_token not in saved.token_hash
        remaining = saved.expires_at - datetime.now(timezone.utc)
        assert timedelta(minutes=14, seconds=50) < remaining <= timedelta(minutes=15)


def test_forgot_password_unknown_user_has_same_response_and_no_delivery(recovery_db):
    add_user(recovery_db)
    delivery = CapturingDeliveryProvider()
    service = AuthService(password_reset_delivery=delivery)
    with Session(recovery_db) as db:
        existing = service.request_password_reset("user@example.com", db)
    with Session(recovery_db) as db:
        missing = service.request_password_reset("missing@example.com", db)

    assert existing == missing
    assert len(delivery.deliveries) == 1
    with Session(recovery_db) as db:
        assert db.query(PasswordResetToken).count() == 1


def test_forgot_password_without_delivery_provider_returns_unavailable_without_token(recovery_db):
    add_user(recovery_db)
    with Session(recovery_db) as db:
        with pytest.raises(HTTPException) as raised:
            AuthService().request_password_reset("user@example.com", db)
    assert raised.value.status_code == 503

    with Session(recovery_db) as db, pytest.raises(HTTPException) as missing:
        AuthService().request_password_reset("missing@example.com", db)
    assert missing.value.status_code == raised.value.status_code
    assert missing.value.detail == raised.value.detail
    with Session(recovery_db) as db:
        assert db.query(PasswordResetToken).count() == 0


def test_password_reset_delivery_configuration_is_disabled_by_default():
    config = Settings(_env_file=None)

    assert config.password_reset_smtp_enabled is False
    assert create_password_reset_delivery_provider(config) is None


def test_password_reset_delivery_configuration_requires_complete_settings():
    incomplete = Settings(
        _env_file=None,
        PASSWORD_RESET_SMTP_HOST="mailpit",
    )
    assert incomplete.password_reset_smtp_enabled is False
    assert create_password_reset_delivery_provider(incomplete) is None

    invalid_sender = Settings(
        _env_file=None,
        PASSWORD_RESET_SMTP_HOST="mailpit",
        PASSWORD_RESET_FROM_EMAIL="not-an-email",
    )
    assert invalid_sender.password_reset_smtp_enabled is False

    configured = Settings(
        _env_file=None,
        PASSWORD_RESET_SMTP_HOST="mailpit",
        PASSWORD_RESET_SMTP_PORT=1025,
        PASSWORD_RESET_SMTP_SECURITY="none",
        PASSWORD_RESET_FROM_EMAIL="no-reply@example.invalid",
        PASSWORD_RESET_FRONTEND_URL="http://localhost:5173/",
    )
    provider = create_password_reset_delivery_provider(configured)
    assert configured.password_reset_smtp_enabled is True
    assert isinstance(provider, SMTPPasswordResetDelivery)


def test_smtp_delivery_builds_link_and_uses_configured_starttls_without_network(
    monkeypatch,
):
    config = Settings(
        _env_file=None,
        PASSWORD_RESET_SMTP_HOST="mailpit",
        PASSWORD_RESET_SMTP_PORT=1025,
        PASSWORD_RESET_SMTP_SECURITY="starttls",
        PASSWORD_RESET_FROM_EMAIL="no-reply@example.invalid",
        PASSWORD_RESET_FRONTEND_URL="http://localhost:5173/",
    )
    smtp = type("SMTPStub", (), {
        "__enter__": lambda self: self,
        "__exit__": lambda self, exc_type, exc, traceback: False,
        "ehlo": lambda self: None,
        "starttls": lambda self, context: None,
        "send_message": lambda self, message: setattr(self, "message", message),
    })()
    smtp_constructor = lambda *args, **kwargs: smtp
    monkeypatch.setattr(
        "app.services.password_reset_delivery.smtplib.SMTP",
        smtp_constructor,
    )
    token = "test-reset-token-never-log-this"

    SMTPPasswordResetDelivery(config).send_password_reset(
        "user@example.invalid",
        token,
    )

    assert smtp.message["To"] == "user@example.invalid"
    assert "#reset_token=test-reset-token-never-log-this" in smtp.message.get_content()
    assert smtp.message["From"] == "no-reply@example.invalid"


def test_forgot_password_endpoint_is_unavailable_without_delivery_provider(
    recovery_db,
    recovery_client,
    monkeypatch,
):
    add_user(recovery_db)
    monkeypatch.setattr(
        auth_service_module.auth_service,
        "password_reset_delivery",
        None,
    )

    existing = recovery_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "user@example.com"},
    )
    unknown = recovery_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "missing@example.com"},
    )

    assert existing.status_code == unknown.status_code == 503
    assert existing.json() == unknown.json()
    with Session(recovery_db) as db:
        assert db.query(PasswordResetToken).count() == 0


def test_forgot_password_endpoint_uses_injected_provider_and_hides_token(
    recovery_db,
    recovery_client,
    monkeypatch,
):
    user_id = add_user(recovery_db)
    delivery = CapturingDeliveryProvider()
    monkeypatch.setattr(
        auth_service_module.auth_service,
        "password_reset_delivery",
        delivery,
    )

    existing = recovery_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "user@example.com"},
    )
    unknown = recovery_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "missing@example.com"},
    )

    assert existing.status_code == unknown.status_code == 200
    assert existing.json() == unknown.json()
    assert len(delivery.deliveries) == 1
    delivered_email, raw_token = delivery.deliveries[0]
    assert delivered_email == "user@example.com"
    assert raw_token not in existing.text
    assert raw_token not in unknown.text

    with Session(recovery_db) as db:
        saved = db.query(PasswordResetToken).filter_by(user_id=user_id).one()
        assert saved.token_hash == hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        assert raw_token not in saved.token_hash

    reset = recovery_client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "updated-password"},
    )
    reused = recovery_client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "another-password"},
    )
    assert reset.status_code == 200
    assert reused.status_code == 400


def test_reset_password_endpoint_rejects_expired_token(
    recovery_db,
    recovery_client,
):
    user_id = add_user(recovery_db)
    add_token(
        recovery_db,
        user_id,
        "expired-endpoint-token",
        expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
    )

    response = recovery_client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": "expired-endpoint-token",
            "new_password": "updated-password",
        },
    )

    assert response.status_code == 400


def test_forgot_password_endpoint_returns_indistinguishable_response_on_smtp_failure(
    recovery_db,
    recovery_client,
    monkeypatch,
    caplog,
):
    add_user(recovery_db)
    delivered_tokens = []

    class FailingDelivery:
        def send_password_reset(self, email, token):
            delivered_tokens.append(token)
            raise RuntimeError(f"SMTP failed for {email} with token {token}")

    monkeypatch.setattr(
        auth_service_module.auth_service,
        "password_reset_delivery",
        FailingDelivery(),
    )

    existing = recovery_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "user@example.com"},
    )
    unknown = recovery_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "missing@example.com"},
    )

    assert existing.status_code == unknown.status_code == 200
    assert existing.json() == unknown.json()
    assert delivered_tokens[0] not in existing.text
    assert delivered_tokens[0] not in caplog.text
    assert "user@example.com" not in caplog.text
    assert "SMTP failed for" not in caplog.text
    with Session(recovery_db) as db:
        saved = db.query(PasswordResetToken).one()
        assert saved.used is True


def test_delivery_failure_and_token_invalidation_failure_are_reported_safely(
    recovery_db,
    monkeypatch,
    caplog,
):
    user_id = add_user(recovery_db)
    delivered_tokens = []

    class FailingDelivery:
        def send_password_reset(self, email, token):
            delivered_tokens.append(token)
            raise RuntimeError(f"delivery failure containing {token}")

    service = AuthService(password_reset_delivery=FailingDelivery())
    with Session(recovery_db) as db:
        original_execute = db.execute

        def fail_invalidation(statement, *args, **kwargs):
            table = getattr(statement, "table", None)
            if getattr(table, "name", None) == "password_reset_tokens":
                raise OSError("database detail must not be logged")
            return original_execute(statement, *args, **kwargs)

        monkeypatch.setattr(db, "execute", fail_invalidation)
        response = service.request_password_reset("user@example.com", db)

    assert response == {
        "message": (
            "La solicitud se recibió. Si la dirección corresponde a una cuenta y el mensaje "
            "puede entregarse, recibirás instrucciones. Esta respuesta no confirma el envío."
        )
    }
    assert "delivery_error_type=RuntimeError" in caplog.text
    assert "invalidation_error_type=OSError" in caplog.text
    assert delivered_tokens[0] not in caplog.text
    assert "user@example.com" not in caplog.text
    assert "database detail must not be logged" not in caplog.text
    with Session(recovery_db) as check:
        saved = check.query(PasswordResetToken).filter_by(user_id=user_id).one()
        assert saved.used is False


@pytest.mark.parametrize(
    "token, expires_at, used",
    [
        ("wrong-token", None, False),
        ("expired-token", datetime.now(timezone.utc) - timedelta(seconds=1), False),
        ("already-used-token", None, True),
    ],
)
def test_reset_password_rejects_invalid_expired_and_reused_tokens(
    recovery_db, token, expires_at, used
):
    user_id = add_user(recovery_db)
    add_token(recovery_db, user_id, "valid-token")
    if token != "wrong-token":
        add_token(recovery_db, user_id, token, expires_at=expires_at, used=used)

    with Session(recovery_db) as db, pytest.raises(HTTPException) as raised:
        AuthService.reset_password(token, "new-password", db)

    assert raised.value.status_code == 400
    assert token not in raised.value.detail


def test_reset_password_consumes_token_once(recovery_db):
    user_id = add_user(recovery_db)
    add_token(recovery_db, user_id, "single-use-token")

    with Session(recovery_db) as db:
        response = AuthService.reset_password("single-use-token", "new-password", db)
    assert response["success"] is True

    with Session(recovery_db) as db:
        user = db.get(User, user_id)
        reset_token = db.query(PasswordResetToken).one()
        assert auth_service_module.verify_password("new-password", user.hashed_password)
        assert reset_token.used is True
        with pytest.raises(HTTPException) as raised:
            AuthService.reset_password("single-use-token", "another-password", db)
        assert raised.value.status_code == 400


def test_reset_password_rolls_back_token_and_password_on_failure(recovery_db):
    user_id = add_user(recovery_db)
    add_token(recovery_db, user_id, "rollback-token")
    db = Session(recovery_db)

    with patch(
        "app.services.auth_service.get_password_hash",
        side_effect=RuntimeError("hash failure"),
    ):
        with pytest.raises(RuntimeError):
            AuthService.reset_password("rollback-token", "new-password", db)
    db.close()

    with Session(recovery_db) as check:
        user = check.get(User, user_id)
        reset_token = check.query(PasswordResetToken).one()
        assert auth_service_module.verify_password("old-password", user.hashed_password)
        assert reset_token.used is False


def test_concurrent_reset_attempts_have_exactly_one_success(recovery_db):
    user_id = add_user(recovery_db)
    add_token(recovery_db, user_id, "concurrent-token")
    barrier = Barrier(2)

    def consume(password):
        with Session(recovery_db) as db:
            barrier.wait()
            try:
                AuthService.reset_password("concurrent-token", password, db)
                return "success"
            except HTTPException:
                return "rejected"

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(consume, ("password-one", "password-two")))

    assert results.count("success") == 1
    assert results.count("rejected") == 1
    with Session(recovery_db) as db:
        user = db.get(User, user_id)
        reset_token = db.query(PasswordResetToken).one()
        assert reset_token.used is True
        assert auth_service_module.verify_password("password-one", user.hashed_password) or \
            auth_service_module.verify_password("password-two", user.hashed_password)


def test_delivery_error_does_not_expose_token_or_leave_it_usable(recovery_db, caplog):
    add_user(recovery_db)
    delivered_tokens = []

    class FailingDelivery:
        def send_password_reset(self, email, token):
            delivered_tokens.append(token)
            raise RuntimeError(f"delivery failed for token {token}")

    service = AuthService(password_reset_delivery=FailingDelivery())
    with Session(recovery_db) as db:
        response = service.request_password_reset("user@example.com", db)

    assert response == {
        "message": (
            "La solicitud se recibió. Si la dirección corresponde a una cuenta y el mensaje "
            "puede entregarse, recibirás instrucciones. Esta respuesta no confirma el envío."
        )
    }
    assert "delivery failed" in caplog.text.lower()
    assert delivered_tokens[0] not in caplog.text
    assert "delivery failure for token" not in caplog.text
    with Session(recovery_db) as db:
        saved = db.query(PasswordResetToken).one()
        assert saved.used is True
