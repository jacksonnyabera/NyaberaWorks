"""Admin side: read and answer the conversation under a request, and send quotations."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.modules.auth.deps import AdminUser
from app.modules.conversations import service
from app.modules.conversations.schemas import LeadDetail, MessageIn, QuotationIn

router = APIRouter()
Db = Annotated[Session, Depends(get_db)]


@router.get("/requests/{kind}/{lead_id}/thread", response_model=LeadDetail)
def thread(kind: str, lead_id: uuid.UUID, db: Db) -> LeadDetail:
    row = service.load_lead(db, kind, lead_id)
    return service.detail(db, kind, row, "ADMIN")


@router.post("/requests/{kind}/{lead_id}/messages", status_code=201, response_model=LeadDetail)
def reply(kind: str, lead_id: uuid.UUID, data: MessageIn, admin: AdminUser, db: Db) -> LeadDetail:
    row = service.load_lead(db, kind, lead_id)
    service.admin_reply(db, admin, kind, row, data.body)
    return service.detail(db, kind, row, "ADMIN")


@router.post("/quote-requests/{lead_id}/quotations", status_code=201, response_model=LeadDetail)
def send_quotation(lead_id: uuid.UUID, data: QuotationIn, db: Db) -> LeadDetail:
    row = service.load_lead(db, "quote", lead_id)
    service.create_quotation(db, row, data.amount_kes, data.details, data.valid_until)
    return service.detail(db, "quote", row, "ADMIN")


@router.post("/quotations/{quotation_id}/withdraw", response_model=LeadDetail)
def withdraw(quotation_id: uuid.UUID, db: Db) -> LeadDetail:
    quotation, row = service.load_quotation(db, quotation_id)
    service.withdraw_quotation(db, quotation, row)
    return service.detail(db, "quote", row, "ADMIN")
