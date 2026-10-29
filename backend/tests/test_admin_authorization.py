from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.admin import admin_service, router as admin_router
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.schemas.admin_schema import AdminDashboardResponse, AdminInstanceResponse


ADMIN_ENDPOINTS = (
    ("get", "/api/v1/admin/dashboard"),
    ("get", "/api/v1/admin/instances"),
    (
        "post",
        "/api/v1/admin/instances/42/force-action",
        {"action": "force_stop", "reason": "synthetic test"},
    ),
)

DASHBOARD_RESPONSE = {
    "summary": {
        "total_users": 2,
        "total_revenue_simulated": 19.98,
        "total_instances": 3,
        "active_instances": 2,
        "stopped_instances": 1,
    },
    "host_resources": {
        "cpu_usage_percent": 12.5,
        "memory_used_mb": 2048.0,
        "memory_total_mb": 8192.0,
        "memory_usage_percent": 25.0,
        "storage_used_gb": 15.0,
        "storage_total_gb": 100.0,
        "storage_usage_percent": 15.0,
        "containers_running": 2,
        "containers_total": 3,
        "docker_available": True,
    },
}

INSTANCES_RESPONSE = [
    {
        "id": 42,
        "uuid": "synthetic-instance-uuid",
        "name": "Synthetic instance",
        "owner_email": "owner@example.invalid",
        "owner_name": "Synthetic owner",
        "plan_name": "Free",
        "assigned_port": 31042,
        "status": "RUNNING",
        "public_url": "http://localhost:31042",
        "container_id": "synthetic-container",
        "created_at": datetime(2026, 10, 28, tzinfo=timezone.utc).isoformat(),
    }
]

TEST_DB = object()


def _user(role: UserRole) -> User:
    return User(
        id=1,
        email="admin-test@example.invalid",
        hashed_password="synthetic-hash",
        full_name="Synthetic admin test",
        role=role,
        is_active=True,
    )


@pytest.fixture
def admin_client():
    app = FastAPI()
    app.include_router(admin_router, prefix="/api/v1")
    app.dependency_overrides[get_db] = lambda: TEST_DB
    with TestClient(app) as client:
        yield app, client
    app.dependency_overrides.clear()


@pytest.mark.parametrize("endpoint", ADMIN_ENDPOINTS)
def test_admin_endpoints_reject_unauthenticated_requests_without_calling_services(
    admin_client,
    endpoint,
):
    _, client = admin_client
    method, path, *body = endpoint
    with (
        patch.object(admin_service, "get_dashboard_data") as dashboard,
        patch.object(admin_service, "list_all_instances") as instances,
        patch.object(admin_service, "execute_force_action") as force_action,
    ):
        response = getattr(client, method)(
            path,
            **({"json": body[0]} if body else {}),
        )

    assert response.status_code in (401, 403)
    dashboard.assert_not_called()
    instances.assert_not_called()
    force_action.assert_not_called()


@pytest.mark.parametrize("endpoint", ADMIN_ENDPOINTS)
def test_client_role_is_forbidden_from_admin_endpoints_without_calling_services(
    admin_client,
    endpoint,
):
    app, client = admin_client
    app.dependency_overrides[get_current_user] = lambda: _user(UserRole.CLIENT)
    method, path, *body = endpoint
    with (
        patch.object(admin_service, "get_dashboard_data") as dashboard,
        patch.object(admin_service, "list_all_instances") as instances,
        patch.object(admin_service, "execute_force_action") as force_action,
    ):
        response = getattr(client, method)(
            path,
            **({"json": body[0]} if body else {}),
        )

    assert response.status_code == 403
    dashboard.assert_not_called()
    instances.assert_not_called()
    force_action.assert_not_called()


def test_admin_can_access_dashboard_and_response_matches_schema(admin_client):
    app, client = admin_client
    admin = _user(UserRole.ADMIN)
    app.dependency_overrides[get_current_user] = lambda: admin
    with patch.object(admin_service, "get_dashboard_data", return_value=DASHBOARD_RESPONSE) as service:
        response = client.get("/api/v1/admin/dashboard")

    assert response.status_code == 200
    assert AdminDashboardResponse.model_validate(response.json())
    service.assert_called_once_with(TEST_DB)


def test_admin_can_access_global_instances_and_response_matches_schema(admin_client):
    app, client = admin_client
    app.dependency_overrides[get_current_user] = lambda: _user(UserRole.ADMIN)
    with patch.object(admin_service, "list_all_instances", return_value=INSTANCES_RESPONSE) as service:
        response = client.get("/api/v1/admin/instances")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert AdminInstanceResponse.model_validate(payload[0])
    service.assert_called_once_with(TEST_DB)


def test_force_action_rejects_invalid_request_without_calling_service(admin_client):
    app, client = admin_client
    app.dependency_overrides[get_current_user] = lambda: _user(UserRole.ADMIN)
    with patch.object(admin_service, "execute_force_action") as service:
        response = client.post(
            "/api/v1/admin/instances/42/force-action",
            json={"reason": "missing action"},
        )

    assert response.status_code == 422
    service.assert_not_called()


def test_force_action_delegates_validated_request_to_service(admin_client):
    app, client = admin_client
    admin = _user(UserRole.ADMIN)
    app.dependency_overrides[get_current_user] = lambda: admin
    expected_response = {
        "message": "Synthetic delegated response",
        "action": "force_stop",
        "instance_id": 42,
        "audit_logged": True,
    }
    with patch.object(
        admin_service,
        "execute_force_action",
        return_value=expected_response,
    ) as service:
        response = client.post(
            "/api/v1/admin/instances/42/force-action",
            json={"action": "force_stop", "reason": "synthetic test"},
        )

    assert response.status_code == 200
    assert response.json() == expected_response
    service.assert_called_once_with(
        admin_user=admin,
        instance_id=42,
        action="force_stop",
        reason="synthetic test",
        db=TEST_DB,
    )
