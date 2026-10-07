"""Public endpoints behind the contact, quote and booking forms."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.modules.leads import service
from app.modules.leads.schemas import BookingIn, ContactIn, LeadReceipt, QuoteIn

router = APIRouter(tags=["leads"])

Db = Annotated[Session, Depends(get_db)]
Config = Annotated[Settings, Depends(get_settings)]


@router.post("/contact-messages", status_code=201, response_model=LeadReceipt)
def create_contact_message(
    data: ContactIn, request: Request, db: Db, settings: Config
) -> LeadReceipt:
    return service.save_contact(db, data, request, settings)


@router.post("/quote-requests", status_code=201, response_model=LeadReceipt)
def create_quote_request(data: QuoteIn, request: Request, db: Db, settings: Config) -> LeadReceipt:
    return service.save_quote(db, data, request, settings)


@router.post("/bookings", status_code=201, response_model=LeadReceipt)
def create_booking(data: BookingIn, request: Request, db: Db, settings: Config) -> LeadReceipt:
    return service.save_booking(db, data, request, settings)
