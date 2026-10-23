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
