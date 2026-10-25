"""Shapes for conversations and quotations."""

import uuid
from datetime import date, datetime
from typing import Annotated

from pydantic import AfterValidator, Field, StringConstraints

from app.modules.auth.schemas import CamelModel
from app.modules.leads.schemas import _no_control_chars

Body = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=4000),
    AfterValidator(_no_control_chars),
]
Details = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=10, max_length=6000),
    AfterValidator(_no_control_chars),
]


class MessageIn(CamelModel):
    body: Body


class QuotationIn(CamelModel):
    amount_kes: Annotated[int, Field(ge=100, le=100_000_000)]
    details: Details
    valid_until: date


class MessageOut(CamelModel):
    id: uuid.UUID
    author_role: str
    body: str
    created_at: datetime
    read: bool


class QuotationOut(CamelModel):
    id: uuid.UUID
    amount_kes: int
    details: str
    valid_until: date
    status: str
    expired: bool
    created_at: datetime
    responded_at: datetime | None


class LeadSummary(CamelModel):
    kind: str
    id: uuid.UUID
    reference: str
    service: str
    status: str
    created_at: datetime
    last_activity_at: datetime
    unread: int
    open_quotation: bool


class LeadDetail(CamelModel):
    kind: str
    id: uuid.UUID
    reference: str
    service: str
    status: str
    created_at: datetime
    # The original request, shown as the first entry of the conversation.
    summary: list[tuple[str, str]]
    messages: list[MessageOut]
    quotations: list[QuotationOut]
    can_reply: bool
