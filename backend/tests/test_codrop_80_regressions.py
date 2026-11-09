"""Integration regressions use a disposable SQLite DB or explicit inert doubles.
PostgreSQL migrations/triggers and real Docker are deliberately not emulated.
"""
import io
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace as NS
from unittest.mock import Mock

import pytest
import sqlalchemy as sa
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.models import Plan, Subscription, User, UserRole, Instance, InstanceStatus, PortAllocation
from app.services.auth_service import AuthService
from app.services.instance_service import InstanceService
from app.services.subscription_service import require_current_subscription_plan
from app.services.quota_service import validate_quota_downgrade
from app.services.docker_service import DockerService
from app.core.exceptions import DockerUnavailableError, DockerOperationError


@pytest.fixture
def db():
    engine = sa.create_engine('sqlite://', poolclass=StaticPool, connect_args={'check_same_thread': False})
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def add_account(db):
    user = User(email='regression@example.invalid', full_name='Synthetic', hashed_password='not-used', role=UserRole.CLIENT)
    free = Plan(name='Free', price=0, max_instances=1)
    pro = Plan(name='Pro', price=24.99, max_instances=10)
    db.add_all([user, free, pro]); db.flush()
    sub = Subscription(user_id=user.id, plan_id=free.id, status='active')
    db.add(sub); db.commit()
    return user, free, pro, sub


def add_site(db, user, number=1, state=InstanceStatus.STOPPED):
    site = Instance(uuid=f'regression-{number}', name='Synthetic', user_id=user.id,
        container_id=f'container-{number}', assigned_port=30000+number,
        public_url='http://example.invalid', storage_path='/unused', status=state)
    db.add(site); db.commit()
    return site


def test_stopped_sites_block_downgrade_and_start_when_over_quota(db):
    user, free, pro, sub = add_account(db)
    first = add_site(db, user)
    add_site(db, user, 2)
    with pytest.raises(HTTPException) as error:
        validate_quota_downgrade(db, user.id, free)
    assert error.value.status_code == 400
    docker = Mock()
    with pytest.raises(HTTPException):
        InstanceService.execute_action(first.id, 'start', user, db, docker_svc=docker)
    docker.start_instance.assert_not_called()


@pytest.mark.parametrize('action', ['start', 'restart'])
def test_expired_subscription_rejected_before_docker(db, action):
    user, free, pro, sub = add_account(db)
    sub.plan_id = pro.id
    sub.current_period_end = datetime.now(timezone.utc)-timedelta(seconds=1)
    db.commit()
    site = add_site(db, user)
    docker = Mock()
    with pytest.raises(HTTPException) as error:
        InstanceService.execute_action(site.id, action, user, db, docker_svc=docker)
    assert error.value.status_code == 403
    assert not docker.mock_calls


def test_disabled_free_rejected():
    with pytest.raises(HTTPException):
        require_current_subscription_plan(NS(status='active', plan=NS(name='Free', is_active=False)))


def test_template_requires_subscription_before_allocating(db, monkeypatch):
    from app.services import template_service as module
    user = User(id=777)
    db.add(Plan(name='Free', price=0)); db.commit()
    reserve = Mock()
    monkeypatch.setattr(module.port_service, 'get_and_reserve_available_port', reserve)
    with pytest.raises(HTTPException) as error:
        module.template_service.deploy_template(user, 'test', 'landing-business', db)
    assert error.value.status_code == 403
    reserve.assert_not_called()


def test_profile_exposes_expired_period(db):
    user, free, pro, sub = add_account(db)
    sub.plan_id = pro.id
    sub.current_period_end = datetime.now(timezone.utc)-timedelta(days=1)
    db.commit()
    profile = AuthService.get_user_profile(user, db)
    assert profile['plan'].is_current is False
    assert profile['plan'].current_period_end is not None


def test_verification_token_never_verifies_arbitrary_user():
    db = Mock()
    db.execute.return_value.scalar_one_or_none.return_value = None
    with pytest.raises(HTTPException) as error:
        AuthService.verify_email('invalid-token', db)
    assert error.value.status_code == 400
    db.rollback.assert_called_once()


@pytest.mark.parametrize('action', ['start_instance', 'stop_instance', 'restart_instance'])
def test_docker_unavailable_cannot_report_success(action):
    docker = DockerService.__new__(DockerService); docker.client = None
    assert getattr(docker, action)('real-container') is False
    assert docker.get_container_status('real-container') == 'error'


def test_docker_unavailable_never_creates_mock_container():
    docker = DockerService.__new__(DockerService); docker.client = None
    with pytest.raises(DockerUnavailableError):
        docker.run_nginx_instance('synthetic', 30001, '/unused')


def test_missing_hardened_image_does_not_fall_back_to_incompatible_stock():
    from docker.errors import NotFound
    docker = DockerService.__new__(DockerService); docker.client = Mock()
    docker.client.images.get.side_effect = NotFound('synthetic')
    with pytest.raises(DockerOperationError):
        docker._resolve_image()
    docker.client.containers.run.assert_not_called()


