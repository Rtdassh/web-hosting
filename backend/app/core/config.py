from email.utils import parseaddr
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

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

    # Password reset email
    PASSWORD_RESET_SMTP_HOST: str | None = None
    PASSWORD_RESET_SMTP_PORT: int = Field(default=1025, ge=1, le=65535)
    PASSWORD_RESET_SMTP_SECURITY: Literal["none", "starttls", "ssl"] = "none"
    PASSWORD_RESET_SMTP_USERNAME: str | None = None
    PASSWORD_RESET_SMTP_PASSWORD: str | None = None
    PASSWORD_RESET_FROM_EMAIL: str | None = None
    PASSWORD_RESET_FRONTEND_URL: str = "http://localhost:5173/"
    PASSWORD_RESET_SMTP_TIMEOUT_SECONDS: int = Field(default=10, gt=0)

    @field_validator(
        "PASSWORD_RESET_SMTP_HOST",
        "PASSWORD_RESET_SMTP_USERNAME",
        mode="before",
    )
    @classmethod
    def strip_password_reset_smtp_text(cls, value: str | None) -> str | None:
        return value.strip() if isinstance(value, str) else value

    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, value: str) -> str:
        environment = value.strip().lower()
        if environment not in {"development", "testing", "production"}:
            raise ValueError(
                "ENVIRONMENT must be development, testing, or production."
            )
        return environment

    @field_validator("PASSWORD_RESET_FRONTEND_URL")
    @classmethod
    def validate_password_reset_frontend_url(cls, value: str) -> str:
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.username is not None
            or parsed.password is not None
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError(
                "PASSWORD_RESET_FRONTEND_URL must be an HTTP(S) URL without credentials, query, or fragment."
            )
        return value

    @property
    def password_reset_smtp_enabled(self) -> bool:
        has_username = bool(self.PASSWORD_RESET_SMTP_USERNAME)
        has_password = bool(self.PASSWORD_RESET_SMTP_PASSWORD)
        sender = self.PASSWORD_RESET_FROM_EMAIL or ""
        sender_address = parseaddr(sender)[1]
        local_part, separator, domain = sender.partition("@")
        valid_sender = (
            sender_address == sender
            and bool(separator and local_part and domain)
            and not any(character.isspace() for character in sender)
            and "\r" not in sender
            and "\n" not in sender
        )
        return bool(
            self.PASSWORD_RESET_SMTP_HOST
            and self.PASSWORD_RESET_SMTP_HOST.strip()
            and valid_sender
            and (has_username == has_password)
            and (not has_username or self.PASSWORD_RESET_SMTP_SECURITY != "none")
        )

    def model_post_init(self, __context) -> None:
        if self.ENVIRONMENT != "production":
            return

        defaults = type(self).model_fields
        secret_key_default = defaults["SECRET_KEY"].default
        postgres_password_default = defaults["POSTGRES_PASSWORD"].default
        if (
            not self.SECRET_KEY.strip()
            or not self.POSTGRES_PASSWORD.strip()
            or self.SECRET_KEY == secret_key_default
            or self.POSTGRES_PASSWORD == postgres_password_default
        ):
            raise RuntimeError(
                "Production requires non-empty SECRET_KEY and POSTGRES_PASSWORD "
                "values that differ from the development defaults."
            )

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
    def SQLALCHEMY_DATABASE_URI(self) -> URL:
        return URL.create(
            "postgresql+psycopg2",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            database=self.POSTGRES_DB,
        )

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(
            str(PROJECT_ROOT / ".env"),
            str(BACKEND_DIR / ".env"),
            ".env"
        ),
        extra="allow"
    )

settings = Settings()
