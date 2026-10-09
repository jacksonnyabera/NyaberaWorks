"""Tell the site owner when a visitor submits a form.

Only the owner is emailed. Visitors get their reference on screen instead:
sending mail to an address typed into a public form would let anyone use the
site to spam a third party.
"""

import logging

from app.core.config import Settings
from app.core.email import send_email
from app.modules.leads.schemas import BookingIn, ContactIn, LeadReceipt, QuoteIn

logger = logging.getLogger("app.leads")

_TITLES = {"C": "New message", "Q": "New quote request", "B": "New booking request"}


def _lines(pairs: list[tuple[str, object]]) -> str:
    return "\n".join(f"{label}: {value}" for label, value in pairs if value not in (None, ""))


def build_notification(
    kind: str, data: ContactIn | QuoteIn | BookingIn, receipt: LeadReceipt, settings: Settings
) -> tuple[str, str]:
    """Returns (subject, body). The subject holds only a fixed phrase and the reference."""
    subject = f"{_TITLES[kind]} {receipt.reference}"
    common: list[tuple[str, object]] = [
        ("Reference", receipt.reference),
        ("Name", data.name),
        ("Email", data.email),
        ("Phone", data.phone),
        ("Service", data.service),
    ]
    if isinstance(data, ContactIn):
        extra: list[tuple[str, object]] = [("Message", f"\n{data.message}")]
    elif isinstance(data, QuoteIn):
        extra = [
            ("Budget", data.budget),
            ("Deadline", data.deadline),
            ("Project description", f"\n{data.description}"),
        ]
    else:
        extra = [
            ("Preferred date", data.preferred_date),
            ("Preferred time", data.preferred_time),
            ("Requirements", f"\n{data.requirements}"),
        ]
    body = (
        _lines(common + extra)
        + f"\n\nOpen the admin area to respond: {settings.site_url.rstrip('/')}/admin\n"
        + "Reply to this email to answer the visitor directly.\n"
    )
    return subject, body


def notify_new_lead(
    kind: str, data: ContactIn | QuoteIn | BookingIn, receipt: LeadReceipt, settings: Settings
) -> None:
    """Runs after the response is sent. Never raises."""
    if not settings.admin_notify_email and settings.email_backend == "smtp":
        return
    try:
        subject, body = build_notification(kind, data, receipt, settings)
        send_email(
            settings,
            to=settings.admin_notify_email,
            subject=subject,
            body=body,
            reply_to=data.email,
        )
    except Exception:  # noqa: BLE001 - a notification problem must never reach the visitor
        logger.exception("lead notification failed")
