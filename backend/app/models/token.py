"""
Legacy one-time-token table used for password recovery and email verification.
Verification hashes are purpose-prefixed to prevent cross-use.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.model_types import UTCDateTime


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(UTCDateTime(), nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(UTCDateTime(), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", backref="reset_tokens")
