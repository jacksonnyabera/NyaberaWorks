"""Shapes for services and portfolio projects (public and admin)."""

import re
import uuid
from typing import Annotated, Literal

from pydantic import AfterValidator, Field, StringConstraints, field_validator

from app.modules.auth.schemas import CamelModel
from app.modules.catalog.models import PROJECT_CATEGORIES, PROJECT_MOTIFS, PROJECT_STATUSES

_SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def _no_control_chars(value: str) -> str:
    if any(ord(ch) < 32 and ch not in "\n\r\t" for ch in value):
        raise ValueError("Contains characters that are not allowed")
    return value


def _slug(value: str) -> str:
    if not _SLUG.match(value):
        raise ValueError("Use lower-case letters, numbers and single hyphens, e.g. my-service")
    if value == "other":
        raise ValueError('"other" is reserved for the form\'s "something else" choice')
    return value


Text = Annotated[str, AfterValidator(_no_control_chars)]
Slug = Annotated[str, StringConstraints(min_length=2, max_length=80), AfterValidator(_slug)]
Line = Annotated[Text, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
Short = Annotated[Text, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Medium = Annotated[Text, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
Long = Annotated[Text, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]
LineList = Annotated[list[Line], Field(max_length=30)]


def _blank_to_none(value: object) -> object:
    if isinstance(value, str) and value.strip() == "":
        return None
    return value


# ---------- services ----------


class ServiceFields(CamelModel):
    title: Short
    summary: Medium
    description: Long
    problem: Long
    deliverables: Annotated[LineList, Field(min_length=1)]
    technologies: LineList
    timeline: Medium
    starting_price_kes: Annotated[int, Field(ge=0, le=100_000_000)] | None = None
    best_for: Medium
    note: Annotated[Long, Field()] | None = None
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0, le=10_000)

    @field_validator("note", "starting_price_kes", mode="before")
    @classmethod
    def _empty_is_none(cls, value: object) -> object:
        return _blank_to_none(value)


class ServiceCreate(ServiceFields):
    slug: Slug


class ServiceUpdate(ServiceFields):
    """The slug cannot change: it is part of the page address."""


class ServiceOut(CamelModel):
    slug: str
    title: str
    summary: str
    description: str
    problem: str
    deliverables: list[str]
    technologies: list[str]
    timeline: str
    starting_price_kes: int | None
    best_for: str
    note: str | None


class AdminServiceOut(ServiceOut):
    id: uuid.UUID
    is_active: bool
    sort_order: int


# ---------- projects ----------

Category = Literal[PROJECT_CATEGORIES]  # type: ignore[valid-type]
Status = Literal[PROJECT_STATUSES]  # type: ignore[valid-type]
Motif = Literal[PROJECT_MOTIFS]  # type: ignore[valid-type]


def _http_url(value: str) -> str:
    if not re.match(r"^https?://[^\s]+$", value):
        raise ValueError("Enter a full web address starting with https://")
    return value


Url = Annotated[
    Text, StringConstraints(strip_whitespace=True, max_length=300), AfterValidator(_http_url)
]


class ProjectFields(CamelModel):
    title: Short
    category: Category
    status: Status
    summary: Annotated[Text, StringConstraints(strip_whitespace=True, min_length=1, max_length=400)]
    problem: Long
    solution: Long
    features: Annotated[LineList, Field(min_length=1)]
    technologies: LineList
    result: Long
    live_url: Url | None = None
    featured: bool = False
    motif: Motif
    caveat: Long | None = None
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0, le=10_000)

    @field_validator("live_url", "caveat", mode="before")
    @classmethod
    def _empty_is_none(cls, value: object) -> object:
        return _blank_to_none(value)


class ProjectCreate(ProjectFields):
    slug: Slug


class ProjectUpdate(ProjectFields):
    """The slug cannot change: it is part of the page address."""


class ProjectOut(CamelModel):
    slug: str
    title: str
    category: str
    status: str
    summary: str
    problem: str
    solution: str
    features: list[str]
    technologies: list[str]
    result: str
    live_url: str | None
    featured: bool
    motif: str
    caveat: str | None


class AdminProjectOut(ProjectOut):
    id: uuid.UUID
    is_active: bool
    sort_order: int
