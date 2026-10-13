"""
Pruebas unitarias para los módulos refactorizados:
- app.core.hashing (Hashing puro de contraseñas)
- app.core.exceptions (Jerarquía de excepciones de dominio)
- app.services.auth_service (AuthService - Single Responsibility)
- app.services.instance_service (InstanceService - Inyección de dependencias)
"""
import pytest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.core.hashing import get_password_hash, verify_password
from app.core.exceptions import (
    DomainError,
    DockerUnavailableError,
    ContainerNotFoundError,
    ContainerMockError,
    DockerOperationError
)
from app.models.user import UserRole
from app.models.instance import InstanceStatus
from app.schemas.user_schema import UserCreate, UserLogin
from app.services.auth_service import AuthService
from app.services.instance_service import InstanceService


# ==============================================================================
# 1. Pruebas de app.core.hashing
# ==============================================================================
def test_password_hashing_and_verification():
    raw_password = "SecurePassword123!"
    hashed = get_password_hash(raw_password)

    assert hashed != raw_password
    assert hashed.startswith("$2")
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


# ==============================================================================
# 2. Pruebas de app.core.exceptions
# ==============================================================================
def test_domain_exceptions_hierarchy_and_status_codes():
    exc_503 = DockerUnavailableError("Docker is down")
    assert isinstance(exc_503, DomainError)
    assert isinstance(exc_503, HTTPException)
    assert exc_503.status_code == 503
    assert exc_503.detail == "Docker is down"

    exc_404_not_found = ContainerNotFoundError()
    assert exc_404_not_found.status_code == 404

    exc_404_mock = ContainerMockError()
    assert exc_404_mock.status_code == 404

    exc_operation = DockerOperationError()
    assert exc_operation.status_code == 503


# ==============================================================================
# 3. Pruebas de app.services.auth_service (AuthService)
# ==============================================================================
def test_auth_service_register_success():
    db = MagicMock(name="db_session")
    # No existing user
    db.query.return_value.filter.return_value.first.side_effect = [
        None,  # User check
        SimpleNamespace(id=1, name="Free")  # Plan check
    ]

    user_in = UserCreate(
        email="test@example.com",
        password="password123",
        full_name="Test User"
    )

    created_user = AuthService.register_user(user_in, db)
    assert created_user.email == "test@example.com"
    assert created_user.full_name == "Test User"
    assert created_user.role == UserRole.CLIENT
    assert verify_password("password123", created_user.hashed_password) is True
    assert db.add.call_count >= 1
    assert db.commit.call_count >= 1


def test_auth_service_register_duplicate_email_raises_400():
    db = MagicMock(name="db_session")
    db.query.return_value.filter.return_value.first.return_value = SimpleNamespace(id=1)

    user_in = UserCreate(
        email="duplicate@example.com",
        password="password123",
        full_name="Duplicate User"
    )

    with pytest.raises(HTTPException) as exc_info:
        AuthService.register_user(user_in, db)
    assert exc_info.value.status_code == 400
    assert "ya existe un usuario" in exc_info.value.detail.lower()


def test_auth_service_authenticate_user_success():
    db = MagicMock(name="db_session")
    hashed = get_password_hash("mysecretpass")
    mock_user = SimpleNamespace(
        id=42,
        email="login@test.com",
        hashed_password=hashed,
        is_active=True,
        role=UserRole.CLIENT
    )
    db.query.return_value.filter.return_value.first.return_value = mock_user

    login_data = UserLogin(email="login@test.com", password="mysecretpass")
    result = AuthService.authenticate_user(login_data, db)

    assert "access_token" in result
    assert result["token_type"] == "bearer"
    assert result["user"].id == 42


def test_auth_service_authenticate_user_invalid_password_raises_401():
    db = MagicMock(name="db_session")
    hashed = get_password_hash("correctpass")
    mock_user = SimpleNamespace(
        id=42,
        email="login@test.com",
        hashed_password=hashed,
        is_active=True,
        role=UserRole.CLIENT
    )
    db.query.return_value.filter.return_value.first.return_value = mock_user

    login_data = UserLogin(email="login@test.com", password="wrongpassword")
    with pytest.raises(HTTPException) as exc_info:
        AuthService.authenticate_user(login_data, db)
    assert exc_info.value.status_code == 401


