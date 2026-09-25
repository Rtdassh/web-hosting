from app.core.database import SessionLocal
from app.core.config import settings
from app.models.plan import Plan
from app.models.port import PortAllocation

def seed_db():
    db = SessionLocal()
    try:
        existing_plans = db.query(Plan).count()
        if existing_plans == 0:
            plans = [
                Plan(
                    name="Free",
                    description="Plan básico para pruebas",
                    price=0.0,
                    max_instances=1,
                    max_ram_mb=128,
                    cpu_quota=0.25
                ),
                Plan(
                    name="Developer",
                    description="Plan para desarrolladores",
                    price=5.0,
                    max_instances=3,
                    max_ram_mb=256,
                    cpu_quota=0.50
                ),
                Plan(
                    name="Pro",
                    description="Plan profesional de alto rendimiento",
                    price=15.0,
                    max_instances=10,
                    max_ram_mb=512,
                    cpu_quota=1.00
                ),
            ]
            db.add_all(plans)
            print("✔ Planes iniciales agregados.")

        existing_ports = db.query(PortAllocation).count()
        if existing_ports == 0:
            start_port = settings.PORT_RANGE_START
            end_port = settings.PORT_RANGE_END
            
            ports = [
                PortAllocation(port_number=port, is_allocated=False)
                for port in range(start_port, end_port + 1)
            ]
            db.add_all(ports)
            print(f"✔ Pool de puertos ({start_port}-{end_port}) inicializado.")

        db.commit()
        print("🚀 Proceso de siembra completado.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error al poblar la base de datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()