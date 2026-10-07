from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.core.database import Base


class InstanceStatusHistory(Base):
    __tablename__ = "instance_status_history"

    id = Column(Integer, primary_key=True)
    instance_id = Column(
        Integer,
        ForeignKey("instances.id", ondelete="CASCADE"),
        nullable=False,
    )
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    reason = Column(Text, nullable=True)
    changed_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
