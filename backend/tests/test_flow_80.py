"""
Suite de Pruebas de Integración y Regresión (Hito 80% - Rol 4).
Verifica: Algoritmo de Luhn, Catálogo de Planes, Plantillas 1-Clic, Control de Cuotas y RBAC Admin.
"""
import pytest
from app.services.billing_service import billing_service
from app.services.template_service import template_service


def test_luhn_algorithm_valid_cards():
    """Valida que números de tarjeta conformes a Luhn sean aceptados."""
    # Tarjetas de prueba estándar con checksum Luhn válido
    valid_cards = [
        "4532015112830366",  # Visa válida
        "5425233430109903",  # Mastercard válida
        "378282246310005",   # Amex válida
    ]
    for card in valid_cards:
        assert billing_service.validate_luhn(card) is True, f"Fallo al validar tarjeta válida: {card}"


def test_luhn_algorithm_invalid_cards():
    """Valida que números de tarjeta adulterados o con checksum erróneo sean rechazados."""
    invalid_cards = [
        "4532015112830367",  # Último dígito cambiado
        "4532015112830368",  # Checksum no congruente
        "0000000000000001",
    ]
    for card in invalid_cards:
        assert billing_service.validate_luhn(card) is False, f"Tarjeta inválida no fue detectada: {card}"


def test_card_brand_detection():
    """Valida la detección correcta de la marca de tarjeta según su prefijo."""
    assert billing_service.detect_card_brand("4532015112830366") == "Visa"
    assert billing_service.detect_card_brand("5425233430109903") == "Mastercard"
    assert billing_service.detect_card_brand("378282246310005") == "American Express"


def test_template_catalog():
    """Verifica que el catálogo de plantillas 1-clic exponga las 3 opciones requeridas."""
    catalog = template_service.get_catalog()
    assert len(catalog) == 3
    template_ids = [t["id"] for t in catalog]
    assert "landing-business" in template_ids
    assert "personal-portfolio" in template_ids
    assert "html5-docs" in template_ids


def test_template_structure():
    """Valida que cada plantilla tenga metadatos completos y category definida."""
    for tmpl in template_service.get_catalog():
        assert "id" in tmpl
        assert "name" in tmpl
        assert "description" in tmpl
        assert "category" in tmpl


def test_missing_template_does_not_allocate_resources():
    from types import SimpleNamespace
    from unittest.mock import Mock, patch
    from fastapi import HTTPException
    from app.services import template_service as module

    db = Mock()
    plan = SimpleNamespace(name="Free", max_instances=1)
    subscription = SimpleNamespace(plan=plan)
    db.query.return_value.filter.return_value.first.return_value = subscription
    db.query.return_value.filter.return_value.count.return_value = 0
    user = SimpleNamespace(id=1)

    with patch.object(module, "docker_service") as docker_mock, \
         patch.object(module, "port_service") as port_mock, \
         patch.object(
             template_service,
             "_resolve_template_source",
             side_effect=HTTPException(
                 status_code=404,
                 detail="Plantilla no encontrada."
             )
         ):
        with pytest.raises(HTTPException) as error:
            template_service.deploy_template(
                user, "Prueba", "landing-business", db
            )

        assert error.value.status_code == 404
        port_mock.get_and_reserve_available_port.assert_not_called()
        docker_mock.run_nginx_instance.assert_not_called()
        db.add.assert_not_called()
        db.commit.assert_not_called()

@pytest.mark.parametrize(
    "active_sites,limit,blocked",
    [
        (0, 1, False),
        (1, 1, False),
        (3, 1, True),
        (3, 3, False),
        (3, 10, False),
    ]
)
def test_plan_change_quota(active_sites, limit, blocked):
    from types import SimpleNamespace
    from unittest.mock import Mock
    from fastapi import HTTPException
    from app.services.quota_service import validate_quota_downgrade

    db = Mock()
    db.query.return_value.filter.return_value.count.return_value = active_sites
    plan = SimpleNamespace(name="Destino", max_instances=limit)

    if blocked:
        with pytest.raises(HTTPException) as error:
            validate_quota_downgrade(db, 1, plan)

        assert error.value.status_code == 400
        assert f"elimina {active_sites - limit}" in error.value.detail
    else:
        validate_quota_downgrade(db, 1, plan)

    db.add.assert_not_called()
    db.commit.assert_not_called()

