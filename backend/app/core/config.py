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
    ALGORITHM: Literal["HS256"] = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60 * 24, ge=1, le=60 * 24)
    
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
    HOST_PUBLIC_IP: str = "localhost"
    HOSTING_STORAGE_PATH: str = "/srv/hosting/instancias"
    PORT_RANGE_START: int = 30001
    PORT_RANGE_END: int = 30100
    SUBDOMAIN_ENABLED: bool = False
    SITE_FILE_SCAN_LIMIT: int = Field(default=10000, ge=100, le=100000)
    SITE_EXPORT_MAX_MB: int = Field(default=100, ge=1, le=1000)
    RELEASES_RETAINED: int = Field(default=5, ge=2, le=20)
    MONITOR_HOST: str = "127.0.0.1"
    MONITOR_TIMEOUT_SECONDS: float = Field(default=2.0, gt=0, le=10)
    MONITOR_SAMPLES: int = Field(default=2880, ge=10, le=10000)
    
    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    # Password reset email (SMTP)
    PASSWORD_RESET_SMTP_HOST: str | None = None
    PASSWORD_RESET_SMTP_PORT: int = Field(default=1025, ge=1, le=65535)
    PASSWORD_RESET_SMTP_SECURITY: Literal["none", "starttls", "ssl"] = "none"
    PASSWORD_RESET_SMTP_USERNAME: str | None = None
    PASSWORD_RESET_SMTP_PASSWORD: str | None = None
    PASSWORD_RESET_FROM_EMAIL: str | None = None
    PASSWORD_RESET_FRONTEND_URL: str = "http://localhost:5173/"
    PASSWORD_RESET_SMTP_TIMEOUT_SECONDS: int = Field(default=10, gt=0)

    # Brevo API (Envío Transaccional REST API)
    BREVO_API_KEY: str | None = None
    BREVO_SENDER_EMAIL: str | None = None
    BREVO_SENDER_NAME: str = "CloudPaaS"
    BREVO_TIMEOUT_SECONDS: int = Field(default=10, gt=0)

    @field_validator(
        "PASSWORD_RESET_SMTP_HOST",
        "PASSWORD_RESET_SMTP_USERNAME",
        "BREVO_API_KEY",
        "BREVO_SENDER_EMAIL",
        "BREVO_SENDER_NAME",
        mode="before",
    )
    @classmethod
    def strip_email_config_text(cls, value: str | None) -> str | None:
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

    @property
    def brevo_api_enabled(self) -> bool:
        sender = self.BREVO_SENDER_EMAIL or self.PASSWORD_RESET_FROM_EMAIL or ""
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
            self.BREVO_API_KEY
            and self.BREVO_API_KEY.strip()
            and valid_sender
        )

    def model_post_init(self, __context) -> None:
        if self.ENVIRONMENT != "production":
            return

        defaults = type(self).model_fields
        secret_key_default = defaults["SECRET_KEY"].default
        postgres_password_default = defaults["POSTGRES_PASSWORD"].default
        if (
            not self.SECRET_KEY.strip()
            or len(self.SECRET_KEY.encode("utf-8")) < 32
            or not self.POSTGRES_PASSWORD.strip()
            or self.SECRET_KEY in {
                secret_key_default,
                "clave_super_segura_de_produccion_paas_2026",
                "tu_clave_secreta_jwt_para_desarrollo_cambiar_en_produccion",
            }
            or self.POSTGRES_PASSWORD in {postgres_password_default, "paas_prod_secret"}
        ):
            raise RuntimeError(
                "Production requires a SECRET_KEY of at least 32 bytes and a "
                "POSTGRES_PASSWORD; both must differ from the development defaults."
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
