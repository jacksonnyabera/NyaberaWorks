"""Shapes used by the admin endpoints."""

import uuid
from datetime import date, datetime
from typing import Annotated, Generic, TypeVar

from pydantic import Field, StringConstraints

from app.modules.auth.schemas import CamelModel

T = TypeVar("T")


class Page(CamelModel, Generic[T]):  # noqa: UP046 - keeps the schema name simple in OpenAPI
    items: list[T]
    total: int
    page: int
    page_size: int


class LeadOutBase(CamelModel):
    id: uuid.UUID
    reference: str
    name: str
    email: str
    phone: str | None
    service: str
    status: str
    admin_notes: str | None
    user_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class ContactMessageOut(LeadOutBase):
    message: str


class QuoteRequestOut(LeadOutBase):
    budget: str
    deadline: date | None
    description: str


class BookingOut(LeadOutBase):
    preferred_date: date
    preferred_time: str
    requirements: str


class LeadUpdate(CamelModel):
    status: str | None = None
    admin_notes: Annotated[str, StringConstraints(max_length=4000)] | None = None


class ClientOut(CamelModel):
    id: uuid.UUID
    name: str
    email: str
    phone: str | None
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None


class ClientUpdate(CamelModel):
    is_active: bool


PageNumber = Annotated[int, Field(ge=1, le=100_000)]
PageSize = Annotated[int, Field(ge=1, le=100)]
