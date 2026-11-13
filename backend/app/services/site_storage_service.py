"""Private, bounded operational data; never placed inside a published document root."""
import json
import os
import re
import uuid
from pathlib import Path
from app.core.config import settings


def site_data_dir(instance) -> Path:
    # Numeric database IDs are stable, including for legacy storage paths.
    root = settings.RESOLVED_STORAGE_PATH.resolve() / ".site-data"
    return root / str(int(instance.id))


def safe_content_path(value: str) -> Path:
    path = Path(value).resolve()
    root = settings.RESOLVED_STORAGE_PATH.resolve()
    if path == root or not path.is_relative_to(root):
        raise ValueError("Storage path outside configured root")
    return path


def atomic_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        with temporary.open("w", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False)
            stream.flush()
            os.fsync(stream.fileno())
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def release_path(instance, release_id: str) -> Path:
    if not re.fullmatch(r"[a-f0-9]{32}", release_id):
        raise ValueError("Invalid release ID")
    return site_data_dir(instance) / "releases" / release_id
