1import os
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
    DOCKER_IMAGE_NAME: str = "cloudpaas/nginx-hosting:latest"
    DOCKER_NETWORK: str = "paas_instances_network"
    HOST_PUBLIC_IP: str = "100.112.65.75"
    HOSTING_STORAGE_PATH: str = "/srv/hosting/instancias"
    PORT_RANGE_START: int = 30001
    PORT_RANGE_END: int = 30100
    
    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def RESOLVED_STORAGE_PATH(self) -> Path:
        """Resuelve la ruta de almacenamiento de forma absoluta independiente del CWD."""
        p = Path(self.HOSTING_STORAGE_PATH)
        if p.is_absolute() and (p.exists() or Path("/srv/hosting").exists()):
            return p
        # Si existe /srv/hosting/instancias en el sistema anfitrión
        srv_path = Path("/srv/hosting/instancias")
        if srv_path.exists():
            return srv_path
        # Fallback a directorio local en el repositorio para desarrollo local aislado
        candidate = (PROJECT_ROOT / "infra/host-storage/instances").resolve()
        return candidate

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

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

