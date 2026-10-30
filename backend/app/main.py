import logging
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
    # Schema and seed are explicit deployment steps; API startup never writes them.
    logger.info("Esquema gestionado con Alembic; semillas mediante app.seed.")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
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
