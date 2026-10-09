"""Sending email, kept deliberately small.

Two backends, chosen with EMAIL_BACKEND:
  console  writes one log line (no message text) and sends nothing. Default.
  smtp     sends through your mail provider using SMTP.

Sending never raises: a mail problem must not make a visitor's form fail, and
the submission is already safe in the database. Failures are logged instead.
"""

import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import Settings

logger = logging.getLogger("app.email")

_TIMEOUT_SECONDS = 15


def send_email(
    settings: Settings,
    *,
    to: str,
    subject: str,
    body: str,
    reply_to: str | None = None,
) -> bool:
    """Send one plain-text email. Returns True when it was handed to the mail server."""
    if settings.email_backend != "smtp":
        logger.info("email not sent (console backend)", extra={"fields": {"subject": subject}})
        return False
    try:
        message = EmailMessage()
        message["From"] = settings.email_from
        message["To"] = to
        message["Subject"] = subject
        if reply_to:
            message["Reply-To"] = reply_to
        message.set_content(body)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=_TIMEOUT_SECONDS) as smtp:
            if settings.smtp_starttls:
                smtp.starttls(context=ssl.create_default_context())
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except Exception:  # noqa: BLE001 - any mail failure must be contained
        logger.exception("email failed", extra={"fields": {"subject": subject}})
        return False
    logger.info("email sent", extra={"fields": {"subject": subject}})
    return True
