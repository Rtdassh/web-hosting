"""
Suite de Pruebas Unitarias de Auditoría de Seguridad y Resiliencia Operativa.
Verifica las correcciones implementadas:
1. Prevención de Symlink Traversal y Zip Slip en ArtifactService (RNF-05).
2. Confinamiento estricto de rutas de almacenamiento en InstanceService (RNF-04).
3. Mitigación de Path Traversal en resolución de plantillas (RNF-05).
4. Bloqueo de despliegues con suscripción vencida en TemplateService (RF-08, RF-14).
5. Reconciliación resiliente y registro histórico en SyncWorker (RNF-09).
6. Rate Limiting e inyección de cabeceras HTTP de seguridad (RNF-06).
"""
import io
import time
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock, patch

import pytest
from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.main import app
from app.models.instance import Instance, InstanceStatus
from app.models.instance_status_history import InstanceStatusHistory
from app.models.user import User, UserRole
from app.services.artifact_service import ArtifactService
from app.services.instance_service import InstanceService
from app.services.sync_worker import SyncWorker
from app.services.template_service import TemplateService, template_service


# ==============================================================================
# 1. Pruebas de Seguridad en ArtifactService (Symlinks & Path Traversal)
# ==============================================================================

def test_anti_zip_symlink_rejection(tmp_path):
    """Verifica que los paquetes ZIP con enlaces simbólicos sean rechazados (RNF-05)."""
    dest_dir = tmp_path / "symlink_test"
    dest_dir.mkdir()

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        # Escribir index.html
        zf.writestr("index.html", "<h1>Normal</h1>")
        # Crear entrada con atributo Unix de enlace simbólico (0o120000 = S_IFLNK)
        symlink_info = zipfile.ZipInfo("malicious_link")
        symlink_info.create_system = 3  # Unix
        symlink_info.external_attr = 0o120777 << 16  # S_IFLNK | 0777
        zf.writestr(symlink_info, "/etc/passwd")

    zip_buffer.seek(0)
    upload_file = UploadFile(file=zip_buffer, filename="symlink_attack.zip")

    with pytest.raises(HTTPException) as exc_info:
        ArtifactService.sanitize_and_extract_zip(upload_file, str(dest_dir))

    assert exc_info.value.status_code == 400
    assert "enlaces simbólicos no están permitidos" in exc_info.value.detail.lower()


def test_anti_zip_leading_slash_rejection(tmp_path):
    """Verifica que rutas con barra inicial o '..' sean rechazadas inmediatamente."""
    dest_dir = tmp_path / "traversal_test"
    dest_dir.mkdir()

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("index.html", "<h1>Normal</h1>")
        zf.writestr("/etc/evil.txt", "contenido maligno")

    zip_buffer.seek(0)
    upload_file = UploadFile(file=zip_buffer, filename="leading_slash.zip")

    with pytest.raises(HTTPException) as exc_info:
        ArtifactService.sanitize_and_extract_zip(upload_file, str(dest_dir))

    assert exc_info.value.status_code == 400
    assert "directory traversal" in exc_info.value.detail.lower()


# ==============================================================================
# 2. Pruebas de Confinamiento de Rutas en InstanceService (RNF-04)
# ==============================================================================

def test_instance_destroy_path_confinement_blocks_prefix_attack(tmp_path):
    """
    Verifica que destroy() impida borrar rutas fuera de base_dir,
    incluso cuando el string comparte prefijo (ej: /base_dir_evil).
    """
    base_dir = tmp_path / "instancias"
    base_dir.mkdir()
    spoofed_evil_dir = tmp_path / "instancias_evil"
    spoofed_evil_dir.mkdir()
    victim_file = spoofed_evil_dir / "secret.txt"
    victim_file.write_text("sensible", encoding="utf-8")

    instance = SimpleNamespace(
        id=1,
        user_id=10,
        container_id="c10",
        assigned_port=30010,
        storage_path=str(spoofed_evil_dir),
        status=InstanceStatus.RUNNING
    )
    user = SimpleNamespace(id=10, role=UserRole.CLIENT)
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = instance

    mock_docker = MagicMock()
    mock_docker.remove_instance.return_value = True
    mock_port = MagicMock()

    with patch.object(type(settings), "RESOLVED_STORAGE_PATH", property(lambda self: base_dir)):
        InstanceService.destroy(
            instance_id=1,
            current_user=user,
            db=db,
            docker_svc=mock_docker,
            port_svc=mock_port
        )

    # El directorio falso NO debió ser eliminado porque no es relativo a base_dir
    assert victim_file.exists()
    assert spoofed_evil_dir.exists()


# ==============================================================================
# 3. Pruebas de Path Traversal en TemplateService (RNF-05)
# ==============================================================================

@pytest.mark.parametrize("invalid_id", [
    "../../etc/passwd",
    "../templates/landing-business",
    "/root",
    "sub/dir",
    "evil\\path"
])
def test_template_id_traversal_rejection(invalid_id):
    """Verifica que _resolve_template_source rechace cualquier intento de escape de ruta."""
    service = TemplateService()
    with pytest.raises(HTTPException) as exc_info:
        service._resolve_template_source(invalid_id)

    assert exc_info.value.status_code == 400
    assert "inválido" in exc_info.value.detail.lower()


# ==============================================================================
# 4. Pruebas de Validación de Suscripción en TemplateService (RF-08, RF-14)
# ==============================================================================

