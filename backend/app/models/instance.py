from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.model_types import UTCDateTime

class InstanceStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    STOPPED = "stopped"
    FAILED = "failed"

class Instance(Base):
    __tablename__ = "instances"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    container_id = Column(String(64), unique=True, nullable=True)
    assigned_port = Column(Integer, unique=True, nullable=False)
    public_url = Column(String(255), nullable=False)
    status = Column(Enum(InstanceStatus, native_enum=False, length=50, create_constraint=False,
                         validate_strings=True), default=InstanceStatus.PENDING, nullable=False)
    storage_path = Column(String(255), nullable=False)
    created_at = Column(UTCDateTime(), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(UTCDateTime(), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    owner = relationship("User", back_populates="instances")
