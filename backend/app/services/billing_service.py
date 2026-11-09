"""
Servicio de Facturación, Pasarela Simulada y Algoritmo de Luhn (Rol 3 - Backend).
Cumplimiento estricto de RF-07, RF-08, RF-09, RF-10 y RF-11.
"""
import logging
import uuid
import calendar
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.services.quota_service import validate_quota_downgrade

from app.models.billing import PaymentTransaction, Invoice, TransactionStatus
from app.models.plan import Plan, Subscription
from app.models.user import User
from app.models.instance import Instance, InstanceStatus
from app.schemas.billing_schema import (
    CheckoutRequest,
    InvoiceResponse,
    TransactionResponse,
    _card_brand,
)
from app.services.subscription_service import require_current_subscription_plan

logger = logging.getLogger(__name__)


def _add_calendar_month(value: datetime) -> datetime:
    month_index = value.month
    year = value.year + (month_index // 12)
    month = (month_index % 12) + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


class BillingService:
    @staticmethod
    def validate_luhn(card_number: str) -> bool:
        """
        Validación matemática estricta mediante el Algoritmo de Luhn (Módulo 10).
        Duplica cada segundo dígito desde la derecha y suma los dígitos resultantes.
        """
        if (
            not card_number.isascii()
            or not card_number.isdigit()
            or not 13 <= len(card_number) <= 19
        ):
            return False
        digits = [int(c) for c in card_number]

        checksum = 0
        reverse_digits = digits[::-1]

        for i, digit in enumerate(reverse_digits):
            if i % 2 == 1:
                doubled = digit * 2
                checksum += (doubled - 9) if doubled > 9 else doubled
            else:
                checksum += digit

        return checksum % 10 == 0

    @staticmethod
    def detect_card_brand(card_number: str) -> str:
        """Determina el emisor de la tarjeta según los prefijos estándar."""
        return _card_brand(card_number) or "Desconocida"

    def process_checkout(self, request: CheckoutRequest, user: User, db: Session) -> Dict[str, Any]:
        """
        Procesa una compra de suscripción simulada validando Luhn y actualizando cuota.
        """
        # 1. Validación de Algoritmo de Luhn
        if not self.validate_luhn(request.card_number):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El número de tarjeta no supera la validación matemática del Algoritmo de Luhn (Módulo 10)."
            )

        # 2. Validación de Fecha de Vencimiento
        now = datetime.now(timezone.utc)
        if request.exp_year < now.year or (request.exp_year == now.year and request.exp_month < now.month):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La tarjeta proporcionada se encuentra vencida."
            )

        try:
            target_plan = db.query(Plan).filter(Plan.id == request.plan_id).first()
            if not target_plan:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="El plan especificado no existe en el catálogo."
                )
            if not getattr(target_plan, "is_active", True):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="El plan especificado no está disponible.",
                )
            if getattr(target_plan, "billing_period", "monthly") != "monthly":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Solo están disponibles planes mensuales.",
                )

            validate_quota_downgrade(db, user.id, target_plan)

            auth_code = f"AUTH-{uuid.uuid4().hex[:6].upper()}"
            brand = self.detect_card_brand(request.card_number)
            card_last_four = request.card_number[-4:]

            transaction = PaymentTransaction(
                user_id=user.id,
                plan_id=target_plan.id,
                amount=target_plan.price,
                plan_name_snapshot=target_plan.name,
                card_last_four=card_last_four,
                card_brand=brand,
                auth_code=auth_code,
                status=TransactionStatus.APPROVED
            )
            db.add(transaction)
            db.flush()

            invoice_number = f"INV-{now.year}-{1000 + transaction.id}"
            tax = round(target_plan.price * 0.16, 2)
            invoice = Invoice(
                transaction_id=transaction.id,
                user_id=user.id,
                invoice_number=invoice_number,
                amount=target_plan.price,
                tax=tax,
                status="paid"
            )
            db.add(invoice)

            subscription = db.query(Subscription).filter(
                Subscription.user_id == user.id,
                Subscription.status == "active"
            ).first()

            if subscription:
                subscription.plan_id = target_plan.id
                subscription.current_period_start = now
                subscription.current_period_end = _add_calendar_month(now)
            else:
                db.add(Subscription(
                    user_id=user.id,
                    plan_id=target_plan.id,
                    status="active",
                    start_date=now,
                    current_period_start=now,
                    current_period_end=_add_calendar_month(now),
                    auto_renew=False,
                ))

            db.flush()
            timestamp = transaction.created_at
            response = {
                "transaction_id": transaction.id,
                "status": "approved",
                "auth_code": auth_code,
                "plan_name": target_plan.name,
                "amount_charged": target_plan.price,
                "card_last_four": card_last_four,
                "card_brand": brand,
                "invoice_number": invoice_number,
                "new_quota": {
                    "max_instances": target_plan.max_instances,
                    "max_ram_mb": target_plan.max_ram_mb,
                    "cpu_quota": target_plan.cpu_quota
                },
                "timestamp": timestamp
            }
            db.commit()
        except HTTPException:
            raise
        except Exception:
            try:
                db.rollback()
            except Exception:
                logger.exception("Checkout rollback failed.")
            logger.exception("Checkout persistence failed; transaction rolled back.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo completar el checkout. Inténtalo de nuevo.",
            ) from None

        return response

    def change_subscription_plan(self, user: User, target_plan_id: int, db: Session) -> Dict[str, Any]:
        """
        Maneja cambios sin pago (principalmente downgrade a Free) con validación de cuotas.

        Los upgrades de precio se deben procesar mediante process_checkout para
        registrar transacción, factura y cambio de plan atómicamente.
        """
        target_plan = db.query(Plan).filter(Plan.id == target_plan_id).first()
        if not target_plan:
            raise HTTPException(status_code=404, detail="El plan objetivo no existe.")
        if not getattr(target_plan, "is_active", True):
            raise HTTPException(status_code=404, detail="El plan objetivo no está disponible.")

        subscription = db.query(Subscription).filter(
            Subscription.user_id == user.id,
            Subscription.status == "active"
        ).first()

        if target_plan.price > 0:
            if subscription is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Para cambiar a un plan de pago debes completar el checkout.",
                )
            try:
                current_plan = require_current_subscription_plan(subscription)
            except HTTPException as error:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No puedes cambiar a un plan de pago con una suscripción inactiva o vencida.",
                ) from error
            if not current_plan.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tu plan actual no está disponible para cambios directos.",
                )
            if target_plan.price > current_plan.price:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Para subir a un plan de mayor precio debes completar el checkout.",
                )

        validate_quota_downgrade(db, user.id, target_plan)

        if subscription:
            subscription.plan_id = target_plan.id
        else:
            subscription = Subscription(user_id=user.id, plan_id=target_plan.id, status="active")
            db.add(subscription)

        db.commit()

        return {
            "message": f"Suscripción actualizada exitosamente al plan {target_plan.name}.",
            "plan": target_plan.name,
            "max_instances": target_plan.max_instances
        }

    def get_user_invoices(self, user: User, db: Session) -> List[Dict[str, Any]]:
        """Retorna el historial de compras y comprobantes emitidos para el usuario."""
        invoices = db.query(Invoice).filter(Invoice.user_id == user.id).order_by(Invoice.created_at.desc()).all()
        results = []
        for inv in invoices:
            tx = inv.transaction
            plan_name = (
                tx.plan_name_snapshot
                if tx and tx.plan_name_snapshot is not None
                else "Nombre del plan no registrado"
            )
            results.append({
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "transaction_id": inv.transaction_id,
                "plan_name": plan_name,
                "amount": inv.amount,
                "tax": inv.tax,
                "status": inv.status,
                "auth_code": tx.auth_code if tx else "N/A",
                "card_last_four": tx.card_last_four if tx else "****",
                "card_brand": tx.card_brand if tx else "Tarjeta",
                "created_at": inv.created_at
            })
        return results


billing_service = BillingService()
