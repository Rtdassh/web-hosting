import logging
import asyncio
from app.services.sync_worker import SyncWorker
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.api.v1.api import api_router


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("paas-core")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # El esquema y las semillas se gestionan fuera del arranque.
    logger.info("Esquema gestionado con Alembic; semillas mediante app.seed.")

    worker = SyncWorker(interval_seconds=30)
    app.state.sync_worker = worker
    task = asyncio.create_task(worker.start_periodic_sync())
    await asyncio.sleep(0)

    try:
        yield
    finally:
        worker.stop()
        await task
        logger.info("SyncWorker detenido correctamente.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description=(
        "API REST de Codrop CloudPaaS para registro, autenticación, verificación de correo, "
        "administración de instancias y suscripciones. "
        "Los endpoints protegidos requieren un JWT Bearer válido."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "Autenticación",
            "description": "Registro, activación de correo, inicio de sesión y recuperación.",
        },
        {
            "name": "Health Check",
            "description": "Comprobación de disponibilidad de la API.",
        },
    ],
    lifespan=lifespan
)


@app.exception_handler(RequestValidationError)
async def safe_checkout_validation_error(request: Request, exc: RequestValidationError):
    if request.url.path == f"{settings.API_V1_STR}/billing/checkout":
        safe_errors = [
            {
                "loc": error["loc"],
                "msg": error["msg"],
                "type": error["type"],
            }
            for error in exc.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": safe_errors})
    return await request_validation_exception_handler(request, exc)


# Configuración de CORS con orígenes explícitos y soporte de red Tailscale (100.x.x.x)
allowed_origins = list(dict.fromkeys([
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    f"http://{settings.HOST_PUBLIC_IP}:5173",
    "http://100.121.210.57:5173",
    "http://100.112.65.75:5173",
    "http://100.120.114.9:5173",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|100\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)

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
