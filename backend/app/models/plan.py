from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text, Boolean, text
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base
from app.core.model_types import UTCDateTime

class PlanType(str, enum.Enum):
    FREE = "Free"
    DEVELOPER = "Developer"
    PRO = "Pro"

class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, default=0.0, nullable=False)
    max_instances = Column(Integer, default=1, nullable=False)
    max_ram_mb = Column(Integer, default=128, nullable=False)
    cpu_quota = Column(Float, default=0.25, nullable=False)  # 0.25 vCPU
    billing_period = Column(String(20), default="monthly", server_default="monthly", nullable=False)
    is_active = Column(Boolean, default=True, server_default="true", nullable=False)
    created_at = Column(
        UTCDateTime(),
        default=lambda: datetime.now(timezone.utc),
        nullable=True,
    )

    subscriptions = relationship("Subscription", back_populates="plan")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(UTCDateTime(), default=lambda: datetime.now(timezone.utc), nullable=False)
    start_date = Column(
        UTCDateTime(),
        default=lambda: datetime.now(timezone.utc),
        nullable=True,
    )
    end_date = Column(UTCDateTime(), nullable=True)
    auto_renew = Column(Boolean, default=False, server_default=text("false"), nullable=False)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")
