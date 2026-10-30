"""
Modelos de Base de Datos para Facturación y Transacciones (Hito 80% - Rol 3).
Entidades: PaymentTransaction, Invoice.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base
from app.core.model_types import UTCDateTime


class TransactionStatus(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    PENDING = "pending"


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
            name="fk_payment_transactions_user_id_users",
        ),
        nullable=False,
    )
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    amount = Column(Float, nullable=False)
    card_last_four = Column(String(4), nullable=False)
    card_brand = Column(String(20), nullable=False)  # Visa, Mastercard, Amex
    auth_code = Column(String(32), unique=True, nullable=False)  # AUTH-XXXXXX
    status = Column(Enum(TransactionStatus, native_enum=False, length=50, create_constraint=False,
                         validate_strings=True), default=TransactionStatus.APPROVED, nullable=False)
    created_at = Column(UTCDateTime(), default=lambda: datetime.now(timezone.utc), nullable=False)
    plan_name_snapshot = Column(String(50), nullable=True)

    user = relationship("User", backref="transactions")
    plan = relationship("Plan", backref="transactions")
    invoice = relationship("Invoice", uselist=False, back_populates="transaction")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("payment_transactions.id"), unique=True, nullable=False)
    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
            name="fk_invoices_user_id_users",
        ),
        nullable=False,
    )
    invoice_number = Column(String(50), unique=True, nullable=False)  # INV-2026-XXXX
    amount = Column(Float, nullable=False)
    tax = Column(Float, default=0.0, nullable=False)
    status = Column(String(20), default="paid", nullable=False)
    created_at = Column(UTCDateTime(), default=lambda: datetime.now(timezone.utc), nullable=False)
    pdf_metadata = Column(JSON().with_variant(JSONB(), "postgresql"), nullable=True)

    transaction = relationship("PaymentTransaction", back_populates="invoice")
    user = relationship("User", backref="invoices")
