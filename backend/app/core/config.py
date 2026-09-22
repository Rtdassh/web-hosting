import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Raíces del proyecto para resolución consistente de rutas
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "CloudPaaS Web Hosting"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"
    
    # Seguridad JWT
    SECRET_KEY: str = "clave_secreta_super_segura_desarrollo_cambiar_luego"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas (RNF-06)
    
    # Base de Datos PostgreSQL
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "paas_admin"
    POSTGRES_PASSWORD: str = "paas_secret_password"
    POSTGRES_DB: str = "paas_db"
    
    # Docker Engine y Almacenamiento
    DOCKER_SOCKET_PATH: str = "/var/run/docker.sock"
    HOSTING_STORAGE_PATH: str = "./infra/host-storage/instances"
    PORT_RANGE_START: int = 30001
    PORT_RANGE_END: int = 30100
    
    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def RESOLVED_STORAGE_PATH(self) -> Path:
        """Resuelve la ruta de almacenamiento de forma absoluta independiente del CWD."""
        p = Path(self.HOSTING_STORAGE_PATH)
        if not p.is_absolute():
            candidate = (PROJECT_ROOT / p).resolve()
            if candidate.exists() or (PROJECT_ROOT / "infra").exists():
                return candidate
        return p.resolve()

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        case_sensitive = True
        # Admite .env en la raíz del monorepo o en la carpeta backend
        env_file = (
            str(PROJECT_ROOT / ".env"),
            str(BACKEND_DIR / ".env"),
            ".env"
        )
        extra = "allow"

settings = Settings()

