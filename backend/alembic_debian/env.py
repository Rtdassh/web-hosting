"""Opt-in Debian lineage. No offline adoption or unverified stamping path."""
import json
from pathlib import Path
from alembic import context
import sqlalchemy as sa
from sqlalchemy.pool import NullPool
from app.core.migration_config import migration_url
from app.core.legacy_schema_policy import include_object
from app.core.database import Base
from app.core.schema_profiles import metadata_for_profile
import app.models  # noqa: F401
from alembic_debian.evidence import session_settings

config = context.config


def reject_stamp(ctx, step, heads, run_args):
    if step.is_stamp:
        raise RuntimeError("Stamp is disabled for Debian adoption; execute the verified migration.")


def run(connection):
    if connection.dialect.name != "postgresql":
        raise RuntimeError("PostgreSQL required.")
    with connection.begin():
        session_settings(connection)
        target_metadata = metadata_for_profile(Base.metadata, "debian")
        context.configure(connection=connection, target_metadata=target_metadata,
                          version_table_schema="public", compare_type=True,
                          include_name=lambda name, type_, parents: type_ != "table" or name in Base.metadata.tables,
                          include_object=include_object, on_version_apply=reject_stamp)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    raise RuntimeError("Legacy adoption requires online catalog/data verification on an isolated copy.")
else:
    args = context.get_x_argument(as_dictionary=True)
    if "debian_evidence" not in config.attributes and args.get("manifest"):
        config.attributes["debian_evidence"] = json.loads(Path(args["manifest"]).read_text(encoding="utf-8"))
        config.attributes["debian_digest"] = args.get("evidence_sha256")
    supplied = config.attributes.get("connection")
    if supplied is not None:
        run(supplied)
    else:
        engine = sa.create_engine(migration_url(args.get("use_project_database") == "true"), poolclass=NullPool, hide_parameters=True)
        try:
            with engine.connect() as connection:
                run(connection)
        except Exception:
            raise RuntimeError("Debian adoption blocked or failed; transaction rolled back. Run the read-only audit for details.") from None
        finally:
            engine.dispose()