@pytest.mark.parametrize('failure,removal', [('mkdir',True), ('flush',True), ('commit',True), ('link',True), ('commit',False)])
def test_zip_failure_compensates_after_rollback(tmp_path, monkeypatch, failure, removal):
    from app.services import instance_service as module
    settings = NS(RESOLVED_STORAGE_PATH=tmp_path, HOST_PUBLIC_IP='127.0.0.1')
    monkeypatch.setattr(module, 'settings', settings)
    docker, ports, db = Mock(), Mock(), Mock()
    monkeypatch.setattr(module, 'docker_service', docker)
    monkeypatch.setattr(module, 'port_service', ports)
    monkeypatch.setattr(module.artifact_service, 'sanitize_and_extract_zip', Mock())
    plan=NS(name='Free',max_instances=1,max_ram_mb=128,cpu_quota=.25)
    db.query.return_value.filter.return_value.first.return_value=NS(status='active',plan=plan)
    db.query.return_value.filter.return_value.count.return_value=0
    ports.get_and_reserve_available_port.return_value=30001
    docker.run_nginx_instance.return_value='synthetic-container'
    docker.remove_instance.return_value=removal
    if failure in ('flush','commit'):
        getattr(db,failure).side_effect=RuntimeError('synthetic failure')
    if failure=='link': ports.link_instance_to_port.side_effect=RuntimeError('synthetic link failure')
    if failure=='mkdir': monkeypatch.setattr(Path,'mkdir',Mock(side_effect=PermissionError('synthetic')))
    def release(*args): assert db.rollback.call_count >= 1
    ports.release_port.side_effect=release
    with pytest.raises(HTTPException):
        InstanceService.deploy('test',Mock(),NS(id=1),db)
    db.rollback.assert_called()
    if removal:
        ports.release_port.assert_called_once()
        if failure!='mkdir': assert list(tmp_path.iterdir())==[]
    else:
        ports.release_port.assert_not_called()
        assert list(tmp_path.iterdir())


def test_collision_with_existing_storage_does_not_delete_it(tmp_path, monkeypatch):
    from app.services import instance_service as module
    existing=tmp_path/'1_fixed123'; existing.mkdir(); (existing/'index.html').write_text('existing')
    monkeypatch.setattr(module,'settings',NS(RESOLVED_STORAGE_PATH=tmp_path))
    monkeypatch.setattr(module.uuid,'uuid4',lambda:'fixed123')
    monkeypatch.setattr(module,'port_service',Mock())
    db=Mock(); db.query.return_value.filter.return_value.first.return_value=NS(status='active',plan=NS(name='Free',max_instances=1,max_ram_mb=128,cpu_quota=.25))
    db.query.return_value.filter.return_value.count.return_value=0
    with pytest.raises(HTTPException): InstanceService.deploy('test',Mock(),NS(id=1),db)
    assert (existing/'index.html').read_text()=='existing'


def test_port_link_can_join_existing_transaction(db):
    from app.services.port_service import PortService
    user, *_ = add_account(db); site=add_site(db,user)
    db.add(PortAllocation(port_number=30001,is_allocated=True)); db.commit()
    PortService.link_instance_to_port(db,30001,site.id,commit=False)
    db.rollback()
    assert db.get(PortAllocation,30001).instance_id is None


def test_host_collector_is_in_backend_package_and_unavailable_is_not_healthy(tmp_path, monkeypatch):
    from app.services import host_metrics
    monkeypatch.setattr(host_metrics,'docker',None)
    monkeypatch.setattr(host_metrics,'_get_docker_stats_cli',lambda:{'available':False,'total':0,'running':0})
    metrics=host_metrics.get_host_metrics(str(tmp_path))
    assert metrics['docker_available'] is False
    assert metrics['containers_running']==0


