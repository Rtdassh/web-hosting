from sqlalchemy import Column, Integer, Boolean, ForeignKey
from app.core.database import Base

class PortAllocation(Base):
    """Gestor de puertos TCP para el rango 30001 - 30100 (RF-18)"""
    __tablename__ = "port_allocations"

    port_number = Column(Integer, primary_key=True, index=True)
    is_allocated = Column(Boolean, default=False, nullable=False)
    instance_id = Column(Integer, ForeignKey("instances.id"), nullable=True)
