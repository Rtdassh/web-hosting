"""
Demonio de Reconciliación Periódica de Estado Docker <-> PostgreSQL (RNF-09 - Hito 100% - Rol 4).
Mantiene la consistencia del sistema ante fallas externas o detenciones manuales en el host.
"""
import asyncio
import logging
from sqlalchemy import text

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
        self._stop_event = None

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
            # Revisar instancias activas y detenidas.
            running_instances = db.query(Instance).filter(
                Instance.status.in_([
                    InstanceStatus.RUNNING,
                    InstanceStatus.STOPPED
                ])
            ).all()

            for inst in running_instances:
                previous_status = inst.status
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
                        previous_status=previous_status.value,
                        new_status=InstanceStatus.FAILED.value,
                        reason="Contenedor no encontrado en Docker durante reconciliación periódica (SyncWorker)"
                    ))
                    discrepancies_found += 1
                    reconciled_instances.append(inst.id)

                # Si el contenedor está detenido en Docker pero corriendo en BD
                elif (
                    docker_status in ["exited", "stopped", "dead"]
                    and previous_status != InstanceStatus.STOPPED
                ):
                    logger.warning(
                        f"[RECONCILIATION] Contenedor '{inst.container_id}' (instancia {inst.id}) "
                        f"detenido en Docker ({docker_status}). Marcando como STOPPED."
                    )
                    inst.status = InstanceStatus.STOPPED
                    db.add(InstanceStatusHistory(
                        instance_id=inst.id,
                        previous_status=previous_status.value,
                        new_status=InstanceStatus.STOPPED.value,
                        reason=f"Contenedor detenido externamente en Docker [{docker_status}] (SyncWorker)"
                    ))
                    discrepancies_found += 1
                    reconciled_instances.append(inst.id)

            if discrepancies_found > 0:
                db.commit()
                logger.info(f"[RECONCILIATION] Se reconciliaron {discrepancies_found} instancias.")

        except Exception:
            logger.exception(
                "[RECONCILIATION] No se pudo completar el ciclo."
            )
            db.rollback()
            raise

        return {
            "discrepancies_found": discrepancies_found,
            "reconciled_instances": reconciled_instances
        }

    def _run_sync_cycle(self):
        """Ejecuta un ciclo exclusivo y cierra siempre la sesión."""
        db = SessionLocal()
        try:
            acquired = db.execute(
                text("SELECT pg_try_advisory_xact_lock(:lock_id)"),
                {"lock_id": 7304100}
            ).scalar()

            if acquired is not True:
                return {
                    "status": "skipped",
                    "reason": "another_worker_running"
                }

            return self.reconcile_states(db)
        finally:
            db.close()

    async def start_periodic_sync(self):
        """Ejecuta la reconciliación sin bloquear el bucle de la API."""
        self._stop_event = asyncio.Event()
        self.is_running = True
        logger.info(
            "SyncWorker iniciado con intervalo de %ss.",
            self.interval_seconds
        )

        try:
            while self.is_running:
                try:
                    await asyncio.to_thread(self._run_sync_cycle)
                except Exception:
                    logger.exception("Error en el ciclo de SyncWorker.")

                if self.is_running:
                    try:
                        await asyncio.wait_for(
                            self._stop_event.wait(),
                            timeout=self.interval_seconds
                        )
                    except asyncio.TimeoutError:
                        pass  # Timeout esperado, continuar con el siguiente ciclo
        finally:
            self.is_running = False

    def stop(self):
        self.is_running = False
        if self._stop_event is not None:
            self._stop_event.set()


sync_worker = SyncWorker()
