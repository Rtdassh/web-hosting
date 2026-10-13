"""
Módulo de siembra (seed) — Fuente única de verdad para datos iniciales.
Invocado desde el lifespan de main.py y también ejecutable como script independiente.
"""
import logging
from app.core.database import SessionLocal
from app.core.config import settings
from app.core.hashing import get_password_hash
from app.models.plan import Plan
from app.models.port import PortAllocation
from app.models.user import User, UserRole
from app.models.plan import Subscription

logger = logging.getLogger(__name__)


def seed_db(db=None):
    """Siembra planes, usuario de desarrollo y pool de puertos si las tablas están vacías."""
    close_at_end = False
    if db is None:
        db = SessionLocal()
        close_at_end = True

    try:
        # 1. Sembrar planes base si la tabla está vacía
        if not db.query(Plan).first():
            plans = [
                Plan(
                    name="Free",
                    description="1 Sitio Web, 128MB RAM, 0.25 vCPU",
                    price=0.0,
                    max_instances=1,
                    max_ram_mb=128,
                    cpu_quota=0.25
                ),
                Plan(
                    name="Developer",
                    description="3 Sitios Web, 256MB RAM, 0.50 vCPU",
                    price=9.99,
                    max_instances=3,
                    max_ram_mb=256,
                    cpu_quota=0.50
                ),
                Plan(
                    name="Pro",
                    description="10 Sitios Web, 512MB RAM, 1.0 vCPU",
                    price=24.99,
                    max_instances=10,
                    max_ram_mb=512,
                    cpu_quota=1.0
                ),
            ]
            db.add_all(plans)
            db.commit()
            logger.info("Planes base (Free, Developer, Pro) creados.")

        # 2. Sembrar usuario inicial de desarrollo para prevenir violación de clave foránea
        if not db.query(User).first():
            demo_user = User(
                email="dev@cloudpaas.local",
                hashed_password=get_password_hash("admin123"),
                full_name="Desarrollador CloudPaaS",
                role=UserRole.CLIENT,
                is_active=True,
                is_verified=True
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)

            free_plan = db.query(Plan).filter(Plan.name == "Free").first()
            if free_plan:
                sub = Subscription(user_id=demo_user.id, plan_id=free_plan.id, status="active")
                db.add(sub)
                db.commit()
            logger.info("Usuario inicial de desarrollo (dev@cloudpaas.local) creado.")

        # 3. Sembrar pool de puertos disponibles (30001 - 30100)
        if not db.query(PortAllocation).first():
            ports = [
                PortAllocation(port_number=p, is_allocated=False)
                for p in range(settings.PORT_RANGE_START, settings.PORT_RANGE_END + 1)
            ]
            db.bulk_save_objects(ports)
            db.commit()
            logger.info(f"Pool de puertos ({settings.PORT_RANGE_START}-{settings.PORT_RANGE_END}) inicializado.")

        logger.info("Proceso de siembra completado.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error al poblar la base de datos: {e}")
    finally:
        if close_at_end:
            db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_db()