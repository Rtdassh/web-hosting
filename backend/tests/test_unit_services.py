import pytest
from unittest.mock import MagicMock, patch
from pathlib import Path
import zipfile
import io

from app.schemas.instance_schema import (
    InstanceMetricsResponse,
    InstanceLogsResponse,
    InstanceSyncResponse,
    InstanceActionRequest,
)
from app.services.docker_service import DockerService
from app.services.artifact_service import ArtifactService


# ==============================================================================
# Pruebas Unitarias de Esquemas Pydantic DTO (Hito 50%)
# ==============================================================================
def test_instance_metrics_schema():
    payload = {
        "instance_id": 1,
        "status": "running",
        "cpu_percent": 1.25,
        "memory_usage_mb": 7.82,
        "memory_limit_mb": 128.0,
        "memory_percent": 6.11,
        "updated_at": "2026-10-07T12:00:00Z"
    }
    schema = InstanceMetricsResponse(**payload)
    assert schema.instance_id == 1
    assert schema.cpu_percent == 1.25
    assert schema.memory_usage_mb == 7.82
    assert schema.memory_limit_mb == 128.0
    assert schema.memory_percent == 6.11
    assert schema.status == "running"


def test_instance_logs_schema():
    payload = {
        "instance_id": 1,
        "container_id": "abcdef123456",
        "total_lines": 2,
        "lines": [
            "2026-10-07T12:00:00Z GET / 200 OK",
            "2026-10-07T12:00:01Z GET /style.css 200 OK"
        ]
    }
    schema = InstanceLogsResponse(**payload)
    assert schema.total_lines == 2
    assert len(schema.lines) == 2
    assert schema.container_id == "abcdef123456"


def test_instance_sync_schema():
    payload = {
        "instance_id": 1,
        "previous_status": "running",
        "current_status": "stopped",
        "synced": True
    }
    schema = InstanceSyncResponse(**payload)
    assert schema.instance_id == 1
    assert schema.previous_status == "running"
    assert schema.current_status == "stopped"
    assert schema.synced is True


# ==============================================================================
# Pruebas Unitarias de DockerService (T4.1, T4.2, T4.3)
# ==============================================================================
def test_docker_stats_mock_mode():
    service = DockerService()
    service.client = None  # Simular entorno sin daemon
    stats = service.get_container_stats("mock_container", ram_limit_mb=128.0)
    assert stats["status"] == "running"
    assert stats["memory_limit_mb"] == 128.0
    assert stats["memory_usage_mb"] == 6.8
    assert stats["memory_percent"] == 5.31


def test_docker_stats_stopped_container():
    service = DockerService()
    mock_container = MagicMock()
    mock_container.status = "exited"
    service.client = MagicMock()
    service.client.containers.get.return_value = mock_container

    stats = service.get_container_stats("c123", ram_limit_mb=256.0)
    assert stats["status"] == "exited"
    assert stats["cpu_percent"] == 0.0
    assert stats["memory_usage_mb"] == 0.0
    assert stats["memory_limit_mb"] == 256.0


def test_docker_stats_calculation():
    service = DockerService()
    mock_container = MagicMock()
    mock_container.status = "running"
    mock_container.stats.return_value = {
        "cpu_stats": {
            "cpu_usage": {"total_usage": 200000000, "percpu_usage": [100000000, 100000000]},
            "system_cpu_usage": 1000000000,
            "online_cpus": 2
        },
        "precpu_stats": {
            "cpu_usage": {"total_usage": 100000000},
            "system_cpu_usage": 500000000
        },
        "memory_stats": {
            "usage": 20 * 1024 * 1024,
            "stats": {"cache": 5 * 1024 * 1024}
        }
    }
    service.client = MagicMock()
    service.client.containers.get.return_value = mock_container

    stats = service.get_container_stats("c123", ram_limit_mb=128.0)
    assert stats["status"] == "running"
    # CPU delta: (100M / 500M) * 2 * 100 = 40.0%
    assert stats["cpu_percent"] == 40.0
    # Memory: (20MB - 5MB) = 15.0 MB
    assert stats["memory_usage_mb"] == 15.0
    # Percent: 15 / 128 * 100 = 11.72%
    assert stats["memory_percent"] == 11.72


def test_docker_logs_retrieval():
    service = DockerService()
    mock_container = MagicMock()
    mock_container.logs.return_value = b"2026-10-07 line 1\n2026-10-07 line 2\n"
    service.client = MagicMock()
    service.client.containers.get.return_value = mock_container

    logs = service.get_container_logs("c123", tail=100)
    assert len(logs) == 2
    assert "line 1" in logs[0]
    assert "line 2" in logs[1]


def test_docker_status_not_found():
    from docker.errors import NotFound
    service = DockerService()
    service.client = MagicMock()
    service.client.containers.get.side_effect = NotFound("Container not found")

    status = service.get_container_status("c_missing")
    assert status == "not_found"


# ==============================================================================
# Pruebas Unitarias de Seguridad: Anti-Zip Slip en ArtifactService (RNF-05)
# ==============================================================================
def test_anti_zip_slip_prevention(tmp_path):
    from fastapi import UploadFile, HTTPException

    dest_dir = tmp_path / "instancia_segura"
    dest_dir.mkdir()

    # Crear zip malicioso con escape de directorio
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("../../etc/passwd", "root:x:0:0::/root:/bin/bash")
    zip_buffer.seek(0)

    upload_file = UploadFile(file=zip_buffer, filename="malicious.zip")

    with pytest.raises(HTTPException) as exc_info:
        ArtifactService.sanitize_and_extract_zip(upload_file, str(dest_dir))
    assert exc_info.value.status_code == 400
    assert "Directory Traversal" in exc_info.value.detail or "zip slip" in exc_info.value.detail.lower()


def test_legitimate_zip_extraction(tmp_path):
    from fastapi import UploadFile

    dest_dir = tmp_path / "instancia_ok"
    dest_dir.mkdir()

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("index.html", "<h1>CloudPaaS Ok</h1>")
        zf.writestr("css/style.css", "body { color: black; }")
    zip_buffer.seek(0)

    upload_file = UploadFile(file=zip_buffer, filename="legit.zip")
    ArtifactService.sanitize_and_extract_zip(upload_file, str(dest_dir))

    assert (dest_dir / "index.html").exists()
    assert (dest_dir / "css" / "style.css").exists()

