"""
Esquemas Pydantic para el Módulo de Facturación y Pagos (Hito 80% - Rol 3).
Contratos de entrada y salida para /api/v1/plans, /api/v1/billing/checkout y /api/v1/billing/invoices.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class PlanResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    max_instances: int
    max_ram_mb: int
    cpu_quota: float
    is_active: bool = True

    model_config = {"from_attributes": True}


class CheckoutRequest(BaseModel):
    """Payload de solicitud de pago simulado con validación inicial."""
    plan_id: int = Field(..., description="ID del plan que se desea contratar")
    card_holder: str = Field(..., min_length=3, max_length=100, description="Nombre del titular")
    card_number: str = Field(..., description="Número de tarjeta de 16 dígitos")
    exp_month: int = Field(..., ge=1, le=12, description="Mes de expiración (1-12)")
    exp_year: int = Field(..., ge=2024, le=2040, description="Año de expiración de 4 dígitos")
    cvv: str = Field(..., min_length=3, max_length=4, description="Código de seguridad")

    @field_validator("card_number")
    @classmethod
    def clean_card_number(cls, v: str) -> str:
        cleaned = "".join(ch for ch in v if ch.isdigit())
        if len(cleaned) < 13 or len(cleaned) > 19:
            raise ValueError("El número de tarjeta debe contener entre 13 y 19 dígitos numéricos.")
        return cleaned


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
