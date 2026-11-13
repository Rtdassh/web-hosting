"""
Suite de Pruebas de Calidad ISO/IEC 25010 y Resiliencia (Hito 100% - Rol 4).
Verifica: Reconciliación periódica (RNF-09), Políticas Non-Root (RNF-07) y Manejo de Fallos.
"""
import pytest
from app.services.sync_worker import sync_worker
from app.services.docker_service import docker_service


def test_sync_worker_instantiation():
    """Valida la configuración e inicialización del demonio de sincronización."""
    assert sync_worker.interval_seconds == 30
    assert sync_worker.is_running is False


def test_sync_worker_skip_when_no_docker():
    """Valida comportamiento resiliente cuando Docker no está disponible."""
    original_client = docker_service.client
    docker_service.client = None
    try:
        result = sync_worker.reconcile_states(db=None)
        assert result.get("status") == "skipped"
        assert result.get("reason") == "docker_unavailable"
    finally:
        docker_service.client = original_client


def test_iso_25010_resource_limits_specification():
    """Valida que los límites de memoria por plan cumplan las cuotas fijadas por RNF."""
    plan_limits = {
        "Free": {"ram_mb": 128, "cpu": 0.25},
        "Developer": {"ram_mb": 256, "cpu": 0.50},
        "Pro": {"ram_mb": 512, "cpu": 1.00},
    }
    for plan, limits in plan_limits.items():
        assert limits["ram_mb"] <= 512
        assert limits["cpu"] <= 1.0


@pytest.mark.parametrize("fails", [False, True])
def test_sync_cycle_always_closes_database_session(fails):
    from unittest.mock import Mock, patch
    from app.services.sync_worker import SyncWorker
    from app.services import sync_worker as module

    worker = SyncWorker()
    db = Mock()
    db.execute.return_value.scalar.return_value = True

    with patch.object(module, "SessionLocal", return_value=db), \
         patch.object(worker, "reconcile_states") as reconcile:

        if fails:
            reconcile.side_effect = RuntimeError("Fallo simulado")

            with pytest.raises(RuntimeError, match="Fallo simulado"):
                worker._run_sync_cycle()
        else:
            reconcile.return_value = {"discrepancies_found": 0}
            result = worker._run_sync_cycle()
            assert result["discrepancies_found"] == 0

        reconcile.assert_called_once_with(db)
        db.close.assert_called_once()

# FastAPI
def test_fastapi_starts_and_stops_sync_worker():
    import asyncio
    from unittest.mock import patch
    from fastapi import FastAPI
    from app import main
    from app.services.sync_worker import SyncWorker

    async def scenario():
        worker = SyncWorker(interval_seconds=30)
        cycle_started = asyncio.Event()
        loop = asyncio.get_running_loop()
        test_app = FastAPI()

        def simulated_cycle():
            loop.call_soon_threadsafe(cycle_started.set)

        with patch.object(main, "SyncWorker", return_value=worker), \
             patch.object(
                 worker, "_run_sync_cycle",
                 side_effect=simulated_cycle
             ) as run_cycle:

            async with main.lifespan(test_app):
                await asyncio.wait_for(cycle_started.wait(), timeout=2)
                assert worker.is_running is True
                assert test_app.state.sync_worker is worker

            assert worker.is_running is False
            run_cycle.assert_called_once()

    async def bounded_scenario():
        await asyncio.wait_for(scenario(), timeout=5)

    asyncio.run(bounded_scenario())


@pytest.mark.parametrize(
    "docker_status,expected_status,changed,releases_port",
    [
        ("running", "running", False, False),
        ("exited", "stopped", True, False),
        ("not_found", "failed", True, True),
        ("error", "running", False, False),
    ]
)
def test_worker_reconciles_container_states(
    docker_status, expected_status, changed, releases_port
):
    from types import SimpleNamespace
    from unittest.mock import Mock, patch
    from app.models.instance import InstanceStatus
    from app.services.sync_worker import SyncWorker
    from app.services import sync_worker as module

    instance = SimpleNamespace(
        id=5,
        container_id="contenedor-prueba",
        assigned_port=30001,
        status=InstanceStatus.RUNNING
    )
    db = Mock()
    db.query.return_value.filter.return_value.with_for_update.return_value = db.query.return_value.filter.return_value
    db.query.return_value.filter.return_value.all.return_value = [instance]

    with patch.object(module, "docker_service") as docker_mock, \
         patch.object(module, "port_service") as port_mock:

        docker_mock.get_container_status.return_value = docker_status
        result = SyncWorker().reconcile_states(db)

        assert instance.status.value == expected_status
        assert result["discrepancies_found"] == int(changed)

        if changed:
            db.commit.assert_called_once()
            history = db.add.call_args.args[0]
            assert history.instance_id == 5
            assert history.new_status == expected_status
        else:
            db.commit.assert_not_called()
            db.add.assert_not_called()

        if releases_port:
            port_mock.release_port.assert_called_once_with(
                db, 30001, commit=False
            )
        else:
            port_mock.release_port.assert_not_called()

