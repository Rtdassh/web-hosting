from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.core.config import Settings
from app.services.brevo_service import BrevoEmailService
from app.services.password_reset_delivery import (
    BrevoPasswordResetDelivery,
    create_password_reset_delivery_provider,
)


def get_test_settings(**kwargs) -> Settings:
    defaults = {
        "_env_file": None,
        "BREVO_API_KEY": "xkeysib-mock-test-key",
        "BREVO_SENDER_EMAIL": "test-sender@example.com",
        "BREVO_SENDER_NAME": "CloudPaaS Test",
        "PASSWORD_RESET_FRONTEND_URL": "http://localhost:5173/",
    }
    defaults.update(kwargs)
    return Settings(**defaults)


def test_brevo_service_not_configured_raises_error():
    config = Settings(_env_file=None, BREVO_API_KEY=None, BREVO_SENDER_EMAIL=None)
    service = BrevoEmailService(config=config)
    assert not service.is_configured
    with pytest.raises(RuntimeError, match="not configured"):
        service.send_email(
            to_email="dest@example.com",
            subject="Test",
            html_content="<p>Test</p>",
        )


def test_brevo_service_sends_email_successfully():
    config = get_test_settings()
    service = BrevoEmailService(config=config)

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 201
    mock_response.content = b'{"messageId": "<mock-123@brevo>"}'
    mock_response.json.return_value = {"messageId": "<mock-123@brevo>"}

    with patch("httpx.Client.post", return_value=mock_response) as mock_post:
        result = service.send_email(
            to_email="dest@example.com",
            subject="Bienvenido",
            html_content="<h1>Hola</h1>",
            text_content="Hola texto",
            to_name="Juan",
        )

        assert result == {"messageId": "<mock-123@brevo>"}
        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        assert kwargs["headers"]["api-key"] == "xkeysib-mock-test-key"
        payload = kwargs["json"]
        assert payload["sender"] == {"name": "CloudPaaS Test", "email": "test-sender@example.com"}
        assert payload["to"] == [{"email": "dest@example.com", "name": "Juan"}]
        assert payload["subject"] == "Bienvenido"
        assert payload["htmlContent"] == "<h1>Hola</h1>"
        assert payload["textContent"] == "Hola texto"


def test_brevo_service_handles_http_error_without_logging_response_body(caplog):
    config = get_test_settings()
    service = BrevoEmailService(config=config)

    mock_request = MagicMock(spec=httpx.Request)
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 401
    mock_response.text = '{"message": "sensitive provider response"}'
    http_error = httpx.HTTPStatusError(
        message="Client error '401 Unauthorized'",
        request=mock_request,
        response=mock_response,
    )

    with patch("httpx.Client.post", side_effect=http_error):
        with pytest.raises(RuntimeError, match="Brevo API error") as raised:
            service.send_email(
                to_email="dest@example.com",
                subject="Error Test",
                html_content="<p>test</p>",
            )
    assert "sensitive provider response" not in str(raised.value)
    assert "sensitive provider response" not in caplog.text


def test_brevo_password_reset_delivery_formats_url_and_sends():
    config = get_test_settings()
    delivery = BrevoPasswordResetDelivery(config=config)

    with patch.object(BrevoEmailService, "send_email") as mock_send:
        delivery.send_password_reset("client@example.com", "secret-token-123")

        mock_send.assert_called_once()
        _, kwargs = mock_send.call_args
        assert kwargs["to_email"] == "client@example.com"
        assert kwargs["subject"] == "Restablece tu contraseña de CloudPaaS"
        assert "?reset_token=secret-token-123" in kwargs["html_content"]
        assert "?reset_token=secret-token-123" in kwargs["text_content"]


def test_brevo_email_verification_delivery_formats_link_and_sends():
    config = get_test_settings()
    delivery = BrevoPasswordResetDelivery(config=config)

    with patch.object(BrevoEmailService, "send_email") as mock_send:
        delivery.send_email_verification(
            "client@example.com",
            "verification-token-456",
        )

    mock_send.assert_called_once()
    _, kwargs = mock_send.call_args
    assert kwargs["to_email"] == "client@example.com"
    assert kwargs["subject"] == "Verifica tu correo de Codrop"
    assert "?token=verification-token-456" in kwargs["html_content"]
    assert "?token=verification-token-456" in kwargs["text_content"]
    assert "24 horas" in kwargs["text_content"]


def test_smtp_email_verification_delivery_builds_link_without_network(monkeypatch):
    config = Settings(
        _env_file=None,
        PASSWORD_RESET_SMTP_HOST="mailpit",
        PASSWORD_RESET_SMTP_PORT=1025,
        PASSWORD_RESET_SMTP_SECURITY="starttls",
        PASSWORD_RESET_FROM_EMAIL="no-reply@example.invalid",
        PASSWORD_RESET_FRONTEND_URL="http://localhost:5173/",
    )
    smtp = type("SMTPStub", (), {
        "__enter__": lambda self: self,
        "__exit__": lambda self, exc_type, exc, traceback: False,
        "ehlo": lambda self: None,
        "starttls": lambda self, context: None,
        "send_message": lambda self, message: setattr(self, "message", message),
    })()
    monkeypatch.setattr(
        "app.services.password_reset_delivery.smtplib.SMTP",
        lambda *args, **kwargs: smtp,
    )

    from app.services.password_reset_delivery import SMTPPasswordResetDelivery
    SMTPPasswordResetDelivery(config).send_email_verification(
        "client@example.invalid",
        "verification-token",
    )

    assert smtp.message["To"] == "client@example.invalid"
    assert "?token=verification-token" in smtp.message.get_content()
    assert "24 horas" in smtp.message.get_content()


def test_factory_returns_brevo_when_brevo_is_enabled():
    config = get_test_settings()
    provider = create_password_reset_delivery_provider(config)
    assert isinstance(provider, BrevoPasswordResetDelivery)
