"""Rules for conversations: who may see a request, who may reply, how quotations move."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.modules.conversations.models import LeadMessage, Quotation
from app.modules.conversations.schemas import (
    LeadDetail,
    LeadSummary,
    MessageOut,
    QuotationOut,
)
from app.modules.leads.models import Booking, ContactMessage, QuoteRequest
from app.modules.leads.schemas import today_eat
from app.modules.users.models import User

MODELS = {"contact": ContactMessage, "quote": QuoteRequest, "booking": Booking}
CLIENT_MESSAGES_PER_HOUR = 20


def _not_found() -> AppError:
    # Same answer for "does not exist" and "belongs to someone else", so ids cannot be probed.
    return AppError(404, "NOT_FOUND", "That request does not exist.")


def load_lead(db: Session, kind: str, lead_id: uuid.UUID):  # noqa: ANN201
    model = MODELS.get(kind)
    if model is None:
        raise _not_found()
    row = db.get(model, lead_id)
    if row is None:
        raise _not_found()
    return row


def load_own_lead(db: Session, user: User, kind: str, lead_id: uuid.UUID):  # noqa: ANN201
    row = load_lead(db, kind, lead_id)
    if row.user_id != user.id:
        raise _not_found()
    return row


def _summary_lines(kind: str, row) -> list[tuple[str, str]]:  # noqa: ANN001
    if kind == "contact":
        return [("Message", row.message)]
    if kind == "quote":
        lines = [("Budget", row.budget)]
        if row.deadline:
            lines.append(("Deadline", row.deadline.isoformat()))
        lines.append(("Project description", row.description))
        return lines
    return [
        ("Preferred date", row.preferred_date.isoformat()),
        ("Preferred time", row.preferred_time),
        ("Requirements", row.requirements),
    ]


def _quotation_out(q: Quotation) -> QuotationOut:
    return QuotationOut(
        id=q.id,
        amount_kes=q.amount_kes,
        details=q.details,
        valid_until=q.valid_until,
        status=q.status,
        expired=q.status == "sent" and q.valid_until < today_eat(),
        created_at=q.created_at,
        responded_at=q.responded_at,
    )


def _thread(db: Session, kind: str, lead_id: uuid.UUID) -> list[LeadMessage]:
    return list(
        db.scalars(
            select(LeadMessage)
            .where(LeadMessage.lead_kind == kind, LeadMessage.lead_id == lead_id)
            .order_by(LeadMessage.created_at, LeadMessage.id)
        )
    )


def _quotations(db: Session, lead_id: uuid.UUID) -> list[Quotation]:
    return list(
        db.scalars(
            select(Quotation)
            .where(Quotation.quote_request_id == lead_id)
            .order_by(Quotation.created_at, Quotation.id)
        )
    )


def mark_read(db: Session, kind: str, lead_id: uuid.UUID, reader_role: str) -> None:
    """The reader has opened the thread: messages from the other side are now read."""
    other = "ADMIN" if reader_role == "CLIENT" else "CLIENT"
    db.execute(
        update(LeadMessage)
        .where(
            LeadMessage.lead_kind == kind,
            LeadMessage.lead_id == lead_id,
            LeadMessage.author_role == other,
            LeadMessage.read_at.is_(None),
        )
        .values(read_at=datetime.now(UTC))
    )
    db.commit()


def detail(db: Session, kind: str, row, viewer_role: str) -> LeadDetail:  # noqa: ANN001
    mark_read(db, kind, row.id, viewer_role)
    messages = [
        MessageOut(
            id=m.id,
            author_role=m.author_role,
            body=m.body,
            created_at=m.created_at,
            read=m.read_at is not None,
        )
        for m in _thread(db, kind, row.id)
    ]
    quotes = [_quotation_out(q) for q in _quotations(db, row.id)] if kind == "quote" else []
    return LeadDetail(
        kind=kind,
        id=row.id,
        reference=row.reference,
        service=row.service,
        status=row.status,
        created_at=row.created_at,
        summary=_summary_lines(kind, row),
        messages=messages,
        quotations=quotes,
        can_reply=row.user_id is not None,
    )


def list_for_user(db: Session, user: User) -> list[LeadSummary]:
    items: list[LeadSummary] = []
    for kind, model in MODELS.items():
        for row in db.scalars(select(model).where(model.user_id == user.id)):
            unread = (
                db.scalar(
                    select(func.count())
                    .select_from(LeadMessage)
                    .where(
                        LeadMessage.lead_kind == kind,
                        LeadMessage.lead_id == row.id,
                        LeadMessage.author_role == "ADMIN",
                        LeadMessage.read_at.is_(None),
                    )
                )
                or 0
            )
            last = db.scalar(
                select(func.max(LeadMessage.created_at)).where(
                    LeadMessage.lead_kind == kind, LeadMessage.lead_id == row.id
                )
            )
            open_quote = False
            if kind == "quote":
                open_quote = bool(
                    db.scalar(
                        select(func.count())
                        .select_from(Quotation)
                        .where(
                            Quotation.quote_request_id == row.id,
                            Quotation.status == "sent",
                            Quotation.valid_until >= today_eat(),
                        )
                    )
                )
            activity = max(filter(None, [row.created_at, row.updated_at, last]))
            items.append(
                LeadSummary(
                    kind=kind,
                    id=row.id,
                    reference=row.reference,
                    service=row.service,
                    status=row.status,
                    created_at=row.created_at,
                    last_activity_at=activity,
                    unread=unread,
                    open_quotation=open_quote,
                )
            )
    items.sort(key=lambda i: i.last_activity_at, reverse=True)
    return items


def unread_total(db: Session, user: User) -> int:
    return sum(i.unread for i in list_for_user(db, user))


def _add_message(db: Session, kind: str, lead_id: uuid.UUID, role: str, user: User, body: str):  # noqa: ANN202
    message = LeadMessage(
        lead_kind=kind, lead_id=lead_id, author_role=role, author_id=user.id, body=body
    )
    db.add(message)
    return message


def client_reply(db: Session, user: User, kind: str, row, body: str) -> None:  # noqa: ANN001
    since = datetime.now(UTC) - timedelta(hours=1)
    recent = (
        db.scalar(
            select(func.count())
            .select_from(LeadMessage)
            .where(
                LeadMessage.author_id == user.id,
                LeadMessage.author_role == "CLIENT",
                LeadMessage.created_at >= since,
            )
        )
        or 0
    )
    if recent >= CLIENT_MESSAGES_PER_HOUR:
        raise AppError(429, "TOO_MANY_REQUESTS", "You are sending messages too quickly. Try later.")
    if row.status in ("spam",):
        raise AppError(409, "CONFLICT", "This request is closed.")
    _add_message(db, kind, row.id, "CLIENT", user, body)
    # A client replying brings an archived or answered request back to the top of the inbox.
    if kind == "contact" and row.status in ("replied", "archived"):
        row.status = "new"
    db.commit()


def admin_reply(db: Session, admin: User, kind: str, row, body: str) -> None:  # noqa: ANN001
    require_linked(row)
    _add_message(db, kind, row.id, "ADMIN", admin, body)
    if kind == "contact" and row.status in ("new", "read"):
        row.status = "replied"
    elif kind == "quote" and row.status == "new":
        row.status = "reviewing"
    db.commit()


def require_linked(row) -> None:  # noqa: ANN001
    if row.user_id is None:
        raise AppError(
            409,
            "CONFLICT",
            "This visitor did not sign in when sending the request, so the app cannot "
            "deliver a reply. Contact them by email or phone and invite them to create an "
            "account.",
        )


def create_quotation(
    db: Session, row: QuoteRequest, amount_kes: int, details: str, valid_until
) -> Quotation:  # noqa: ANN001
    require_linked(row)
    if valid_until < today_eat():
        raise AppError(
            422,
            "VALIDATION_ERROR",
            "Request validation failed.",
            [{"field": "validUntil", "message": "Choose a date that is not in the past"}],
        )
    if row.status in ("accepted", "declined", "archived"):
        raise AppError(409, "CONFLICT", "This request is already closed.")
    # Only one offer is open at a time: a new one replaces the previous.
    for old in _quotations(db, row.id):
        if old.status == "sent":
            old.status = "withdrawn"
            old.responded_at = datetime.now(UTC)
    quotation = Quotation(
        quote_request_id=row.id, amount_kes=amount_kes, details=details, valid_until=valid_until
    )
    db.add(quotation)
    row.status = "quoted"
    db.commit()
    db.refresh(quotation)
    return quotation


def load_quotation(db: Session, quotation_id: uuid.UUID) -> tuple[Quotation, QuoteRequest]:
    quotation = db.get(Quotation, quotation_id)
    if quotation is None:
        raise AppError(404, "NOT_FOUND", "That quotation does not exist.")
    return quotation, db.get(QuoteRequest, quotation.quote_request_id)  # type: ignore[return-value]


def withdraw_quotation(db: Session, quotation: Quotation, row: QuoteRequest) -> None:
    if quotation.status != "sent":
        raise AppError(409, "CONFLICT", "Only an open quotation can be withdrawn.")
    quotation.status = "withdrawn"
    quotation.responded_at = datetime.now(UTC)
    if row.status == "quoted":
        row.status = "reviewing"
    db.commit()


def respond_to_quotation(
    db: Session, user: User, quotation: Quotation, row: QuoteRequest, accept: bool
) -> None:
    if row.user_id != user.id:
        raise AppError(404, "NOT_FOUND", "That quotation does not exist.")
    if quotation.status != "sent":
        raise AppError(409, "CONFLICT", "This quotation can no longer be answered.")
    if quotation.valid_until < today_eat():
        raise AppError(
            409,
            "CONFLICT",
            "This quotation has expired. Ask for an updated one in the conversation.",
        )
    quotation.status = "accepted" if accept else "declined"
    quotation.responded_at = datetime.now(UTC)
    row.status = "accepted" if accept else "declined"
    db.commit()
