"""Explicit migration/seed target selection, without logging secrets."""
import os
from sqlalchemy.engine import URL, make_url


def migration_url(use_project_database=False):
    value = os.environ.get("CODROP_MIGRATION_DATABASE_URL")
    if value:
        try:
            url = make_url(value)
        except Exception:
            raise RuntimeError("Invalid migration connection configuration.") from None
    elif use_project_database:
        from app.core.config import settings
        url = URL.create(
            "postgresql+psycopg2", username=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD, host=settings.POSTGRES_SERVER,
            port=settings.POSTGRES_PORT, database=settings.POSTGRES_DB,
        )
    else:
        raise RuntimeError(
            "No target selected. Set CODROP_MIGRATION_DATABASE_URL or explicitly "
            "select the project database. No connection was attempted."
        )
    if url.get_backend_name() != "postgresql":
        raise RuntimeError("These migrations require PostgreSQL.")
    return url