def test_isolated_application_flow_to_http_200(db, tmp_path, monkeypatch):
    """Real API/SQLAlchemy/ZIP/HTTP; Docker replaced by a Python static server.
    This does NOT certify PostgreSQL migrations, Docker or Nginx permissions.
    """
    import socket
    import threading
    import urllib.request
    from functools import partial
    from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
    from app.main import app
    from app.core.rate_limit import RateLimitMiddleware
    from app.services.auth_service import auth_service
    from app.services import instance_service as module
    RateLimitMiddleware.reset_limits()
    free=Plan(name='Free',price=0,max_instances=1)
    pro=Plan(name='Pro',price=24.99,max_instances=10)
    db.add_all([free,pro]); db.commit()
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0)); available_port=sock.getsockname()[1]
    db.add(PortAllocation(port_number=available_port,is_allocated=False)); db.commit()
    monkeypatch.setattr(module,'settings',NS(RESOLVED_STORAGE_PATH=tmp_path,HOST_PUBLIC_IP='127.0.0.1'))
    class CapturingDelivery:
        def __init__(self):
            self.tokens = []
        def send_email_verification(self, email, token):
            self.tokens.append((email, token))
    delivery = CapturingDelivery()
    monkeypatch.setattr(auth_service, 'password_reset_delivery', delivery)
    servers=[]
    def serve(**kwargs):
        server=ThreadingHTTPServer(('127.0.0.1',kwargs['host_port']),partial(SimpleHTTPRequestHandler,directory=kwargs['host_storage_path']))
        thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
        servers.append((server,thread))
        return 'docker-double-static-http'
    monkeypatch.setattr(module.docker_service,'run_nginx_instance',serve)
    app.dependency_overrides[get_db]=lambda: db
    try:
        with TestClient(app) as client:
            response=client.post('/api/v1/auth/register',json={'email':'flow@example.invalid','password':'SyntheticPass123!','full_name':'Synthetic Flow'})
            assert response.status_code==201,response.text
            assert response.json()['is_verified'] is False
            delivered_email, verification_token = delivery.tokens[0]
            assert delivered_email == 'flow@example.invalid'
            verified=client.get('/api/v1/auth/verify-email',params={'token':verification_token})
            assert verified.status_code==200,verified.text
            assert verified.json()['is_verified'] is True
            response=client.post('/api/v1/auth/login',json={'email':'flow@example.invalid','password':'SyntheticPass123!'})
            assert response.status_code==200,response.text
            client.headers['Authorization']='Bearer '+response.json()['access_token']
            assert client.get('/api/v1/auth/me').json()['plan']['name']=='Free'
            response=client.post('/api/v1/billing/checkout',json={'plan_id':pro.id,'card_holder':'Synthetic Customer','card_number':'4111111111111111','exp_month':12,'exp_year':2040,'cvv':'123'})
            assert response.status_code==200,response.text
            receipt=response.json()
            invoices=client.get('/api/v1/billing/invoices').json()
            assert len(invoices)==1
            assert invoices[0]['invoice_number']==receipt['invoice_number']
            assert invoices[0]['amount']==receipt['amount_charged']==24.99
            assert client.post('/api/v1/subscriptions/change-plan',json={'target_plan_id':free.id}).status_code==200
            content=io.BytesIO()
            with zipfile.ZipFile(content,'w') as zipped: zipped.writestr('index.html','<h1>Codrop isolated flow</h1>')
            response=client.post('/api/v1/instances/deploy',data={'name':'Isolated flow'},files={'file':('site.zip',content.getvalue(),'application/zip')})
            assert response.status_code==201,response.text
            site=response.json()
            opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
            with opener.open(site['public_url'],timeout=5) as page:
                assert page.status==200
                assert b'Codrop isolated flow' in page.read()
            assert db.query(Instance).count()==1
            assert db.get(PortAllocation,available_port).instance_id==site['id']
    finally:
        app.dependency_overrides.pop(get_db,None)
        RateLimitMiddleware.reset_limits()
        for server,thread in servers:
            server.shutdown(); server.server_close(); thread.join(timeout=3)


def test_failed_site_cannot_be_restarted_into_extra_slot(db):
    user, free, *_ = add_account(db)
    add_site(db,user)
    failed=add_site(db,user,2,InstanceStatus.FAILED)
    docker=Mock()
    with pytest.raises(HTTPException):
        InstanceService.execute_action(failed.id,'restart',user,db,docker_svc=docker)
    assert not docker.mock_calls


def test_real_sqlalchemy_failed_flush_can_release_reserved_port(db,tmp_path,monkeypatch):
    from app.services import instance_service as module
    from app.services.port_service import PortService
    user, *_ = add_account(db)
    existing=add_site(db,user,2,InstanceStatus.FAILED)
    existing.uuid='fixed123'
    db.add(PortAllocation(port_number=30001,is_allocated=True)); db.commit()
    monkeypatch.setattr(module,'settings',NS(RESOLVED_STORAGE_PATH=tmp_path,HOST_PUBLIC_IP='127.0.0.1'))
    monkeypatch.setattr(module.uuid,'uuid4',lambda:'fixed123')
    ports=Mock(); ports.get_and_reserve_available_port.return_value=30001
    ports.release_port.side_effect=lambda sess,port: PortService.release_port(sess,port)
    monkeypatch.setattr(module,'port_service',ports)
    docker=Mock(); docker.run_nginx_instance.return_value='synthetic'; docker.remove_instance.return_value=True
    monkeypatch.setattr(module,'docker_service',docker)
    monkeypatch.setattr(module.artifact_service,'sanitize_and_extract_zip',Mock())
    with pytest.raises(HTTPException): InstanceService.deploy('test',Mock(),user,db)
    assert db.get(PortAllocation,30001).is_allocated is False
    assert db.query(Instance).count()==1
    assert list(tmp_path.iterdir())==[]
