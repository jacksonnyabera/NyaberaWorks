"""Tables for two-way conversations about a request, and formal quotations."""

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def _now() -> datetime:
    return datetime.now(UTC)


LEAD_KINDS = ("contact", "quote", "booking")
AUTHOR_ROLES = ("CLIENT", "ADMIN")
QUOTATION_STATUSES = ("sent", "accepted", "declined", "withdrawn")


class LeadMessage(Base):
    """One message in the thread under a request. The request's own text is the first message."""

    __tablename__ = "lead_messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    lead_kind: Mapped[str] = mapped_column(String(10))
    lead_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    author_role: Mapped[str] = mapped_column(String(10))
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL")
    )
    body: Mapped[str] = mapped_column(Text)
    # When the other side opened it. Empty means unread.
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint("lead_kind IN ('contact', 'quote', 'booking')", name="lead_kind_valid"),
        CheckConstraint("author_role IN ('CLIENT', 'ADMIN')", name="author_role_valid"),
        Index("ix_lead_messages_lead", "lead_kind", "lead_id", "created_at"),
    )


class Quotation(Base):
    """A formal price offer for a quote request. The client can accept or decline it."""

    __tablename__ = "quotations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    quote_request_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("quote_requests.id", ondelete="CASCADE"), index=True
    )
    amount_kes: Mapped[int] = mapped_column(Integer)
    details: Mapped[str] = mapped_column(Text)
    valid_until: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(12), default="sent")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, server_default=func.now()
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(
            "status IN ('sent', 'accepted', 'declined', 'withdrawn')", name="status_valid"
        ),
        CheckConstraint("amount_kes > 0", name="amount_positive"),
    )
