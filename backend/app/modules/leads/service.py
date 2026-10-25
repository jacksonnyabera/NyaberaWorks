"""Saving form submissions, with spam protection."""

import hashlib
import hmac
import logging
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.client_ip import client_ip
from app.core.config import Settings
from app.core.errors import AppError
from app.modules.catalog.service import is_valid_service_choice
from app.modules.leads.models import Booking, ContactMessage, QuoteRequest
from app.modules.leads.schemas import BookingIn, ContactIn, LeadReceipt, QuoteIn
from app.modules.users.models import User

logger = logging.getLogger("app.leads")

# No 0/O/1/I/L so a reference is easy to read out over the phone.
_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
_LEAD_TABLES = (ContactMessage, QuoteRequest, Booking)


def new_reference(kind: str) -> str:
    return f"NW-{kind}-" + "".join(secrets.choice(_ALPHABET) for _ in range(8))


def hash_ip(ip: str, settings: Settings) -> str:
    key = (settings.app_secret_key or "development-only-key").encode()
    return hmac.new(key, ip.encode(), hashlib.sha256).hexdigest()


def enforce_rate_limit(db: Session, ip_hash: str, settings: Settings) -> None:
    since = datetime.now(UTC) - timedelta(hours=1)
    total = 0
    for model in _LEAD_TABLES:
        total += (
            db.scalar(
                select(func.count())
                .select_from(model)
                .where(model.ip_hash == ip_hash, model.created_at >= since)
            )
            or 0
        )
    if total >= settings.lead_rate_limit_per_hour:
        raise AppError(
            429,
            "TOO_MANY_REQUESTS",
            "Too many requests from your connection. Try again in an hour or email us directly.",
        )


def check_service(db: Session, slug: str) -> None:
    if not is_valid_service_choice(db, slug):
        raise AppError(
            422,
            "VALIDATION_ERROR",
            "Request validation failed.",
            [
                {
                    "field": "service",
                    "message": "Choose a service from the list",
                    "type": "value_error",
                }
            ],
        )


def _fake_receipt(kind: str) -> LeadReceipt:
    """Returned to bots that fill the hidden field. Nothing is saved."""
    return LeadReceipt(id="0", reference=new_reference(kind))


def _save(db: Session, model_cls, kind: str, values: dict) -> LeadReceipt:  # noqa: ANN001
    for _ in range(5):
        row = model_cls(reference=new_reference(kind), **values)
        db.add(row)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()  # reference collision (very rare): try a new one
            continue
        logger.info(
            "lead saved",
            extra={"fields": {"kind": model_cls.__tablename__, "reference": row.reference}},
        )
        return LeadReceipt(id=str(row.id), reference=row.reference)
    raise AppError(500, "INTERNAL_ERROR", "Could not save your request. Please try again.")


def save_contact(
    db: Session,
    data: ContactIn,
    request: Request,
    settings: Settings,
    user: User | None = None,
) -> LeadReceipt:
    if data.website:
        return _fake_receipt("C")
    check_service(db, data.service)
    ip_hash = hash_ip(client_ip(request), settings)
    enforce_rate_limit(db, ip_hash, settings)
    return _save(
        db,
        ContactMessage,
        "C",
        {
            "name": data.name,
            "email": data.email,
            "phone": data.phone,
            "service": data.service,
            "message": data.message,
            "ip_hash": ip_hash,
            "user_id": user.id if user else None,
        },
    )


def save_quote(
    db: Session,
    data: QuoteIn,
    request: Request,
    settings: Settings,
    user: User | None = None,
) -> LeadReceipt:
    if data.website:
        return _fake_receipt("Q")
    check_service(db, data.service)
    ip_hash = hash_ip(client_ip(request), settings)
    enforce_rate_limit(db, ip_hash, settings)
    return _save(
        db,
        QuoteRequest,
        "Q",
        {
            "name": data.name,
            "email": data.email,
            "phone": data.phone,
            "service": data.service,
            "budget": data.budget,
            "deadline": data.deadline,
            "description": data.description,
            "ip_hash": ip_hash,
            "user_id": user.id if user else None,
        },
    )


def save_booking(
    db: Session,
    data: BookingIn,
    request: Request,
    settings: Settings,
    user: User | None = None,
) -> LeadReceipt:
    if data.website:
        return _fake_receipt("B")
    check_service(db, data.service)
    ip_hash = hash_ip(client_ip(request), settings)
    enforce_rate_limit(db, ip_hash, settings)
    return _save(
        db,
        Booking,
        "B",
        {
            "name": data.name,
            "email": data.email,
            "phone": data.phone,
            "service": data.service,
            "preferred_date": data.preferred_date,
            "preferred_time": data.preferred_time,
            "requirements": data.requirements,
            "ip_hash": ip_hash,
            "user_id": user.id if user else None,
        },
    )
