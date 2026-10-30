"""
Servicio de Facturación, Pasarela Simulada y Algoritmo de Luhn (Rol 3 - Backend).
Cumplimiento estricto de RF-07, RF-08, RF-09, RF-10 y RF-11.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.services.quota_service import validate_quota_downgrade

from app.models.billing import PaymentTransaction, Invoice, TransactionStatus
from app.models.plan import Plan, Subscription
from app.models.user import User
from app.models.instance import Instance, InstanceStatus
from app.schemas.billing_schema import CheckoutRequest, TransactionResponse, InvoiceResponse


class BillingService:
    @staticmethod
    def validate_luhn(card_number: str) -> bool:
        """
        Validación matemática estricta mediante el Algoritmo de Luhn (Módulo 10).
        Duplica cada segundo dígito desde la derecha y suma los dígitos resultantes.
        """
        digits = [int(c) for c in card_number if c.isdigit()]
        if not digits:
            return False

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
        cleaned = "".join(c for c in card_number if c.isdigit())
        if cleaned.startswith("4"):
            return "Visa"
        elif cleaned.startswith(("51", "52", "53", "54", "55")) or (len(cleaned) >= 4 and 2221 <= int(cleaned[:4]) <= 2720):
            return "Mastercard"
        elif cleaned.startswith(("34", "37")):
            return "American Express"
        return "Desconocida"

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

        # 3. Obtención del Plan Solicitado
        target_plan = db.query(Plan).filter(Plan.id == request.plan_id).first()
        if not target_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El plan especificado no existe en el catálogo."
            )
        validate_quota_downgrade(db, user.id, target_plan)
            
        # 4. Generación de Códigos de Autorización y Factura
        auth_code = f"AUTH-{uuid.uuid4().hex[:6].upper()}"
        brand = self.detect_card_brand(request.card_number)
        card_last_four = request.card_number[-4:]

        # 5. Persistencia de la Transacción
        transaction = PaymentTransaction(
            user_id=user.id,
            plan_id=target_plan.id,
            amount=target_plan.price,
            card_last_four=card_last_four,
            card_brand=brand,
            auth_code=auth_code,
            status=TransactionStatus.APPROVED
        )
        db.add(transaction)
        db.flush()

        # 6. Emisión de Factura
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

        # 7. Actualización de Suscripción Activa
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user.id,
            Subscription.status == "active"
        ).first()

        if subscription:
            subscription.plan_id = target_plan.id
        else:
            subscription = Subscription(
                user_id=user.id,
                plan_id=target_plan.id,
                status="active"
            )
            db.add(subscription)

        db.commit()
        db.refresh(transaction)

        return {
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
            "timestamp": transaction.created_at
        }

    def change_subscription_plan(self, user: User, target_plan_id: int, db: Session) -> Dict[str, Any]:
        """
        Maneja Upgrade o Downgrade de suscripción con validación preventiva de instancias activas.
        """
        target_plan = db.query(Plan).filter(Plan.id == target_plan_id).first()
        if not target_plan:
            raise HTTPException(status_code=404, detail="El plan objetivo no existe.")

        validate_quota_downgrade(db, user.id, target_plan)

        subscription = db.query(Subscription).filter(
            Subscription.user_id == user.id,
            Subscription.status == "active"
        ).first()

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
            plan_name = tx.plan.name if tx and tx.plan else "Suscripción"
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
