"""Admin-only endpoints. Everything here requires an ADMIN account."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.modules.admin import catalog, clients, conversations, leads
from app.modules.auth.deps import require_admin
from app.modules.auth.schemas import CamelModel
from app.modules.leads.models import Booking, ContactMessage, QuoteRequest
from app.modules.users.models import User

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


router.include_router(leads.router)
router.include_router(conversations.router)
router.include_router(clients.router)
router.include_router(catalog.router)


class Overview(CamelModel):
    new_contact_messages: int
    new_quote_requests: int
    pending_bookings: int
    clients: int


def _count(db: Session, model, *conditions) -> int:  # noqa: ANN001
    return db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0


@router.get("/overview", response_model=Overview)
def overview(db: Annotated[Session, Depends(get_db)]) -> Overview:
    return Overview(
        new_contact_messages=_count(db, ContactMessage, ContactMessage.status == "new"),
        new_quote_requests=_count(db, QuoteRequest, QuoteRequest.status == "new"),
        pending_bookings=_count(db, Booking, Booking.status == "requested"),
        clients=_count(db, User, User.role == "CLIENT"),
    )
