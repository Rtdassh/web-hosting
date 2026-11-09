"""Explicit PostgreSQL migrations; importing this module never starts the API."""
from alembic import context
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
from app.core.database import Base
from app.core.migration_config import migration_url
from app.core.legacy_schema_policy import include_object
from app.core.schema_profiles import metadata_for_profile
import app.models  # noqa: F401 -- register all ten tables

config = context.config
target_metadata = metadata_for_profile(Base.metadata, "fresh")
MANAGED_TABLES = frozenset(target_metadata.tables)


def include_name(name, type_, parent_names):
    # Autogeneration must not propose removing legacy/unmanaged tables.
    if type_ == "schema":
        return name in (None, "public")
    if type_ == "table":
        return name in MANAGED_TABLES
    return True


def selected_url():
    return migration_url(
        context.get_x_argument(as_dictionary=True).get("use_project_database") == "true"
    )


def run_on_connection(connection):
    if connection.dialect.name != "postgresql":
        raise RuntimeError("These migrations require PostgreSQL.")
    with connection.begin():
        connection.execute(text("SELECT set_config('search_path', 'public', true)"))
        context.configure(
            connection=connection, target_metadata=target_metadata,
            version_table_schema="public", compare_type=True,
            include_name=include_name,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    # SQL preview needs neither credentials nor a connection.
    context.configure(
        dialect_name="postgresql", target_metadata=target_metadata,
        literal_binds=True, dialect_opts={"paramstyle": "named"},
        version_table_schema="public", include_name=include_name,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    supplied = config.attributes.get("connection")
    if supplied is not None:
        run_on_connection(supplied)
    else:
        engine = create_engine(selected_url(), poolclass=NullPool, hide_parameters=True)
        try:
            with engine.connect() as connection:
                run_on_connection(connection)
        except Exception:
            raise RuntimeError(
                "Migration failed; transaction rolled back. Check the target and "
                "schema using the documented read-only inventory."
            ) from None
        finally:
            engine.dispose()
