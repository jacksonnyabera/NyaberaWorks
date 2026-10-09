"""Admin lists for messages, quote requests and bookings."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import AppError
from app.modules.admin.schemas import (
    BookingOut,
    ContactMessageOut,
    LeadUpdate,
    Page,
    QuoteRequestOut,
)
from app.modules.leads.models import (
    BOOKING_STATUSES,
    CONTACT_STATUSES,
    QUOTE_STATUSES,
    Booking,
    ContactMessage,
    QuoteRequest,
)

router = APIRouter()
Db = Annotated[Session, Depends(get_db)]


def _like(text: str) -> str:
    escaped = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _build(path: str, model, statuses: tuple[str, ...], out) -> None:  # noqa: ANN001
    def list_rows(
        db: Db,
        status: Annotated[str | None, Query(max_length=20)] = None,
        q: Annotated[str | None, Query(max_length=100)] = None,
        page: Annotated[int, Query(ge=1, le=100_000)] = 1,
        page_size: Annotated[int, Query(ge=1, le=100, alias="pageSize")] = 20,
    ):  # noqa: ANN202
        conditions = []
        if status:
            if status not in statuses:
                raise AppError(422, "VALIDATION_ERROR", "Unknown status.")
            conditions.append(model.status == status)
        if q and q.strip():
            pattern = _like(q.strip().lower())
            conditions.append(
                or_(
                    func.lower(model.name).like(pattern, escape="\\"),
                    func.lower(model.email).like(pattern, escape="\\"),
                    func.lower(model.reference).like(pattern, escape="\\"),
                )
            )
        total = db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0
        rows = db.scalars(
            select(model)
            .where(*conditions)
            .order_by(model.created_at.desc(), model.id)
            .limit(page_size)
            .offset((page - 1) * page_size)
        ).all()
        return {"items": rows, "total": total, "page": page, "page_size": page_size}

    def update_row(row_id: uuid.UUID, data: LeadUpdate, db: Db):  # noqa: ANN202
        row = db.get(model, row_id)
        if row is None:
            raise AppError(404, "NOT_FOUND", "That item does not exist.")
        changes = data.model_dump(exclude_unset=True)
        if "status" in changes:
            if changes["status"] not in statuses:
                raise AppError(
                    422,
                    "VALIDATION_ERROR",
                    "Request validation failed.",
                    [{"field": "status", "message": "Unknown status", "type": "value_error"}],
                )
            row.status = changes["status"]
        if "admin_notes" in changes:
            notes = changes["admin_notes"]
            if notes is not None and any(ord(c) < 32 and c not in "\n\r\t" for c in notes):
                raise AppError(
                    422,
                    "VALIDATION_ERROR",
                    "Request validation failed.",
                    [
                        {
                            "field": "adminNotes",
                            "message": "Contains characters that are not allowed",
                        }
                    ],
                )
            row.admin_notes = notes.strip() or None if notes else None
        db.commit()
        db.refresh(row)
        return row

    router.add_api_route(
        f"/{path}", list_rows, methods=["GET"], response_model=Page[out], name=f"list_{path}"
    )
    router.add_api_route(
        f"/{path}/{{row_id}}",
        update_row,
        methods=["PATCH"],
        response_model=out,
        name=f"update_{path}",
    )


_build("contact-messages", ContactMessage, CONTACT_STATUSES, ContactMessageOut)
_build("quote-requests", QuoteRequest, QUOTE_STATUSES, QuoteRequestOut)
_build("bookings", Booking, BOOKING_STATUSES, BookingOut)
