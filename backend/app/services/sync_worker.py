"""
Demonio de Reconciliación Periódica de Estado Docker <-> PostgreSQL (RNF-09 - Hito 100% - Rol 4).
Mantiene la consistencia del sistema ante fallas externas o detenciones manuales en el host.
"""
import asyncio
import logging
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.instance import Instance, InstanceStatus
from app.services.docker_service import docker_service
from app.services.port_service import port_service

logger = logging.getLogger("sync_worker")


class SyncWorker:
    def __init__(self, interval_seconds: int = 30):
        self.interval_seconds = interval_seconds
        self.is_running = False

    def reconcile_states(self, db: Session) -> Dict[str, Any]:
        """
        Ejecuta una pasada de reconciliación entre Docker Daemon y PostgreSQL.
        """
        discrepancies_found = 0
        reconciled_instances = []

        if not docker_service.client:
            logger.info("Docker Daemon no disponible; omitiendo ciclo de reconciliación.")
            return {"status": "skipped", "reason": "docker_unavailable"}

        try:
            # Obtener todos los contenedores gestionados
            active_containers = {c.name: c.status for c in docker_service.client.containers.list(all=True)}
            
            # Consultar instancias que la base de datos cree que están corriendo
            running_instances = db.query(Instance).filter(
                Instance.status == InstanceStatus.RUNNING
            ).all()

            for inst in running_instances:
                expected_container_name = f"paas_{inst.user_id}_{inst.uuid}"
                docker_status = active_containers.get(expected_container_name)

                # Si el contenedor ya no existe en Docker
                if not docker_status:
                    logger.warning(f"[RECONCILIATION] Contenedor '{expected_container_name}' no existe en Docker. Marcando como FAILED.")
                    inst.status = InstanceStatus.FAILED
                    port_service.release_port(inst.assigned_port, db)
                    discrepancies_found += 1
                    reconciled_instances.append(inst.id)
                # Si el contenedor está detenido en Docker pero corriendo en BD
                elif docker_status in ["exited", "dead"]:
                    logger.warning(f"[RECONCILIATION] Contenedor '{expected_container_name}' detenido en Docker. Marcando como STOPPED.")
                    inst.status = InstanceStatus.STOPPED
                    discrepancies_found += 1
                    reconciled_instances.append(inst.id)

            if discrepancies_found > 0:
                db.commit()
                logger.info(f"[RECONCILIATION] Se reconciliaron {discrepancies_found} instancias.")

        except Exception as e:
            logger.error(f"[RECONCILIATION] Error durante el ciclo de sincronización: {e}")
            db.rollback()

        return {
            "discrepancies_found": discrepancies_found,
            "reconciled_instances": reconciled_instances
        }

    async def start_periodic_sync(self):
        """Loop asíncrono para ejecutar la reconciliación periódica en background."""
        self.is_running = True
        logger.info(f"SyncWorker iniciado con intervalo de {self.interval_seconds}s.")
        while self.is_running:
            try:
                db = SessionLocal()
                self.reconcile_states(db)
                db.close()
            except Exception as e:
                logger.error(f"Error en loop de SyncWorker: {e}")
            await asyncio.sleep(self.interval_seconds)

    def stop(self):
        self.is_running = False


sync_worker = SyncWorker()
