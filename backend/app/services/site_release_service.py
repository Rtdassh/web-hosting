"""Versioned ZIP publishing with a recoverable Docker handover on the same port."""
import logging
import shutil
import time
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.instance import Instance, InstanceStatus
from app.models.plan import Subscription
from app.services.artifact_service import artifact_service
from app.services.docker_service import docker_service
from app.services.instance_service import InstanceService
from app.services.site_storage_service import atomic_json, read_json, release_path, safe_content_path, site_data_dir
from app.services.site_monitor_service import site_monitor_service
from app.services.subscription_service import require_current_subscription_plan
from app.services.action_audit_service import audit_action

logger = logging.getLogger(__name__)


class SiteReleaseService:
    def owned(self, instance_id: int, user, db: Session, lock: bool = False) -> Instance:
        query = db.query(Instance).filter(Instance.id == instance_id)
        if lock:
            query = query.with_for_update()
        instance = query.first()
        if not instance:
            raise HTTPException(404, "Instancia no encontrada.")
        InstanceService._enforce_ownership(instance, user)
        return instance

    def versions(self, instance) -> list[dict]:
        root = site_data_dir(instance) / "releases"
        result = []
        if root.exists():
            for directory in root.iterdir():
                meta = read_json(directory / "release.json", None)
                if not meta:
                    continue
                result.append({"id": directory.name, "created_at": meta['created_at'],
                               "size_bytes": meta['size_bytes'],
                               "active": str(directory / 'site') == instance.storage_path or meta.get('legacy_path') == instance.storage_path})
        return sorted(result, key=lambda row: row['created_at'], reverse=True)

    def _metadata(self, directory, **extra) -> None:
        size = sum(p.stat().st_size for p in (directory / 'site').rglob('*') if p.is_file())
        atomic_json(directory / 'release.json', {"created_at": datetime.now(timezone.utc).isoformat(), "size_bytes": size, **extra})

    def recover(self, instance) -> None:
        """Called under the instance row lock after an interrupted handover."""
        journal = site_data_dir(instance) / 'handover.json'
        pending = read_json(journal, None)
        if not pending:
            return
        if instance.storage_path == pending['target_path']:
            if not docker_service.remove_instance(pending['old_container']):
                raise RuntimeError('Pending old container cleanup')
        else:
            if not docker_service.remove_instance(pending['new_name']):
                raise RuntimeError('Pending candidate cleanup')
            if pending['was_running'] and not docker_service.start_instance(pending['old_container']):
                raise RuntimeError('Could not restore previous container')
        journal.unlink(missing_ok=True)

    def publish(self, instance_id: int, user, db: Session, file: UploadFile | None = None, version_id: str | None = None) -> list[dict]:
        instance = self.owned(instance_id, user, db, lock=True)
        if instance.status not in (InstanceStatus.RUNNING, InstanceStatus.STOPPED):
            raise HTTPException(409, "Recupera la instancia antes de actualizarla.")
        plan = require_current_subscription_plan(db.query(Subscription).filter(Subscription.user_id == instance.user_id, Subscription.status == 'active').first())
        self.recover(instance)
        staged = None
        try:
            if file is not None:
                staged = release_path(instance, uuid.uuid4().hex)
                artifact_service.sanitize_and_extract_zip(file, str(staged / 'site'))
                # Snapshot original before the first replacement, not the staged candidate.
                others = self.versions(instance)
                if not others:
                    source = safe_content_path(instance.storage_path)
                    baseline = release_path(instance, uuid.uuid4().hex)
                    try:
                        shutil.copytree(source, baseline / 'site')
                        self._metadata(baseline, legacy_path=str(source))
                        atomic_json(site_data_dir(instance) / 'origin.json', {"path": str(source)})
                    except Exception:
                        shutil.rmtree(baseline, ignore_errors=True)
                        raise
                self._metadata(staged)
                target = staged / 'site'
            else:
                try:
                    directory = release_path(instance, version_id or '')
                except ValueError:
                    raise HTTPException(400, "Versión inválida.") from None
                if not (directory / 'release.json').is_file() or not (directory / 'site').is_dir():
                    raise HTTPException(404, "Versión no encontrada.")
                target = directory / 'site'
            if str(target) == instance.storage_path:
                return self.versions(instance)
            self._switch(instance, target, plan, db)
        except Exception:
            if staged and str(staged / 'site') != instance.storage_path and not (site_data_dir(instance) / 'handover.json').exists():
                shutil.rmtree(staged, ignore_errors=True)
            raise
        # Retention must never turn a committed deployment into a failed request.
        try:
            versions = self.versions(instance)
            inactive = [v for v in versions if not v['active']]
            for version in inactive[max(0, settings.RELEASES_RETAINED - 1):]:
                shutil.rmtree(release_path(instance, version['id']))
        except OSError:
            logger.exception('Pending version retention cleanup')
        audit_action(user.id, instance.id, 'publish' if file else 'rollback', 'success')
        return self.versions(instance)

    def _switch(self, instance, target, plan, db: Session) -> None:
        old_container, old_path = instance.container_id, instance.storage_path
        was_running = instance.status == InstanceStatus.RUNNING
        new_name = f"paas_release_{instance.uuid}_{uuid.uuid4().hex[:8]}"
        journal = site_data_dir(instance) / 'handover.json'
        atomic_json(journal, {"old_container": old_container, "new_name": new_name, "target_path": str(target), "was_running": was_running})
        committed = False
        try:
            if not docker_service.stop_instance(old_container):
                raise RuntimeError('Could not stop original')
            candidate = docker_service.run_nginx_instance(container_name=new_name, host_port=instance.assigned_port,
                host_storage_path=str(target), ram_limit_mb=plan.max_ram_mb, cpu_quota=plan.cpu_quota,
                user_id=instance.user_id, instance_uuid=instance.uuid)
            for attempt in range(10):
                if site_monitor_service.probe(instance.assigned_port)['status'] == 'up':
                    break
                time.sleep(0.2)
            else:
                raise RuntimeError('Candidate did not pass HTTP readiness')
            if not was_running and not docker_service.stop_instance(candidate):
                raise RuntimeError('Could not preserve stopped state')
            instance.container_id, instance.storage_path = candidate, str(target)
            db.commit()
            committed = True
        except Exception:
            db.rollback()
            # Recover uses the database source of truth. The old container is retained
            # until commit, so restoring does not require rebuilding its configuration.
            instance.storage_path, instance.container_id = old_path, old_container
            try:
                self.recover(instance)
            except Exception:
                logger.exception('Handover pending recovery by SyncWorker')
            raise HTTPException(503, "No se pudo publicar. Se intentó restaurar la versión anterior; revisa el estado antes de reintentar.") from None
        finally:
            if committed:
                try:
                    self.recover(instance)
                except Exception:
                    logger.exception('Committed release pending cleanup')

    def cleanup(self, instance) -> None:
        root = site_data_dir(instance)
        origin = read_json(root / 'origin.json', {})
        if origin.get('path'):
            original = safe_content_path(origin['path'])
            if not original.is_relative_to(settings.RESOLVED_STORAGE_PATH.resolve() / '.site-data'):
                shutil.rmtree(original, ignore_errors=True)
        shutil.rmtree(root, ignore_errors=True)


site_release_service = SiteReleaseService()
