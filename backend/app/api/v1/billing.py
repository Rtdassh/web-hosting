"""
Router de Facturación, Catálogo de Planes y Suscripciones (Hito 80% - Rol 3).
Endpoints: /plans, /billing/checkout, /billing/invoices, /subscriptions/change-plan.
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.plan import Plan
from app.schemas.billing_schema import (
    PlanResponse,
    CheckoutRequest,
    TransactionResponse,
    InvoiceResponse,
    PlanChangeRequest
)
from app.services.billing_service import billing_service

router = APIRouter(tags=["Facturación & Suscripciones"])


@router.get("/plans", response_model=List[PlanResponse])
def get_plans(db: Session = Depends(get_db)):
    """Retorna el catálogo público de planes parametrizados (Free, Developer, Pro)."""
    return db.query(Plan).filter(Plan.is_active.is_(True)).order_by(Plan.id.asc()).all()


@router.post("/billing/checkout", response_model=TransactionResponse, status_code=status.HTTP_200_OK)
def checkout(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    RF-09: Pasarela de pagos simulada con validación matemática en tiempo real
    mediante el Algoritmo de Luhn (Módulo 10). Emite comprobante digital.
    """
    return billing_service.process_checkout(request, current_user, db)


@router.get("/billing/invoices", response_model=List[InvoiceResponse])
def get_invoices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """RF-10: Bitácora cronológica inmutable de facturas y transacciones del usuario."""
    return billing_service.get_user_invoices(current_user, db)


@router.post("/subscriptions/change-plan")
def change_plan(
    request: PlanChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    RF-11: Upgrade o Downgrade de plan con validación preventiva de instancias activas.
    """
    return billing_service.change_subscription_plan(current_user, request.target_plan_id, db)