def test_template_deploy_blocks_expired_subscription():
    """
    Verifica que un usuario con suscripción de pago vencida no pueda
    desplegar plantillas ni reservar puertos ni recursos de Docker.
    """
    now = datetime.now(timezone.utc)
    expired_time = now - timedelta(days=5)

    expired_plan = SimpleNamespace(
        name="Developer",
        max_instances=3,
        max_ram_mb=256,
        cpu_quota=0.50
    )
    expired_sub = SimpleNamespace(
        status="active",
        plan=expired_plan,
        current_period_end=expired_time,
        end_date=None
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = expired_sub
    user = SimpleNamespace(id=99)

    service = TemplateService()
    mock_port = MagicMock()
    mock_docker = MagicMock()

    with patch("app.services.template_service.port_service", mock_port), \
         patch("app.services.template_service.docker_service", mock_docker):

        with pytest.raises(HTTPException) as exc_info:
            service.deploy_template(user, "Sitio Expirado", "landing-business", db)

        assert exc_info.value.status_code == 403
        assert "vencido" in exc_info.value.detail.lower()

        mock_port.get_and_reserve_available_port.assert_not_called()
        mock_docker.run_nginx_instance.assert_not_called()


# ==============================================================================
# 5. Pruebas de Reconciliación y Auditoría en SyncWorker (RNF-09)
# ==============================================================================

def test_sync_worker_reconciles_missing_container_to_failed():
    """
    Verifica que SyncWorker detecte contenedores inexistentes,
    libere el puerto con la firma (db, port) y guarde InstanceStatusHistory.
    """
    worker = SyncWorker(interval_seconds=30)

    inst = SimpleNamespace(
        id=42,
        user_id=5,
        uuid="a1b2c3d4",
        container_id="c_missing_42",
        assigned_port=30042,
        status=InstanceStatus.RUNNING
    )
    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = [inst]

    mock_docker = MagicMock()
    mock_docker.client = MagicMock()
    mock_docker.get_container_status.return_value = "not_found"

    mock_port = MagicMock()

    with patch("app.services.sync_worker.docker_service", mock_docker), \
         patch("app.services.sync_worker.port_service", mock_port):

        result = worker.reconcile_states(db)

        assert result["discrepancies_found"] == 1
        assert result["reconciled_instances"] == [42]
        assert inst.status == InstanceStatus.FAILED

        # Verificar orden estricto de parámetros: release_port(db, port, commit=False)
        mock_port.release_port.assert_called_once_with(db, 30042, commit=False)

        # Verificar que se registró la historia de transición
        db.add.assert_called_once()
        history = db.add.call_args[0][0]
        assert isinstance(history, InstanceStatusHistory)
        assert history.instance_id == 42
        assert history.new_status == InstanceStatus.FAILED.value
        db.commit.assert_called_once()


def test_sync_worker_reconciles_stopped_container():
    """Verifica que SyncWorker detecte contenedores detenidos externamente y marque STOPPED."""
    worker = SyncWorker(interval_seconds=30)

    inst = SimpleNamespace(
        id=43,
        user_id=5,
        uuid="a1b2c3d5",
        container_id="c_stopped_43",
        assigned_port=30043,
        status=InstanceStatus.RUNNING
    )
    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = [inst]

    mock_docker = MagicMock()
    mock_docker.client = MagicMock()
    mock_docker.get_container_status.return_value = "exited"

    mock_port = MagicMock()

    with patch("app.services.sync_worker.docker_service", mock_docker), \
         patch("app.services.sync_worker.port_service", mock_port):

        result = worker.reconcile_states(db)

        assert result["discrepancies_found"] == 1
        assert inst.status == InstanceStatus.STOPPED
        mock_port.release_port.assert_not_called()  # En stopped no se libera el puerto

        db.add.assert_called_once()
        history = db.add.call_args[0][0]
        assert history.new_status == InstanceStatus.STOPPED.value
        db.commit.assert_called_once()


# ==============================================================================
# 6. Pruebas de Rate Limiting y Cabeceras de Seguridad (RNF-06)
# ==============================================================================

def test_security_headers_injected_on_responses():
    """Verifica la presencia obligatoria de cabeceras de endurecimiento en respuestas HTTP."""
    client = TestClient(app)
    response = client.get("/")

    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"


def test_rate_limit_middleware_blocks_login_abuse():
    """Verifica que el middleware bloquee con HTTP 429 tras superar el umbral de intentos de login."""
    from app.core.database import get_db

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        RateLimitMiddleware.reset_limits()
        client = TestClient(app)

        # Simular 5 intentos fallidos
        for _ in range(5):
            resp = client.post("/api/v1/auth/login", json={"email": "hacker@test.com", "password": "wrong"})
            # Las primeras 5 son procesadas por el router (401 o 400)
            assert resp.status_code in [400, 401]

        # El sexto intento debe ser bloqueado directamente por el middleware con 429
        blocked_resp = client.post("/api/v1/auth/login", json={"email": "hacker@test.com", "password": "wrong"})
        assert blocked_resp.status_code == 429
        assert "excedido" in blocked_resp.json()["detail"].lower()
        assert blocked_resp.headers.get("X-Content-Type-Options") == "nosniff"
    finally:
        app.dependency_overrides.pop(get_db, None)
        RateLimitMiddleware.reset_limits()
