import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Protocol
from urllib.parse import urlencode, urlsplit, urlunsplit

from app.core.config import Settings, settings


class PasswordResetDeliveryProvider(Protocol):
    def send_password_reset(self, email: str, token: str) -> None:
        """Deliver a reset token without exposing it through the API."""


@dataclass(frozen=True)
class SMTPPasswordResetDelivery:
    config: Settings

    def send_password_reset(self, email: str, token: str) -> None:
        host = self.config.PASSWORD_RESET_SMTP_HOST
        sender = self.config.PASSWORD_RESET_FROM_EMAIL
        if not host or not sender or not self.config.password_reset_smtp_enabled:
            raise RuntimeError("Password reset SMTP delivery is not configured.")

        frontend = urlsplit(self.config.PASSWORD_RESET_FRONTEND_URL)
        reset_url = urlunsplit((
            frontend.scheme,
            frontend.netloc,
            frontend.path,
            "",
            urlencode({"reset_token": token}),
        ))

        message = EmailMessage()
        message["Subject"] = "Restablece tu contraseña de Codrop"
        message["From"] = sender
        message["To"] = email
        message.set_content(
            "Solicitaste restablecer tu contraseña de Codrop.\n\n"
            f"Abre este enlace dentro de los próximos 15 minutos:\n{reset_url}\n\n"
            "Si no solicitaste este cambio, puedes ignorar este mensaje."
        )

        context = ssl.create_default_context()
        smtp_class = (
            smtplib.SMTP_SSL
            if self.config.PASSWORD_RESET_SMTP_SECURITY == "ssl"
            else smtplib.SMTP
        )
        smtp_options: dict[str, int | ssl.SSLContext] = {
            "timeout": self.config.PASSWORD_RESET_SMTP_TIMEOUT_SECONDS
        }
        if self.config.PASSWORD_RESET_SMTP_SECURITY == "ssl":
            smtp_options["context"] = context

        with smtp_class(
            host,
            self.config.PASSWORD_RESET_SMTP_PORT,
            **smtp_options,
        ) as client:
            if self.config.PASSWORD_RESET_SMTP_SECURITY == "starttls":
                client.ehlo()
                client.starttls(context=context)
                client.ehlo()
            username = self.config.PASSWORD_RESET_SMTP_USERNAME
            password = self.config.PASSWORD_RESET_SMTP_PASSWORD
            if username:
                if password is None:
                    raise RuntimeError("Password reset SMTP authentication is incomplete.")
                client.login(
                    username,
                    password,
                )
            client.send_message(message)


def create_password_reset_delivery_provider(
    config: Settings = settings,
) -> PasswordResetDeliveryProvider | None:
    if not config.password_reset_smtp_enabled:
        return None
    return SMTPPasswordResetDelivery(config)
