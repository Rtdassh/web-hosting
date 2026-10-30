from types import SimpleNamespace
from unittest.mock import patch

import pytest
from sqlalchemy.engine import URL, make_url

from app.core.config import Settings
from app.core.migration_config import migration_url


def isolated_settings(**values):
    with patch.dict("os.environ", {}, clear=True):
        return Settings(_env_file=None, **values)


@pytest.mark.parametrize("environment", ["development", "testing"])
def test_nonproduction_environments_keep_default_configuration(environment):
    settings = isolated_settings(ENVIRONMENT=environment)

    assert settings.ENVIRONMENT == environment
    assert settings.SECRET_KEY
    assert settings.POSTGRES_PASSWORD


def test_environment_is_validated_explicitly():
    with pytest.raises(ValueError, match="ENVIRONMENT must be"):
        isolated_settings(ENVIRONMENT="prod")


@pytest.mark.parametrize(
    ("secret_key", "postgres_password"),
    [
        ("test-only-signing-value", None),
        (None, "test-only-database-value"),
        ("", "test-only-database-value"),
        ("test-only-signing-value", " "),
    ],
)
def test_production_rejects_missing_or_empty_secrets(secret_key, postgres_password):
    options = {"ENVIRONMENT": "production"}
    if secret_key is not None:
        options["SECRET_KEY"] = secret_key
    if postgres_password is not None:
        options["POSTGRES_PASSWORD"] = postgres_password

    with pytest.raises(RuntimeError) as error:
        isolated_settings(**options)

    assert "SECRET_KEY" in str(error.value)
    assert "POSTGRES_PASSWORD" in str(error.value)
    assert "test-only" not in str(error.value)


def test_production_rejects_insecure_defaults():
    defaults = Settings.model_fields

    with pytest.raises(RuntimeError):
        isolated_settings(
            ENVIRONMENT="production",
            SECRET_KEY=defaults["SECRET_KEY"].default,
            POSTGRES_PASSWORD="test-only-database-value",
        )
    with pytest.raises(RuntimeError):
        isolated_settings(
            ENVIRONMENT="production",
            SECRET_KEY="test-only-signing-value",
            POSTGRES_PASSWORD=defaults["POSTGRES_PASSWORD"].default,
        )


def test_production_accepts_nonempty_configured_secrets():
    settings = isolated_settings(
        ENVIRONMENT="production",
        SECRET_KEY="test-only-signing-value-long-enough",
        POSTGRES_PASSWORD="test-only-database-value",
    )

    assert settings.ENVIRONMENT == "production"


def test_database_url_preserves_password_with_special_characters():
    password = "test-only@:/?#[]%value"
    settings = isolated_settings(POSTGRES_PASSWORD=password)

    url = settings.SQLALCHEMY_DATABASE_URI
    round_tripped = make_url(url.render_as_string(hide_password=False))

    assert isinstance(url, URL)
    assert url.password == password
    assert round_tripped.password == password


def test_alembic_project_url_uses_sqlalchemy_url_object():
    project_settings = SimpleNamespace(
        POSTGRES_USER="test-user",
        POSTGRES_PASSWORD="test-only@:/?#value",
        POSTGRES_SERVER="localhost",
        POSTGRES_PORT=5432,
        POSTGRES_DB="test-db",
    )
    with patch.dict("os.environ", {}, clear=True), patch(
        "app.core.config.settings", project_settings
    ):
        url = migration_url(use_project_database=True)

    assert isinstance(url, URL)
    assert url.password == project_settings.POSTGRES_PASSWORD
