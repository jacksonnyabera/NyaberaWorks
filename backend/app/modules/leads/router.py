"""Public endpoints behind the contact, quote and booking forms."""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.modules.leads import service
from app.modules.leads.notify import notify_new_lead
from app.modules.leads.schemas import BookingIn, ContactIn, LeadReceipt, QuoteIn

router = APIRouter(tags=["leads"])

Db = Annotated[Session, Depends(get_db)]
Config = Annotated[Settings, Depends(get_settings)]


def _notify_if_real(
    tasks: BackgroundTasks,
    kind: str,
    data,
    receipt: LeadReceipt,
    settings: Settings,  # noqa: ANN001
) -> None:
    # Bots that fill the hidden field get a fake receipt (id "0"); nothing was saved.
    if receipt.id == "0":
        return
    if settings.email_send_inline:
        notify_new_lead(kind, data, receipt, settings)  # never raises
    else:
        tasks.add_task(notify_new_lead, kind, data, receipt, settings)


@router.post("/contact-messages", status_code=201, response_model=LeadReceipt)
def create_contact_message(
    data: ContactIn, request: Request, db: Db, settings: Config, tasks: BackgroundTasks
) -> LeadReceipt:
    receipt = service.save_contact(db, data, request, settings)
    _notify_if_real(tasks, "C", data, receipt, settings)
    return receipt


@router.post("/quote-requests", status_code=201, response_model=LeadReceipt)
def create_quote_request(
    data: QuoteIn, request: Request, db: Db, settings: Config, tasks: BackgroundTasks
) -> LeadReceipt:
    receipt = service.save_quote(db, data, request, settings)
    _notify_if_real(tasks, "Q", data, receipt, settings)
    return receipt


@router.post("/bookings", status_code=201, response_model=LeadReceipt)
def create_booking(
    data: BookingIn, request: Request, db: Db, settings: Config, tasks: BackgroundTasks
) -> LeadReceipt:
    receipt = service.save_booking(db, data, request, settings)
    _notify_if_real(tasks, "B", data, receipt, settings)
    return receipt
