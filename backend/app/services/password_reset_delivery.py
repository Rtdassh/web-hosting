import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from html import escape
from typing import Protocol
from urllib.parse import urlencode, urlsplit, urlunsplit

from app.core.config import Settings, settings


class PasswordResetDeliveryProvider(Protocol):
    def send_password_reset(self, email: str, token: str) -> None:
        """Deliver a reset token without exposing it through the API."""

    def send_email_verification(self, email: str, token: str) -> None:
        """Deliver an email-verification token without exposing it through the API."""


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
            urlencode({"reset_token": token}),
            "",
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

        self._send_message(message)

    def send_email_verification(self, email: str, token: str) -> None:
        host = self.config.PASSWORD_RESET_SMTP_HOST
        sender = self.config.PASSWORD_RESET_FROM_EMAIL
        if not host or not sender or not self.config.password_reset_smtp_enabled:
            raise RuntimeError("Email verification SMTP delivery is not configured.")

        frontend = urlsplit(self.config.PASSWORD_RESET_FRONTEND_URL)
        verification_url = urlunsplit((
            frontend.scheme,
            frontend.netloc,
            frontend.path,
            urlencode({"token": token}),
            "",
        ))

        message = EmailMessage()
        message["Subject"] = "Verifica tu correo de Codrop"
        message["From"] = sender
        message["To"] = email
        message.set_content(
            "Creaste una cuenta de Codrop.\n\n"
            f"Abre este enlace dentro de las próximas 24 horas:\n{verification_url}\n\n"
            "Si no creaste esta cuenta, puedes ignorar este mensaje."
        )
        self._send_message(message)

    def _send_message(self, message: EmailMessage) -> None:
        host = self.config.PASSWORD_RESET_SMTP_HOST
        if not host:
            raise RuntimeError("Email delivery SMTP host is not configured.")
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

        with smtp_class(host, self.config.PASSWORD_RESET_SMTP_PORT, **smtp_options) as client:
            if self.config.PASSWORD_RESET_SMTP_SECURITY == "starttls":
                client.ehlo()
                client.starttls(context=context)
                client.ehlo()
            username = self.config.PASSWORD_RESET_SMTP_USERNAME
            password = self.config.PASSWORD_RESET_SMTP_PASSWORD
            if username:
                if password is None:
                    raise RuntimeError("Email delivery SMTP authentication is incomplete.")
                client.login(username, password)
            client.send_message(message)


@dataclass(frozen=True)
class BrevoPasswordResetDelivery:
    config: Settings

    def _send_email(self, email: str, subject: str, html_content: str, text_content: str) -> None:
        from app.services.brevo_service import BrevoEmailService

        if not self.config.brevo_api_enabled:
            raise RuntimeError("Brevo API email delivery is not configured.")
        service = BrevoEmailService(config=self.config)
        service.send_email(
            to_email=email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
        )

    def send_password_reset(self, email: str, token: str) -> None:
        frontend = urlsplit(self.config.PASSWORD_RESET_FRONTEND_URL)
        reset_url = urlunsplit((
            frontend.scheme,
            frontend.netloc,
            frontend.path,
            urlencode({"reset_token": token}),
            "",
        ))
        safe_reset_url = escape(reset_url, quote=True)

        html_content = (
            "<!DOCTYPE html>"
            "<html>"
            "<head>"
            '<meta charset="utf-8">'
            "<style>"
            "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; margin: 0; }"
            ".card { max-width: 520px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; }"
            ".brand { font-size: 20px; font-weight: 700; color: #6366f1; margin-bottom: 20px; }"
            "h2 { color: #f8fafc; margin-top: 0; font-size: 20px; }"
            "p { color: #cbd5e1; font-size: 15px; line-height: 1.6; }"
            ".btn-wrapper { text-align: center; margin: 28px 0; }"
            ".btn { background-color: #6366f1; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; }"
            ".footer { margin-top: 28px; font-size: 13px; color: #64748b; border-top: 1px solid #334155; padding-top: 16px; }"
            "</style>"
            "</head>"
            "<body>"
            '<div class="card">'
            '<div class="brand">CloudPaaS</div>'
            "<h2>Restablece tu contraseña</h2>"
            "<p>Solicitaste restablecer tu contraseña para acceder a la plataforma.</p>"
            "<p>Haz clic en el siguiente enlace dentro de los próximos <strong>15 minutos</strong>:</p>"
            f'<div class="btn-wrapper"><a href="{safe_reset_url}" class="btn">Restablecer mi contraseña</a></div>'
            f'<p style="font-size: 13px; color: #94a3b8; word-break: break-all;">Si el botón no funciona, ingresa a:<br>{safe_reset_url}</p>'
            '<div class="footer">Si no solicitaste este cambio, puedes ignorar este mensaje. Tu cuenta permanece segura.</div>'
            "</div>"
            "</body>"
            "</html>"
        )

        text_content = (
            "Solicitaste restablecer tu contraseña de CloudPaaS.\n\n"
            f"Abre este enlace dentro de los próximos 15 minutos:\n{reset_url}\n\n"
            "Si no solicitaste este cambio, puedes ignorar este mensaje."
        )

        self._send_email(
            email,
            "Restablece tu contraseña de CloudPaaS",
            html_content,
            text_content,
        )

    def send_email_verification(self, email: str, token: str) -> None:
        frontend = urlsplit(self.config.PASSWORD_RESET_FRONTEND_URL)
        verification_url = urlunsplit((
            frontend.scheme,
            frontend.netloc,
            frontend.path,
            urlencode({"token": token}),
            "",
        ))
        safe_verification_url = escape(verification_url, quote=True)
        html_content = (
            "<!DOCTYPE html><html><body>"
            "<h2>Verifica tu correo de Codrop</h2>"
            "<p>Confirma tu dirección de correo para activar tu cuenta.</p>"
            "<p>El enlace caduca en 24 horas y solo se puede usar una vez.</p>"
            f'<p><a href="{safe_verification_url}">Verificar correo</a></p>'
            f"<p>Si el enlace no funciona, copia esta dirección: {safe_verification_url}</p>"
            "<p>Si no creaste esta cuenta, ignora este mensaje.</p>"
            "</body></html>"
        )
        text_content = (
            "Confirma tu dirección de correo para activar tu cuenta de Codrop.\n\n"
            f"El enlace caduca en 24 horas y solo se puede usar una vez:\n{verification_url}\n\n"
            "Si no creaste esta cuenta, ignora este mensaje."
        )
        self._send_email(
            email,
            "Verifica tu correo de Codrop",
            html_content,
            text_content,
        )


def create_password_reset_delivery_provider(
    config: Settings = settings,
) -> PasswordResetDeliveryProvider | None:
    if config.brevo_api_enabled:
        return BrevoPasswordResetDelivery(config)
    if not config.password_reset_smtp_enabled:
        return None
    return SMTPPasswordResetDelivery(config)