def test_auth_service_authenticate_inactive_user_raises_400():
    db = MagicMock(name="db_session")
    hashed = get_password_hash("correctpass")
    mock_user = SimpleNamespace(
        id=42,
        email="inactive@test.com",
        hashed_password=hashed,
        is_active=False,
        role=UserRole.CLIENT
    )
    db.query.return_value.filter.return_value.first.return_value = mock_user

    login_data = UserLogin(email="inactive@test.com", password="correctpass")
    with pytest.raises(HTTPException) as exc_info:
        AuthService.authenticate_user(login_data, db)
    assert exc_info.value.status_code == 400


def test_auth_service_get_user_profile():
    db = MagicMock(name="db_session")
    user = SimpleNamespace(
        id=10,
        email="profile@test.com",
        full_name="Profile User",
        role=UserRole.CLIENT,
        is_active=True,
        created_at="2026-10-12T00:00:00Z"
    )
    plan = SimpleNamespace(
        name="Developer",
        max_instances=3,
        max_ram_mb=256,
        cpu_quota=0.5
    )
    sub = SimpleNamespace(plan=plan)
    db.query.return_value.filter.return_value.first.return_value = sub
    db.query.return_value.filter.return_value.count.return_value = 1

    profile = AuthService.get_user_profile(user, db)
    assert profile["email"] == "profile@test.com"
    assert profile["plan"].name == "Developer"
    assert profile["plan"].active_instances == 1
    assert profile["plan"].available_slots == 2


# ==============================================================================
# 4. Pruebas de app.services.instance_service (InstanceService)
# ==============================================================================
def test_instance_service_get_or_404():
    db = MagicMock(name="db_session")
    db.query.return_value.filter.return_value.first.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        InstanceService._get_instance_or_404(999, db)
    assert exc_info.value.status_code == 404


def test_instance_service_enforce_ownership():
    instance = SimpleNamespace(id=1, user_id=5)
    owner = SimpleNamespace(id=5, role=UserRole.CLIENT)
    non_owner = SimpleNamespace(id=6, role=UserRole.CLIENT)
    admin = SimpleNamespace(id=99, role=UserRole.ADMIN)

    # El dueño no debe lanzar excepción
    InstanceService._enforce_ownership(instance, owner)

    # El admin no debe lanzar excepción aunque no sea el dueño
    InstanceService._enforce_ownership(instance, admin)

    # Otro usuario debe recibir 403 Forbidden
    with pytest.raises(HTTPException) as exc_info:
        InstanceService._enforce_ownership(instance, non_owner)
    assert exc_info.value.status_code == 403


def test_instance_service_execute_action_unsupported():
    db = MagicMock(name="db_session")
    instance = SimpleNamespace(id=1, user_id=5, container_id="c1", status=InstanceStatus.RUNNING)
    db.query.return_value.filter.return_value.first.return_value = instance

    user = SimpleNamespace(id=5, role=UserRole.CLIENT)
    mock_audit = MagicMock()

    with pytest.raises(HTTPException) as exc_info:
        InstanceService.execute_action(
            1, "invalid_action", user, db, audit_fn=mock_audit
        )
    assert exc_info.value.status_code == 400
    mock_audit.assert_called_once_with(5, 1, "invalid_action", "failed")


def test_instance_service_execute_action_success_with_injected_docker():
    db = MagicMock(name="db_session")
    instance = SimpleNamespace(id=1, user_id=5, container_id="c1", status=InstanceStatus.STOPPED)
    db.query.return_value.filter.return_value.first.return_value = instance

    user = SimpleNamespace(id=5, role=UserRole.CLIENT)
    mock_docker = MagicMock()
    mock_docker.start_instance.return_value = True
    mock_audit = MagicMock()

    response = InstanceService.execute_action(
        1, "start", user, db, docker_svc=mock_docker, audit_fn=mock_audit
    )

    mock_docker.start_instance.assert_called_once_with("c1")
    assert instance.status == InstanceStatus.RUNNING
    assert response.status == InstanceStatus.RUNNING
    mock_audit.assert_called_once_with(5, 1, "start", "success")
    db.commit.assert_called_once()