def test_checkout_blocks_excess_quota_before_payment():
    from types import SimpleNamespace
    from unittest.mock import Mock
    from fastapi import HTTPException

    db = Mock()
    plan = SimpleNamespace(id=1, name="Free", max_instances=1)
    db.query.return_value.filter.return_value.first.return_value = plan
    db.query.return_value.filter.return_value.count.return_value = 3

    request = SimpleNamespace(
        plan_id=1,
        card_number="4532015112830366",
        exp_month=12,
        exp_year=2099
    )
    user = SimpleNamespace(id=1)

    with pytest.raises(HTTPException) as error:
        billing_service.process_checkout(request, user, db)

    assert error.value.status_code == 400
    assert "elimina 2" in error.value.detail
    db.add.assert_not_called()
    db.flush.assert_not_called()
    db.commit.assert_not_called()

@pytest.mark.parametrize("action", ["force_stop", "force_destroy"])
def test_client_cannot_execute_admin_actions(action):
    from types import SimpleNamespace
    from unittest.mock import Mock, patch
    from fastapi import HTTPException
    from app.models.user import UserRole
    from app.services.admin_service import admin_service
    from app.services import admin_service as module

    user = SimpleNamespace(id=1, role=UserRole.CLIENT)
    db = Mock()

    with patch.object(module, "docker_service") as docker_mock, \
         patch.object(module, "port_service") as port_mock:

        with pytest.raises(HTTPException) as error:
            admin_service.execute_force_action(
                admin_user=user,
                instance_id=99,
                action=action,
                reason="Prueba de permisos",
                db=db
            )

        assert error.value.status_code == 403
        db.query.assert_not_called()
        db.add.assert_not_called()
        db.delete.assert_not_called()
        db.commit.assert_not_called()
        docker_mock.stop_instance.assert_not_called()
        docker_mock.remove_instance.assert_not_called()
        port_mock.release_port.assert_not_called()

@pytest.mark.parametrize("action", ["force_stop", "force_destroy"])
def test_admin_docker_failure_preserves_resources(action, tmp_path):
    from types import SimpleNamespace
    from unittest.mock import Mock, patch
    from fastapi import HTTPException
    from app.models.user import UserRole
    from app.services.admin_service import admin_service
    from app.services import admin_service as module

    base = tmp_path / "instances"
    target = base / "1_prueba"
    target.mkdir(parents=True)
    marker = target / "index.html"
    marker.write_text("Sitio de prueba", encoding="utf-8")

    instance = SimpleNamespace(
        id=99,
        container_id="contenedor-prueba",
        storage_path=str(target)
    )
    admin = SimpleNamespace(id=1, role=UserRole.ADMIN)
    db = Mock()
    db.query.return_value.filter.return_value.first.return_value = instance

    with patch.object(module, "settings",
                      SimpleNamespace(RESOLVED_STORAGE_PATH=base)), \
         patch.object(module, "docker_service") as docker_mock, \
         patch.object(module, "port_service") as port_mock:

        docker_mock.stop_instance.return_value = False
        docker_mock.remove_instance.return_value = False

        with pytest.raises(HTTPException) as error:
            admin_service.execute_force_action(
                admin, 99, action, "Prueba de fallo Docker", db
            )

        assert error.value.status_code == 503
        assert marker.read_text(encoding="utf-8") == "Sitio de prueba"
        port_mock.release_port.assert_not_called()
        db.delete.assert_not_called()
        db.add.assert_not_called()
        db.commit.assert_not_called()

def test_admin_force_stop_records_audit():
    from types import SimpleNamespace
    from unittest.mock import Mock, patch
    from app.models.user import UserRole
    from app.models.instance import InstanceStatus
    from app.models.audit import AdminAuditLog
    from app.services.admin_service import admin_service
    from app.services import admin_service as module

    instance = SimpleNamespace(
        id=99,
        name="Sitio ajeno",
        assigned_port=30001,
        container_id="contenedor-prueba",
        status=InstanceStatus.RUNNING
    )
    admin = SimpleNamespace(id=1, role=UserRole.ADMIN)
    db = Mock()
    db.query.return_value.filter.return_value.first.return_value = instance

    with patch.object(module, "docker_service") as docker_mock, \
         patch.object(module, "port_service") as port_mock:
        docker_mock.stop_instance.return_value = True

        result = admin_service.execute_force_action(
            admin, 99, "force_stop", "Consumo anómalo", db
        )

        docker_mock.stop_instance.assert_called_once_with(
            "contenedor-prueba"
        )
        docker_mock.remove_instance.assert_not_called()
        port_mock.release_port.assert_not_called()
        db.delete.assert_not_called()

        assert instance.status == InstanceStatus.STOPPED
        audit = db.add.call_args.args[0]
        assert isinstance(audit, AdminAuditLog)
        assert audit.admin_user_id == 1
        assert audit.target_instance_id == 99
        assert audit.action == "force_stop"
        assert "Consumo anómalo" in audit.details
        db.commit.assert_called_once()
        assert result["audit_logged"] is True

