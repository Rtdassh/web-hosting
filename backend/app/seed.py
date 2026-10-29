"""Explicit, additive PostgreSQL seed. Never creates a demo account or resets data."""
import logging
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from app.core.database import SessionLocal
from app.core.config import settings
from app.models import Plan, PortAllocation, Instance

logger = logging.getLogger(__name__)
PLANS = (
    dict(name="Free", description="1 Sitio Web, 128MB RAM, 0.25 vCPU", price=0.0,
         max_instances=1, max_ram_mb=128, cpu_quota=0.25,
         billing_period="monthly", is_active=True),
    dict(name="Developer", description="3 Sitios Web, 256MB RAM, 0.50 vCPU", price=9.99,
         max_instances=3, max_ram_mb=256, cpu_quota=0.50,
         billing_period="monthly", is_active=True),
    dict(name="Pro", description="10 Sitios Web, 512MB RAM, 1.0 vCPU", price=24.99,
         max_instances=10, max_ram_mb=512, cpu_quota=1.0,
         billing_period="monthly", is_active=True),
)


def seed_db(db=None):
    """Use a dedicated session; insert missing plans/ports in one transaction.

    Existing rows are never overwritten. Missing pool rows associated with existing
    instances are inserted as allocated, never as free.
    """
    owned = db is None
    if owned:
        db = SessionLocal()
    try:
        for values in PLANS:
            db.execute(insert(Plan).values(**values).on_conflict_do_nothing(index_elements=["name"]))
        occupied = dict(db.execute(select(Instance.assigned_port, Instance.id)).all())
        for port in range(settings.PORT_RANGE_START, settings.PORT_RANGE_END + 1):
            instance_id = occupied.get(port)
            db.execute(insert(PortAllocation).values(
                port_number=port, is_allocated=instance_id is not None,
                instance_id=instance_id,
            ).on_conflict_do_nothing(index_elements=["port_number"]))
        db.commit()
        logger.info("Semillas completadas sin sobrescribir filas existentes.")
    except Exception:
        db.rollback()
        raise RuntimeError("Seed failed; transaction rolled back. Verify migrated schema.") from None
    finally:
        if owned:
            db.close()


if __name__ == "__main__":
    import argparse
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from app.core.migration_config import migration_url

    parser = argparse.ArgumentParser(description="Explicit additive seed after Alembic upgrade")
    parser.add_argument("--use-project-database", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    seed_engine = create_engine(migration_url(args.use_project_database), hide_parameters=True)
    try:
        with Session(seed_engine) as seed_session:
            seed_db(seed_session)
    finally:
        seed_engine.dispose()
