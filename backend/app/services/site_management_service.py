"""Owner-scoped metadata, read-only files, portable backups and activity history."""
import os
import tempfile
import zipfile
from pathlib import Path
from typing import BinaryIO
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.instance import Instance
from app.models.instance_status_history import InstanceStatusHistory
from app.models.user import User
from app.services.site_release_service import site_release_service
from app.services.site_storage_service import safe_content_path


class SiteManagementService:
    def rename(self, instance_id: int, name: str, user: User, db: Session) -> Instance:
        instance = site_release_service.owned(instance_id, user, db, lock=True)
        if instance.name == name:
            return instance
        try:
            instance.name = name
            current = getattr(instance.status, 'value', instance.status)
            db.add(InstanceStatusHistory(instance_id=instance.id, previous_status=current,
                new_status=current, reason='Nombre del proyecto actualizado'))
            db.commit()
            db.refresh(instance)
        except Exception:
            db.rollback()
            raise HTTPException(500, 'No se pudo guardar el nombre del proyecto.') from None
        return instance

    def root(self, instance: Instance) -> Path:
        try:
            root = safe_content_path(instance.storage_path)
        except (ValueError, OSError):
            raise HTTPException(409, 'El almacenamiento del sitio no está disponible.') from None
        if not root.is_dir():
            raise HTTPException(404, 'Los archivos del sitio no están disponibles.')
        return root

    def resolve(self, root: Path, relative: str) -> Path:
        # Accept only relative POSIX paths. No symlink, even if it resolves inside root.
        if '\\' in relative or ':' in relative or '\x00' in relative or relative.startswith('/') or '..' in relative.split('/'):
            raise HTTPException(400, 'Ruta de archivo inválida.')
        target = root
        for part in relative.split('/'):
            if not part or part == '.':
                continue
            target = target / part
            if target.is_symlink():
                raise HTTPException(400, 'No se permiten enlaces simbólicos.')
        if not target.resolve().is_relative_to(root):
            raise HTTPException(400, 'Ruta fuera del sitio.')
        if not target.exists():
            raise HTTPException(404, 'Archivo o carpeta no encontrado.')
        return target

    def inventory(self, root: Path) -> tuple[list[dict], int, int]:
        entries, total_bytes, files = [], 0, 0
        def on_error(error: OSError) -> None:
            raise error
        try:
            for directory, dirs, names in os.walk(root, followlinks=False, onerror=on_error):
                for name in dirs + names:
                    path = Path(directory) / name
                    if path.is_symlink():
                        raise HTTPException(409, 'El sitio contiene enlaces simbólicos; no se puede exportar.')
                    is_directory = path.is_dir()
                    size = None if is_directory else path.stat().st_size
                    entries.append({'name': name, 'path': path.relative_to(root).as_posix(),
                        'kind': 'directory' if is_directory else 'file', 'size_bytes': size})
                    files += int(not is_directory)
                    total_bytes += size or 0
                    if len(entries) > settings.SITE_FILE_SCAN_LIMIT or total_bytes > settings.SITE_EXPORT_MAX_MB * 1024 * 1024:
                        raise HTTPException(413, 'El sitio supera el límite de exploración o exportación.')
        except OSError:
            raise HTTPException(409, 'No se pudieron leer todos los archivos del sitio.') from None
        return entries, files, total_bytes

    def files(self, instance: Instance, relative: str, offset: int, limit: int) -> dict:
        root = self.root(instance)
        directory = self.resolve(root, relative)
        if not directory.is_dir():
            raise HTTPException(400, 'Selecciona una carpeta.')
        entries, count, size = self.inventory(root)
        parent = directory.relative_to(root).as_posix()
        children = [entry for entry in entries if Path(entry['path']).parent.as_posix() == parent]
        children.sort(key=lambda entry: (entry['kind'] != 'directory', entry['name'].casefold()))
        return {'path': '' if parent == '.' else parent, 'entries': children[offset:offset + limit],
            'total_entries': len(children), 'total_files': count, 'size_bytes': size, 'offset': offset, 'limit': limit}

    def backup(self, instance: Instance) -> BinaryIO:
        root = self.root(instance)
        entries, _, _ = self.inventory(root)
        stream = tempfile.SpooledTemporaryFile(max_size=8 * 1024 * 1024)
        try:
            with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
                for entry in entries:
                    source = self.resolve(root, entry['path'])
                    archive.write(source, arcname=entry['path'])
            stream.seek(0)
            return stream
        except Exception:
            stream.close()
            raise

    def activity(self, instance: Instance, db: Session) -> list[InstanceStatusHistory]:
        return db.query(InstanceStatusHistory).filter(InstanceStatusHistory.instance_id == instance.id).order_by(
            InstanceStatusHistory.changed_at.desc(), InstanceStatusHistory.id.desc()).limit(50).all()


site_management_service = SiteManagementService()
