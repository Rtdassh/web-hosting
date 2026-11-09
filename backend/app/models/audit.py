"""
Modelo de Bitácora Estructurada de Auditoría de Administrador (Hito 80% / 100% - Rol 3).
Entidad: AdminAuditLog.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.model_types import UTCDateTime


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_instance_id = Column(
        Integer,
        ForeignKey(
            "instances.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )
    action = Column(String(50), nullable=False)  # force_stop, force_destroy, plan_override
    details = Column(Text, nullable=True)
    timestamp = Column(UTCDateTime(), default=lambda: datetime.now(timezone.utc), nullable=False)

    admin = relationship("User", foreign_keys=[admin_user_id])
    target_instance = relationship("Instance", foreign_keys=[target_instance_id])
