from pathlib import Path
import io
import zipfile
from types import SimpleNamespace
from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException, UploadFile
from app.core.config import settings
from app.models.instance import InstanceStatus
from app.models.user import UserRole
from app.services import site_release_service as module
from app.services.site_release_service import SiteReleaseService
from app.services.site_monitor_service import SiteMonitorService, summarize_access_logs
from app.services.site_storage_service import atomic_json, site_data_dir


def upload(content='new', filename='index.html'):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w') as archive:
        archive.writestr(filename, content)
    stream.seek(0)
    return UploadFile(file=stream, filename='dist.zip')


@pytest.fixture
def site(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, 'HOSTING_STORAGE_PATH', str(tmp_path))
    root = tmp_path / 'original'
    root.mkdir()
    (root / 'index.html').write_text('original')
    instance = SimpleNamespace(id=70, user_id=4, uuid='testuuid', container_id='old',
        storage_path=str(root), status=InstanceStatus.RUNNING, assigned_port=30001,
        public_url='http://localhost:30001')
    user = SimpleNamespace(id=4, role=UserRole.CLIENT)
    plan = SimpleNamespace(max_ram_mb=128, cpu_quota=0.25)
    db = MagicMock()
    db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = instance
    monkeypatch.setattr(module, 'require_current_subscription_plan', lambda sub: plan)
    docker = MagicMock()
    docker.run_nginx_instance.return_value = 'candidate'
    docker.stop_instance.return_value = True
    docker.start_instance.return_value = True
    docker.remove_instance.return_value = True
    monkeypatch.setattr(module, 'docker_service', docker)
    monkeypatch.setattr(module.site_monitor_service, 'probe', lambda port: {'status': 'up'})
    return SiteReleaseService(), instance, user, db, docker


def test_update_and_rollback_preserve_url_and_original(site):
    service, instance, user, db, docker = site
    versions = service.publish(instance.id, user, db, file=upload())
    assert len(versions) == 2
    assert sum(v['active'] for v in versions) == 1
    assert instance.public_url == 'http://localhost:30001'
    assert instance.assigned_port == 30001
    assert (Path(instance.storage_path) / 'index.html').read_text() == 'new'
    original = next(v for v in versions if not v['active'])
    service.publish(instance.id, user, db, version_id=original['id'])
    assert (Path(instance.storage_path) / 'index.html').read_text() == 'original'
    assert docker.remove_instance.call_count == 2


def test_invalid_zip_never_stops_original(site):
    service, instance, user, db, docker = site
    with pytest.raises(HTTPException) as failure:
        service.publish(instance.id, user, db, file=upload(filename='../evil.html'))
    assert failure.value.status_code == 400
    docker.stop_instance.assert_not_called()
    assert instance.container_id == 'old'


def test_other_user_cannot_read_or_publish(site):
    service, instance, user, db, docker = site
    user.id = 999
    with pytest.raises(HTTPException) as failure:
        service.publish(instance.id, user, db, file=upload())
    assert failure.value.status_code == 403
    docker.stop_instance.assert_not_called()


def test_docker_failure_restores_old_container(site):
    service, instance, user, db, docker = site
    original_path = instance.storage_path
    docker.run_nginx_instance.side_effect = RuntimeError('start failure')
    with pytest.raises(HTTPException) as failure:
        service.publish(instance.id, user, db, file=upload())
    assert failure.value.status_code == 503
    docker.start_instance.assert_called_with('old')
    assert instance.storage_path == original_path
    assert not (site_data_dir(instance) / 'handover.json').exists()


def test_commit_failure_restores_old_container(site):
    service, instance, user, db, docker = site
    db.commit.side_effect = RuntimeError('database failure')
    with pytest.raises(HTTPException):
        service.publish(instance.id, user, db, file=upload())
    docker.start_instance.assert_called_with('old')
    assert instance.container_id == 'old'


def test_stopped_site_remains_stopped(site):
    service, instance, user, db, docker = site
    instance.status = InstanceStatus.STOPPED
    service.publish(instance.id, user, db, file=upload())
    docker.stop_instance.assert_any_call('candidate')
    assert instance.status == InstanceStatus.STOPPED


def test_retention_and_cross_site_path_protection(site, monkeypatch):
    service, instance, user, db, docker = site
    monkeypatch.setattr(settings, 'RELEASES_RETAINED', 2)
    service.publish(instance.id, user, db, file=upload('one'))
    versions = service.publish(instance.id, user, db, file=upload('two'))
    assert len(versions) == 2
    with pytest.raises(HTTPException) as failure:
        service.publish(instance.id, user, db, version_id='../../another-site')
    assert failure.value.status_code == 400


def test_worker_can_recover_interrupted_switch(site):
    service, instance, user, db, docker = site
    atomic_json(site_data_dir(instance) / 'handover.json', {
        'old_container': 'old', 'new_name': 'uncommitted', 'target_path': 'new-path', 'was_running': True})
    service.recover(instance)
    docker.remove_instance.assert_called_with('uncommitted')
    docker.start_instance.assert_called_with('old')


def test_recovery_after_commit_keeps_new_version(site):
    service, instance, user, db, docker = site
    atomic_json(site_data_dir(instance) / 'handover.json', {
        'old_container': 'obsolete', 'new_name': 'current',
        'target_path': instance.storage_path, 'was_running': True})
    service.recover(instance)
    docker.remove_instance.assert_called_once_with('obsolete')
    docker.start_instance.assert_not_called()


def test_monitor_persistence_retention_and_exclusion_of_stopped(site, monkeypatch):
    _, instance, *_ = site
    monitor = SiteMonitorService()
    monkeypatch.setattr(settings, 'MONITOR_SAMPLES', 10)
    monkeypatch.setattr(monitor, 'probe', lambda port: {'status': 'up', 'http_status': 200, 'latency_ms': 1})
    monitor.capture(instance)
    instance.status = InstanceStatus.STOPPED
    for _ in range(12):
        monitor.capture(instance)
    report = SiteMonitorService().report(instance)
    assert report['samples'] == 10
    assert report['latest']['status'] == 'stopped'
    assert report['availability_percent'] is None
    assert not report['stale']


def test_monitor_refuses_non_hosting_ports():
    with pytest.raises(ValueError):
        SiteMonitorService().probe(5432)


def test_traffic_counts_bytes_and_errors_but_not_monitor_or_noise():
    report = summarize_access_logs([
        '127.0.0.1 - - [time] "GET / HTTP/1.1" 200 321 "-" "agent"',
        '127.0.0.1 - - [time] "GET /missing.js HTTP/1.1" 404 12 "-" "agent"',
        '127.0.0.1 - - [time] "HEAD / HTTP/1.1" 200 0 "-" "Codrop-Monitor/1.0"',
        'nginx starting',
    ])
    assert report['requests'] == 2
    assert report['response_body_bytes'] == 333
    assert report['errors'] == 1
