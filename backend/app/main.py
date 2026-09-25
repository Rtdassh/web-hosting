import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.models import User, UserRole, Plan, Subscription, Instance, PortAllocation
from app.api.v1.api import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("paas-core")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # [ESTRUCTURA BASE]: Inicialización de tablas y datos semilla al arrancar
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Tablas de base de datos verificadas/creadas.")
        
        db = SessionLocal()
        
        # 1. Sembrar planes base si la tabla está vacía
        if not db.query(Plan).first():
            free_plan = Plan(name="Free", description="1 Sitio Web, 128MB RAM, 0.25 vCPU", price=0.0, max_instances=1, max_ram_mb=128, cpu_quota=0.25)
            dev_plan = Plan(name="Developer", description="3 Sitios Web, 256MB RAM, 0.50 vCPU", price=9.99, max_instances=3, max_ram_mb=256, cpu_quota=0.50)
            pro_plan = Plan(name="Pro", description="10 Sitios Web, 512MB RAM, 1.0 vCPU", price=24.99, max_instances=10, max_ram_mb=512, cpu_quota=1.0)
            db.add_all([free_plan, dev_plan, pro_plan])
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
            ports = [PortAllocation(port_number=p, is_allocated=False) for p in range(settings.PORT_RANGE_START, settings.PORT_RANGE_END + 1)]
            db.bulk_save_objects(ports)
            db.commit()
            logger.info(f"Pool de puertos ({settings.PORT_RANGE_START}-{settings.PORT_RANGE_END}) inicializado.")

        db.close()
    except Exception as e:
        logger.warning(f"No se pudo conectar a la BD durante el arranque: {e}. Asegúrate de levantar 'docker-compose.dev.yml'.")
    
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Configuración de CORS con orígenes explícitos para compatibilidad con credenciales
allowed_origins = list(dict.fromkeys([
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# [FUTURA IMPLEMENTACIÓN]: Los miembros del equipo añadirán aquí nuevos routers o sub-módulos
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }
