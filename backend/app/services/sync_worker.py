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
from app.models.instance_status_history import InstanceStatusHistory
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
            # Consultar instancias que la base de datos cree que están corriendo
            running_instances = db.query(Instance).filter(
                Instance.status == InstanceStatus.RUNNING
            ).all()

            for inst in running_instances:
                docker_status = docker_service.get_container_status(inst.container_id)

                # Si el contenedor ya no existe en Docker
                if docker_status == "not_found":
                    logger.warning(
                        f"[RECONCILIATION] Contenedor '{inst.container_id}' (instancia {inst.id}) "
                        f"no existe en Docker. Marcando como FAILED y liberando puerto {inst.assigned_port}."
                    )
                    inst.status = InstanceStatus.FAILED
                    port_service.release_port(db, inst.assigned_port, commit=False)
                    db.add(InstanceStatusHistory(
                        instance_id=inst.id,
                        previous_status=InstanceStatus.RUNNING.value,
                        new_status=InstanceStatus.FAILED.value,
                        reason="Contenedor no encontrado en Docker durante reconciliación periódica (SyncWorker)"
                    ))
                    discrepancies_found += 1
                    reconciled_instances.append(inst.id)

                # Si el contenedor está detenido en Docker pero corriendo en BD
                elif docker_status in ["exited", "stopped", "dead"]:
                    logger.warning(
                        f"[RECONCILIATION] Contenedor '{inst.container_id}' (instancia {inst.id}) "
                        f"detenido en Docker ({docker_status}). Marcando como STOPPED."
                    )
                    inst.status = InstanceStatus.STOPPED
                    db.add(InstanceStatusHistory(
                        instance_id=inst.id,
                        previous_status=InstanceStatus.RUNNING.value,
                        new_status=InstanceStatus.STOPPED.value,
                        reason=f"Contenedor detenido externamente en Docker [{docker_status}] (SyncWorker)"
                    ))
                    discrepancies_found += 1
                    reconciled_instances.append(inst.id)

            if discrepancies_found > 0:
                db.commit()
                logger.info(f"[RECONCILIATION] Se reconciliaron {discrepancies_found} instancias.")

        except Exception as e:
            logger.error(f"[RECONCILIATION] Error durante el ciclo de sincronización: {e}")
            if db:
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
