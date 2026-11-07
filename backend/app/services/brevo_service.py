import logging
from typing import Any

import httpx

from app.core.config import Settings, settings

logger = logging.getLogger(__name__)


class BrevoEmailService:
    """Servicio para despacho de correos transaccionales a través de la API REST de Brevo (v3)."""

    BASE_URL = "https://api.brevo.com/v3/smtp/email"

    def __init__(self, config: Settings = settings):
        self.config = config

    @property
    def is_configured(self) -> bool:
        return self.config.brevo_api_enabled

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None = None,
        to_name: str | None = None,
    ) -> dict[str, Any]:
        """Envía un correo transaccional utilizando el endpoint POST /v3/smtp/email de Brevo.
        
        Lanza RuntimeError si la configuración está incompleta o si ocurre un error HTTP/Red.
        """
        if not self.is_configured:
            raise RuntimeError("Brevo email service is not configured (missing API key or valid sender).")

        sender_email = self.config.BREVO_SENDER_EMAIL or self.config.PASSWORD_RESET_FROM_EMAIL
        sender_name = self.config.BREVO_SENDER_NAME

        recipient: dict[str, str] = {"email": to_email}
        if to_name:
            recipient["name"] = to_name

        payload: dict[str, Any] = {
            "sender": {
                "name": sender_name,
                "email": sender_email,
            },
            "to": [recipient],
            "subject": subject,
            "htmlContent": html_content,
        }
        if text_content:
            payload["textContent"] = text_content

        headers = {
            "accept": "application/json",
            "api-key": self.config.BREVO_API_KEY,
            "content-type": "application/json",
        }

        try:
            with httpx.Client(timeout=self.config.BREVO_TIMEOUT_SECONDS) as client:
                response = client.post(
                    self.BASE_URL,
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json() if response.content else {}
                logger.info("Transactional email sent successfully via Brevo.")
                return data
        except httpx.HTTPStatusError as exc:
            logger.error(
                "Brevo API request failed with status %s.",
                exc.response.status_code,
            )
            raise RuntimeError(
                f"Brevo API error ({exc.response.status_code})."
            ) from exc
        except httpx.RequestError as exc:
            logger.error("Failed to connect to Brevo API: %s", type(exc).__name__)
            raise RuntimeError("Network error connecting to Brevo email service.") from exc
