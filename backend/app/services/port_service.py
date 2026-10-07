import socket
import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.port import PortAllocation
from app.core.config import settings

logger = logging.getLogger(__name__)

class PortService:
    @staticmethod
    def _is_port_free_on_host(port: int) -> bool:
        """Comprueba físicamente mediante un socket TCP si el puerto está libre en el host."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("0.0.0.0", port))
                return True
            except OSError:
                return False

    @staticmethod
    def get_and_reserve_available_port(db: Session, instance_id: int = None) -> int:
        """
        Obtiene y reserva de forma segura el siguiente puerto TCP disponible
        dentro del rango configurado (ej: 30001 - 30100) (RF-18).
        Aplica bloqueo de fila (with_for_update) para concurrencia segura
        y verificación física del socket en el host.
        """
        # 1. Consultar candidatos con bloqueo pesimista
        available_records = (
            db.query(PortAllocation)
            .filter(PortAllocation.is_allocated == False)
            .order_by(PortAllocation.port_number.asc())
            .with_for_update()
            .all()
        )

        for port_record in available_records:
            # Comprobar que realmente esté libre en el host para evitar colisiones
            if PortService._is_port_free_on_host(port_record.port_number):
                port_record.is_allocated = True
                port_record.instance_id = instance_id
                db.commit()
                return port_record.port_number
            else:
                logger.warning(
                    f"Puerto {port_record.port_number} figura libre en BD pero está ocupado en el host."
                )

        # 2. Si no había registros inicializados o ninguno estaba libre físicamente
        existing_ports = {p.port_number for p in db.query(PortAllocation.port_number).all()}
        for candidate in range(settings.PORT_RANGE_START, settings.PORT_RANGE_END + 1):
            if candidate not in existing_ports and PortService._is_port_free_on_host(candidate):
                new_port = PortAllocation(
                    port_number=candidate,
                    is_allocated=True,
                    instance_id=instance_id
                )
                db.add(new_port)
                db.commit()
                db.refresh(new_port)
                return new_port.port_number

        raise HTTPException(
            status_code=status.HTTP_507_INSUFFICIENT_STORAGE,
            detail="No hay puertos TCP disponibles en el host dentro del rango 30001 - 30100."
        )

    @staticmethod
    def link_instance_to_port(db: Session, port_number: int, instance_id: int) -> None:
        """Vincula formalmente el ID de la instancia creada al puerto asignado."""
        port_record = db.query(PortAllocation).filter(PortAllocation.port_number == port_number).first()
        if port_record:
            port_record.instance_id = instance_id
            db.commit()

    @staticmethod
    def release_port(db: Session, port_number: int, commit: bool = True) -> None:
        """Libera atómicamente el puerto en la base de datos."""
        port_record = db.query(PortAllocation).filter(PortAllocation.port_number == port_number).first()
        if port_record:
            port_record.is_allocated = False
            port_record.instance_id = None
            if commit:
                db.commit()

port_service = PortService()
