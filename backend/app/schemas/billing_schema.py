"""
Esquemas Pydantic para el Módulo de Facturación y Pagos (Hito 80% - Rol 3).
Contratos de entrada y salida para /api/v1/plans, /api/v1/billing/checkout y /api/v1/billing/invoices.
"""
from datetime import datetime
import re
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator


def _card_brand(card_number: str) -> Optional[str]:
    if card_number.startswith("4"):
        return "Visa"
    if card_number.startswith(("51", "52", "53", "54", "55")) or (
        len(card_number) >= 4 and 2221 <= int(card_number[:4]) <= 2720
    ):
        return "Mastercard"
    if card_number.startswith(("34", "37")):
        return "American Express"
    return None


class PlanResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    billing_period: str
    max_instances: int
    max_ram_mb: int
    cpu_quota: float
    is_active: bool = True

    model_config = {"from_attributes": True}


class CheckoutRequest(BaseModel):
    """Payload de solicitud de pago simulado con validación inicial."""
    plan_id: int = Field(..., description="ID del plan que se desea contratar")
    card_holder: str = Field(..., min_length=3, max_length=100, description="Nombre del titular")
    card_number: str = Field(
        ...,
        description="Número de tarjeta con dígitos y separadores opcionales",
        repr=False,
    )
    exp_month: int = Field(..., ge=1, le=12, description="Mes de expiración (1-12)")
    exp_year: int = Field(..., ge=2024, le=2040, description="Año de expiración de 4 dígitos")
    cvv: str = Field(
        ...,
        min_length=3,
        max_length=4,
        description="Código de seguridad",
        repr=False,
    )

    @field_validator("card_number")
    @classmethod
    def clean_card_number(cls, v: str) -> str:
        if not re.fullmatch(r"[0-9 -]+", v):
            raise ValueError("El número de tarjeta contiene caracteres no permitidos.")
        cleaned = v.replace(" ", "").replace("-", "")
        brand = _card_brand(cleaned)
        valid_lengths = {
            "Visa": {13, 16, 19},
            "Mastercard": {16},
            "American Express": {15},
        }
        if brand is None or len(cleaned) not in valid_lengths[brand]:
            raise ValueError("El número de tarjeta tiene un formato o longitud inválidos.")
        return cleaned

    @model_validator(mode="after")
    def validate_cvv_for_card_brand(self):
        brand = _card_brand(self.card_number)
        valid_length = 4 if brand == "American Express" else 3
        if not re.fullmatch(r"[0-9]+", self.cvv) or len(self.cvv) != valid_length:
            raise ValueError("El código de seguridad no es válido para la marca de tarjeta.")
        return self


class TransactionResponse(BaseModel):
    transaction_id: int
    status: str
    auth_code: str
    plan_name: str
    amount_charged: float
    card_last_four: str
    card_brand: str
    invoice_number: str
    new_quota: Dict[str, Any]
    timestamp: datetime

    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    transaction_id: int
    plan_name: str
    amount: float
    tax: float
    status: str
    auth_code: str
    card_last_four: str
    card_brand: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PlanChangeRequest(BaseModel):
    """Solicitud para cambio de suscripción (Upgrade o Downgrade)."""
    target_plan_id: int
