"""Database tables for the three public forms: contact, quote and booking."""

import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, Index, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

CONTACT_STATUSES = ("new", "read", "replied", "archived", "spam")
QUOTE_STATUSES = ("new", "reviewing", "quoted", "accepted", "declined", "archived")
BOOKING_STATUSES = ("requested", "confirmed", "rescheduled", "completed", "cancelled")


def _in_list(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


class LeadMixin:
    """Columns every form submission has."""

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Short human-friendly code the visitor can quote, for example NW-C-7F3K9Q2M.
    reference: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254))
    phone: Mapped[str | None] = mapped_column(String(25))
    service: Mapped[str] = mapped_column(String(80))
    # Keyed hash of the visitor's IP. Used only for spam limits, never shown.
    ip_hash: Mapped[str | None] = mapped_column(String(64))
    admin_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ContactMessage(LeadMixin, Base):
    __tablename__ = "contact_messages"

    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="new")

    __table_args__ = (
        CheckConstraint(_in_list("status", CONTACT_STATUSES), name="status_valid"),
        Index("ix_contact_messages_status_created_at", "status", "created_at"),
        Index("ix_contact_messages_email", "email"),
        Index("ix_contact_messages_ip_hash_created_at", "ip_hash", "created_at"),
    )


class QuoteRequest(LeadMixin, Base):
    __tablename__ = "quote_requests"

    budget: Mapped[str] = mapped_column(String(40))
    deadline: Mapped[date | None] = mapped_column(Date)
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="new")

    __table_args__ = (
        CheckConstraint(_in_list("status", QUOTE_STATUSES), name="status_valid"),
        Index("ix_quote_requests_status_created_at", "status", "created_at"),
        Index("ix_quote_requests_email", "email"),
        Index("ix_quote_requests_ip_hash_created_at", "ip_hash", "created_at"),
    )


class Booking(LeadMixin, Base):
    __tablename__ = "booking_requests"

    preferred_date: Mapped[date] = mapped_column(Date)
    preferred_time: Mapped[str] = mapped_column(String(40))
    requirements: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="requested")

    __table_args__ = (
        CheckConstraint(_in_list("status", BOOKING_STATUSES), name="status_valid"),
        Index("ix_booking_requests_status_preferred_date", "status", "preferred_date"),
        Index("ix_booking_requests_email", "email"),
        Index("ix_booking_requests_ip_hash_created_at", "ip_hash", "created_at"),
    )