def test_admin_force_destroy_cleans_resources(tmp_path):
    from types import SimpleNamespace
    from unittest.mock import Mock, patch
    from app.models.user import UserRole
    from app.models.audit import AdminAuditLog
    from app.services.admin_service import admin_service
    from app.services import admin_service as module

    base = tmp_path / "instances"
    target = base / "1_prueba"
    target.mkdir(parents=True)
    (target / "index.html").write_text("Prueba", encoding="utf-8")

    instance = SimpleNamespace(
        id=99,
        name="Sitio de prueba",
        assigned_port=30001,
        container_id="contenedor-prueba",
        storage_path=str(target)
    )
    admin = SimpleNamespace(id=1, role=UserRole.ADMIN)
    db = Mock()
    db.query.return_value.filter.return_value.first.return_value = instance

    with patch.object(module, "settings",
                      SimpleNamespace(RESOLVED_STORAGE_PATH=base)), \
         patch.object(module, "docker_service") as docker_mock, \
         patch.object(module, "port_service") as port_mock:
        docker_mock.remove_instance.return_value = True

        result = admin_service.execute_force_action(
            admin, 99, "force_destroy", "Limpieza de prueba", db
        )

        docker_mock.remove_instance.assert_called_once_with(
            "contenedor-prueba"
        )
        docker_mock.stop_instance.assert_not_called()
        assert not target.exists()
        assert base.exists()
        port_mock.release_port.assert_called_once_with(
            db, 30001, commit=False
        )
        db.delete.assert_called_once_with(instance)

        audit = db.add.call_args.args[0]
        assert isinstance(audit, AdminAuditLog)
        assert audit.action == "force_destroy"
        assert audit.target_instance_id is None
        assert "99" in audit.details
        assert "Limpieza de prueba" in audit.details
        db.commit.assert_called_once()
        assert result["audit_logged"] is True

@pytest.mark.parametrize("location", ["root", "sibling", "outside"])
def test_admin_destroy_rejects_unsafe_paths(location, tmp_path):
    from types import SimpleNamespace
    from unittest.mock import Mock, patch
    from fastapi import HTTPException
    from app.models.user import UserRole
    from app.services.admin_service import admin_service
    from app.services import admin_service as module

    base = tmp_path / "instances"
    paths = {
        "root": base,
        "sibling": tmp_path / "instances_extra",
        "outside": tmp_path,
    }
    instance = SimpleNamespace(
        id=99,
        container_id="contenedor-prueba",
        storage_path=str(paths[location])
    )
    admin = SimpleNamespace(id=1, role=UserRole.ADMIN)
    db = Mock()
    db.query.return_value.filter.return_value.first.return_value = instance

    with patch.object(module, "settings",
                      SimpleNamespace(RESOLVED_STORAGE_PATH=base)), \
         patch.object(module, "docker_service") as docker_mock, \
         patch.object(module, "port_service") as port_mock, \
         patch.object(module.shutil, "rmtree") as delete_files:

        with pytest.raises(HTTPException) as error:
            admin_service.execute_force_action(
                admin, 99, "force_destroy", "Prueba de seguridad", db
            )

        assert error.value.status_code == 409
        docker_mock.remove_instance.assert_not_called()
        port_mock.release_port.assert_not_called()
        delete_files.assert_not_called()
        db.delete.assert_not_called()
        db.commit.assert_not_called()

@pytest.mark.parametrize("action", ["force_stop", "force_destroy"])
def test_admin_endpoint_rejects_client(action):
    from types import SimpleNamespace
    from unittest.mock import Mock, patch
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.v1.admin import router, admin_service
    from app.core.database import get_db
    from app.core.security import get_current_user
    from app.models.user import UserRole

    test_app = FastAPI()
    test_app.include_router(router, prefix="/api/v1")
    test_app.dependency_overrides[get_current_user] = lambda: (
        SimpleNamespace(id=1, role=UserRole.CLIENT)
    )
    test_app.dependency_overrides[get_db] = lambda: Mock()

    with patch.object(admin_service, "execute_force_action") as execute:
        with TestClient(test_app) as client:
            response = client.post(
                "/api/v1/admin/instances/99/force-action",
                json={"action": action, "reason": "Prueba de permisos"}
            )

        assert response.status_code == 403
        execute.assert_not_called()

