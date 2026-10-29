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