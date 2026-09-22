from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.port import PortAllocation
from app.core.config import settings

class PortService:
    @staticmethod
    def get_and_reserve_available_port(db: Session, instance_id: int = None) -> int:
        """
        Obtiene y reserva de forma segura el siguiente puerto TCP disponible
        dentro del rango configurado (ej: 30001 - 30100) (RF-18).
        """
        # Buscar en la tabla de asignaciones
        port_record = db.query(PortAllocation).filter(PortAllocation.is_allocated == False).order_by(PortAllocation.port_number.asc()).first()
        
        if not port_record:
            # Si aún no se han poblado, inicializar un puerto en el rango
            existing_ports = {p.port_number for p in db.query(PortAllocation.port_number).all()}
            for candidate in range(settings.PORT_RANGE_START, settings.PORT_RANGE_END + 1):
                if candidate not in existing_ports:
                    port_record = PortAllocation(port_number=candidate, is_allocated=True, instance_id=instance_id)
                    db.add(port_record)
                    db.commit()
                    db.refresh(port_record)
                    return port_record.port_number

            raise HTTPException(
                status_code=507,
                detail="No hay puertos TCP disponibles en el host para nuevos despliegues."
            )

        port_record.is_allocated = True
        port_record.instance_id = instance_id
        db.commit()
        return port_record.port_number

    @staticmethod
    def release_port(db: Session, port_number: int):
        port_record = db.query(PortAllocation).filter(PortAllocation.port_number == port_number).first()
        if port_record:
            port_record.is_allocated = False
            port_record.instance_id = None
            db.commit()

port_service = PortService()
