import io
import zipfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from app.core.config import settings
from app.models.instance import InstanceStatus
from app.models.user import UserRole
from app.schemas.site_management_schema import SiteRenameRequest
from app.services.site_management_service import SiteManagementService


@pytest.fixture
def site(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, 'HOSTING_STORAGE_PATH', str(tmp_path))
    root = tmp_path / 'my-site'
    root.mkdir()
    (root / 'index.html').write_text('<h1>Original</h1>')
    (root / 'assets').mkdir()
    (root / 'assets/main.js').write_text('console.log(1)')
    instance = SimpleNamespace(id=77, name='Before', user_id=4, status=InstanceStatus.RUNNING,
        public_url='http://localhost:30001', container_id='unchanged', storage_path=str(root))
    user = SimpleNamespace(id=4, role=UserRole.CLIENT)
    db = MagicMock()
    db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = instance
    return SiteManagementService(), instance, user, db


def test_rename_preserves_url_files_and_records_activity(site):
    service, instance, user, db = site
    result = service.rename(77, 'After', user, db)
    assert result.name == 'After'
    assert result.public_url == 'http://localhost:30001'
    assert result.container_id == 'unchanged'
    event = db.add.call_args.args[0]
    assert event.instance_id == 77
    assert event.reason == 'Nombre del proyecto actualizado'
    db.commit.assert_called_once()


def test_other_user_cannot_rename(site):
    service, instance, user, db = site
    user.id = 999
    with pytest.raises(HTTPException) as failure:
        service.rename(77, 'Unwanted', user, db)
    assert failure.value.status_code == 403
    db.commit.assert_not_called()
    assert instance.name == 'Before'


@pytest.mark.parametrize('name', ['', ' ', 'x' * 101, 'bad\nname', 'bad\x00name'])
def test_invalid_names_rejected_before_io(name):
    with pytest.raises(ValidationError):
        SiteRenameRequest(name=name)


def test_trimmed_name():
    assert SiteRenameRequest(name='  My portfolio  ').name == 'My portfolio'


def test_files_are_scoped_paginated_and_sizes_are_real(site):
    service, instance, *_ = site
    report = service.files(instance, '', 0, 1)
    assert report['entries'][0]['kind'] == 'directory'
    assert report['total_entries'] == 2
    assert report['total_files'] == 2
    expected = sum(p.stat().st_size for p in Path(instance.storage_path).rglob('*') if p.is_file())
    assert report['size_bytes'] == expected
    nested = service.files(instance, 'assets', 0, 50)
    assert [entry['path'] for entry in nested['entries']] == ['assets/main.js']


@pytest.mark.parametrize('path', ['../other-site', '/etc/passwd', 'C:/secrets', 'assets/../../secrets', 'assets\\main.js', '\x00'])
def test_path_escape_is_rejected(site, path):
    service, instance, *_ = site
    with pytest.raises(HTTPException) as failure:
        service.files(instance, path, 0, 50)
    assert failure.value.status_code == 400


def test_backup_has_only_public_files_and_no_private_versions(site):
    service, instance, *_ = site
    private = settings.RESOLVED_STORAGE_PATH / '.site-data' / '77'
    private.mkdir(parents=True)
    (private / 'monitor.json').write_text('private')
    stream = service.backup(instance)
    try:
        with zipfile.ZipFile(stream) as archive:
            assert archive.read('index.html') == b'<h1>Original</h1>'
            assert archive.read('assets/main.js') == b'console.log(1)'
            assert not any('.site-data' in name for name in archive.namelist())
    finally:
        stream.close()


def test_scan_limit_prevents_unbounded_exports(site, monkeypatch):
    service, instance, *_ = site
    monkeypatch.setattr(settings, 'SITE_FILE_SCAN_LIMIT', 1)
    with pytest.raises(HTTPException) as failure:
        service.backup(instance)
    assert failure.value.status_code == 413


def test_symlinks_are_never_listed_or_exported(site, tmp_path):
    service, instance, *_ = site
    secret = tmp_path / 'private.txt'
    secret.write_text('private')
    try:
        (Path(instance.storage_path) / 'link.txt').symlink_to(secret)
    except OSError:
        pytest.skip('Symlink privilege unavailable on this host')
    with pytest.raises(HTTPException):
        service.files(instance, '', 0, 50)
    with pytest.raises(HTTPException):
        service.backup(instance)


def test_download_routes_authenticate_and_force_attachment(site):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.v1.instances import router
    from app.core.database import get_db
    from app.core.security import get_current_user
    service, instance, user, db = site
    app = FastAPI()
    app.include_router(router, prefix='/api/v1')
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    with TestClient(app) as client:
        response = client.get('/api/v1/instances/77/files/download', params={'path': 'index.html'})
        assert response.status_code == 200
        assert response.headers['content-type'] == 'application/octet-stream'
        assert response.headers['content-disposition'].startswith('attachment;')
        assert '<h1>Original</h1>' in response.text
        backup = client.get('/api/v1/instances/77/backup')
        assert backup.status_code == 200
        with zipfile.ZipFile(io.BytesIO(backup.content)) as archive:
            assert 'index.html' in archive.namelist()
        user.id = 999
        assert client.get('/api/v1/instances/77/backup').status_code == 403
        assert client.get('/api/v1/instances/77/files').status_code == 403
        assert client.get('/api/v1/instances/77/activity').status_code == 403
