"""
Modelos de Base de Datos para Facturación y Transacciones (Hito 80% - Rol 3).
Entidades: PaymentTransaction, Invoice.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class TransactionStatus(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    PENDING = "pending"


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    amount = Column(Float, nullable=False)
    card_last_four = Column(String(4), nullable=False)
    card_brand = Column(String(20), nullable=False)  # Visa, Mastercard, Amex
    auth_code = Column(String(32), unique=True, nullable=False)  # AUTH-XXXXXX
    status = Column(Enum(TransactionStatus), default=TransactionStatus.APPROVED, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", backref="transactions")
    plan = relationship("Plan", backref="transactions")
    invoice = relationship("Invoice", uselist=False, back_populates="transaction")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("payment_transactions.id"), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False)  # INV-2026-XXXX
    amount = Column(Float, nullable=False)
    tax = Column(Float, default=0.0, nullable=False)
    status = Column(String(20), default="paid", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    transaction = relationship("PaymentTransaction", back_populates="invoice")
    user = relationship("User", backref="invoices")
