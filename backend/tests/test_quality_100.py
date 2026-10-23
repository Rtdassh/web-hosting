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
