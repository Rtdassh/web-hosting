import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.api.v1.api import api_router

from app.seed import seed_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("paas-core")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # [ESTRUCTURA BASE]: Inicialización de tablas y datos semilla al arrancar
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Tablas de base de datos verificadas/creadas.")
        
        db = SessionLocal()
        seed_db(db)
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
