"""Client side: my requests, the conversation under each, and answering quotations."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.modules.auth.deps import CurrentUser
from app.modules.auth.schemas import CamelModel
from app.modules.conversations import service
from app.modules.conversations.schemas import LeadDetail, LeadSummary, MessageIn

router = APIRouter(prefix="/me", tags=["account"])
Db = Annotated[Session, Depends(get_db)]


class Unread(CamelModel):
    unread: int


@router.get("/requests", response_model=list[LeadSummary])
def my_requests(user: CurrentUser, db: Db, response: Response) -> list[LeadSummary]:
    response.headers["Cache-Control"] = "no-store"
    return service.list_for_user(db, user)


@router.get("/unread", response_model=Unread)
def my_unread(user: CurrentUser, db: Db, response: Response) -> Unread:
    response.headers["Cache-Control"] = "no-store"
    return Unread(unread=service.unread_total(db, user))


@router.get("/requests/{kind}/{lead_id}", response_model=LeadDetail)
def my_request(
    kind: str, lead_id: uuid.UUID, user: CurrentUser, db: Db, response: Response
) -> LeadDetail:
    response.headers["Cache-Control"] = "no-store"
    row = service.load_own_lead(db, user, kind, lead_id)
    return service.detail(db, kind, row, "CLIENT")


@router.post("/requests/{kind}/{lead_id}/messages", status_code=201, response_model=LeadDetail)
def reply(kind: str, lead_id: uuid.UUID, data: MessageIn, user: CurrentUser, db: Db) -> LeadDetail:
    row = service.load_own_lead(db, user, kind, lead_id)
    service.client_reply(db, user, kind, row, data.body)
    return service.detail(db, kind, row, "CLIENT")


@router.post("/quotations/{quotation_id}/{decision}", response_model=LeadDetail)
def answer_quotation(
    quotation_id: uuid.UUID, decision: str, user: CurrentUser, db: Db
) -> LeadDetail:
    from app.core.errors import AppError

    if decision not in ("accept", "decline"):
        raise AppError(404, "NOT_FOUND", "Not found.")
    quotation, row = service.load_quotation(db, quotation_id)
    service.respond_to_quotation(db, user, quotation, row, decision == "accept")
    return service.detail(db, "quote", row, "CLIENT")