def test_template_docker_failure_cleans_resources(tmp_path):
    from types import SimpleNamespace
    from unittest.mock import Mock, patch
    from fastapi import HTTPException
    from docker.errors import APIError
    from app.services import template_service as module

    source = tmp_path / "template"
    source.mkdir()
    (source / "index.html").write_text("Prueba", encoding="utf-8")
    storage = tmp_path / "instances"
    storage.mkdir()

    plan = SimpleNamespace(
        name="Free", max_instances=1, max_ram_mb=128, cpu_quota=0.25
    )
    db = Mock()
    db.query.return_value.filter.return_value.first.return_value = (
        SimpleNamespace(plan=plan)
    )
    db.query.return_value.filter.return_value.count.return_value = 0
    user = SimpleNamespace(id=1)

    with patch.object(module, "settings",
                      SimpleNamespace(RESOLVED_STORAGE_PATH=storage)), \
         patch.object(template_service, "_resolve_template_source",
                      return_value=source), \
         patch.object(module, "docker_service") as docker_mock, \
         patch.object(module, "port_service") as port_mock:

        port_mock.get_and_reserve_available_port.return_value = 30001
        docker_mock.run_nginx_instance.side_effect = APIError("Fallo simulado")

        with pytest.raises(HTTPException) as error:
            template_service.deploy_template(
                user, "Prueba", "landing-business", db
            )

        assert error.value.status_code == 503
        assert list(storage.iterdir()) == []
        assert (source / "index.html").exists()
        port_mock.release_port.assert_called_once_with(db, 30001)
        db.add.assert_not_called()
        db.commit.assert_not_called()

def test_template_success_copies_files_and_links_port(tmp_path):
    from datetime import datetime, timezone
    from types import SimpleNamespace
    from unittest.mock import Mock, patch
    from app.models.instance import Instance
    from app.services import template_service as module

    source = tmp_path / "template"
    source.mkdir()
    (source / "index.html").write_text("Mi sitio", encoding="utf-8")
    storage = tmp_path / "instances"
    storage.mkdir()

    plan = SimpleNamespace(
        name="Free", max_instances=1, max_ram_mb=128, cpu_quota=0.25
    )
    db = Mock()
    db.query.return_value.filter.return_value.first.return_value = (
        SimpleNamespace(plan=plan)
    )
    db.query.return_value.filter.return_value.count.return_value = 0
    allocation = SimpleNamespace(instance_id=None)
    db.query.return_value.filter.return_value.one.return_value = allocation

    def assign_database_values():
        instance = db.add.call_args.args[0]
        assert isinstance(instance, Instance)
        instance.id = 5
        instance.created_at = datetime.now(timezone.utc)

    db.flush.side_effect = assign_database_values
    user = SimpleNamespace(id=1)

    with patch.object(module, "settings",
                      SimpleNamespace(RESOLVED_STORAGE_PATH=storage)), \
         patch.object(template_service, "_resolve_template_source",
                      return_value=source), \
         patch.object(module, "docker_service") as docker_mock, \
         patch.object(module, "port_service") as port_mock:

        port_mock.get_and_reserve_available_port.return_value = 30001
        docker_mock.run_nginx_instance.return_value = "container-real-id"

        result = template_service.deploy_template(
            user, "Mi sitio", "landing-business", db
        )

        assert result["id"] == 5
        assert result["status"] == "running"
        assert result["assigned_port"] == 30001
        assert result["template_used"] == "landing-business"
        assert allocation.instance_id == 5
        args = docker_mock.run_nginx_instance.call_args.kwargs
        assert args["host_port"] == 30001
        assert args["ram_limit_mb"] == 128
        assert args["cpu_quota"] == 0.25
        from pathlib import Path
        copied = Path(args["host_storage_path"]) / "index.html"
        assert copied.read_text(encoding="utf-8") == "Mi sitio"
        assert (source / "index.html").exists()
        db.commit.assert_called_once()
        port_mock.release_port.assert_not_called()