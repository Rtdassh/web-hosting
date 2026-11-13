from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.v1.api import api_router
from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin, get_current_client
from app.models.user import UserRole
from app.schemas.admin_schema import AdminInstanceResponse, ForceActionRequest
from app.services.admin_service import AdminService
from app.services.instance_service import InstanceService


@pytest.mark.parametrize('method,path', [
    ('GET', '/instances'), ('GET', '/instances/1/metrics'),
    ('GET', '/instances/1/logs'), ('GET', '/instances/1/versions'),
    ('GET', '/instances/1/files'), ('GET', '/instances/1/backup'),
    ('POST', '/instances/1/action'), ('POST', '/instances/1/sync'),
    ('POST', '/instances/deploy'), ('PATCH', '/instances/1'),
    ('GET', '/instances/1/files/download?path=index.html'),
    ('GET', '/instances/1/activity'), ('GET', '/instances/1/insights'),
    ('GET', '/instances/health'), ('POST', '/instances/1/versions'),
    ('POST', '/instances/1/versions/version/restore'),
    ('DELETE', '/instances/1'), ('GET', '/billing/invoices'),
    ('POST', '/billing/checkout'), ('POST', '/subscriptions/change-plan'),
])
def test_admin_cannot_use_client_endpoints(method, path):
    app = FastAPI()
    app.include_router(api_router)
    db = MagicMock()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1, role=UserRole.ADMIN)
    app.dependency_overrides[get_db] = lambda: db
    response = TestClient(app).request(method, path)
    assert response.status_code == 403
    db.query.assert_not_called()


@pytest.mark.parametrize('path', ['/admin/dashboard', '/admin/instances'])
def test_client_cannot_access_admin(path):
    app = FastAPI()
    app.include_router(api_router)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1, role=UserRole.CLIENT)
    app.dependency_overrides[get_db] = lambda: MagicMock()
    assert TestClient(app).get(path).status_code == 403


def test_service_never_grants_admin_ownership_even_of_own_instance():
    from fastapi import HTTPException
    admin = SimpleNamespace(id=1, role=UserRole.ADMIN)
    with pytest.raises(HTTPException) as error:
        InstanceService._enforce_ownership(SimpleNamespace(user_id=1), admin)
    assert error.value.status_code == 403
    with pytest.raises(HTTPException):
        InstanceService.list_instances(admin, MagicMock())


def test_admin_metadata_excludes_private_data():
    db = MagicMock()
    db.query.return_value.order_by.return_value.all.return_value = [SimpleNamespace(id=2, name='sitio', user_id=8, status='running')]
    data = AdminService().list_all_instances(db)
    assert data == [{'id': 2, 'name': 'sitio', 'owner_id': 8, 'status': 'running'}]
    assert set(AdminInstanceResponse.model_fields) == {'id', 'name', 'owner_id', 'status'}


@pytest.mark.parametrize('payload', [
    {'action': 'start', 'reason': 'motivo'},
    {'action': 'restart', 'reason': 'motivo'},
    {'action': 'force_stop'},
    {'action': 'force_destroy', 'reason': '   '},
    {'action': 'force_destroy', 'reason': 'a' * 501},
])
def test_only_stop_destroy_with_explicit_reason(payload):
    with pytest.raises(ValidationError):
        ForceActionRequest(**payload)