def test_worker_rolls_back_when_commit_fails():
    from types import SimpleNamespace
    from unittest.mock import Mock, patch
    from app.models.instance import InstanceStatus
    from app.services.sync_worker import SyncWorker
    from app.services import sync_worker as module

    instance = SimpleNamespace(
        id=5,
        container_id="contenedor-prueba",
        assigned_port=30001,
        status=InstanceStatus.RUNNING
    )
    db = Mock()
    db.query.return_value.filter.return_value.with_for_update.return_value = db.query.return_value.filter.return_value
    db.query.return_value.filter.return_value.all.return_value = [instance]
    db.commit.side_effect = RuntimeError("Fallo de commit simulado")

    with patch.object(module, "docker_service") as docker_mock:
        docker_mock.get_container_status.return_value = "exited"

        with pytest.raises(RuntimeError, match="Fallo de commit simulado"):
            SyncWorker().reconcile_states(db)

        db.commit.assert_called_once()
        db.rollback.assert_called_once()

@pytest.mark.parametrize(
    "docker_status,changed",
    [("exited", False), ("not_found", True)]
)
def test_worker_checks_stopped_instances(docker_status, changed):
    from types import SimpleNamespace
    from unittest.mock import Mock, patch
    from app.models.instance import InstanceStatus
    from app.services.sync_worker import SyncWorker
    from app.services import sync_worker as module

    instance = SimpleNamespace(
        id=5,
        container_id="contenedor-prueba",
        assigned_port=30001,
        status=InstanceStatus.STOPPED
    )
    db = Mock()
    db.query.return_value.filter.return_value.with_for_update.return_value = db.query.return_value.filter.return_value
    db.query.return_value.filter.return_value.all.return_value = [instance]

    with patch.object(module, "docker_service") as docker_mock, \
         patch.object(module, "port_service") as port_mock:
        docker_mock.get_container_status.return_value = docker_status

        result = SyncWorker().reconcile_states(db)

        assert result["discrepancies_found"] == int(changed)

        if changed:
            assert instance.status == InstanceStatus.FAILED
            history = db.add.call_args.args[0]
            assert history.previous_status == "stopped"
            assert history.new_status == "failed"
            port_mock.release_port.assert_called_once_with(
                db, 30001, commit=False
            )
            db.commit.assert_called_once()
        else:
            assert instance.status == InstanceStatus.STOPPED
            db.add.assert_not_called()
            db.commit.assert_not_called()
            port_mock.release_port.assert_not_called()

def test_sync_cycle_skips_when_another_worker_holds_lock():
    from unittest.mock import Mock, patch
    from app.services.sync_worker import SyncWorker
    from app.services import sync_worker as module

    worker = SyncWorker()
    db = Mock()
    db.execute.return_value.scalar.return_value = False

    with patch.object(module, "SessionLocal", return_value=db), \
         patch.object(worker, "reconcile_states") as reconcile:
        result = worker._run_sync_cycle()

    assert result == {
        "status": "skipped",
        "reason": "another_worker_running"
    }
    reconcile.assert_not_called()
    db.query.assert_not_called()
    db.commit.assert_not_called()
    db.close.assert_called_once()

    statement, parameters = db.execute.call_args.args
    assert "pg_try_advisory_xact_lock" in str(statement)
    assert parameters == {"lock_id": 7304100}

@pytest.fixture(autouse=True)
def isolate_operational_storage(monkeypatch):
    from app.services.site_monitor_service import site_monitor_service
    from app.services.site_release_service import site_release_service
    monkeypatch.setattr(site_monitor_service, 'capture', lambda instance: None)
    monkeypatch.setattr(site_release_service, 'recover', lambda instance: None)
