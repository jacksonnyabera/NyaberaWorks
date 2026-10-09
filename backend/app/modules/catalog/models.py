"""Tables for the service catalogue and the portfolio.

The public site reads these through the API. You edit them in the admin area.
Rows are hidden (is_active = false) rather than deleted, so old links and old
form submissions that mention a service never point at nothing.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Index,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

PROJECT_CATEGORIES = ("Web platform", "Biomedical", "Backend & data", "Automation")
PROJECT_STATUSES = ("Live", "In development", "Built", "Prototype", "Learning project")
PROJECT_MOTIFS = ("listings", "platform", "board", "ledger", "signal", "pipeline")


def _in_list(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


class Service(Base):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[str] = mapped_column(String(120))
    summary: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text)
    problem: Mapped[str] = mapped_column(Text)
    deliverables: Mapped[list[str]] = mapped_column(JSON, default=list)
    technologies: Mapped[list[str]] = mapped_column(JSON, default=list)
    timeline: Mapped[str] = mapped_column(String(200))
    # None means "Priced per project". Whole Kenyan shillings.
    starting_price_kes: Mapped[int | None] = mapped_column(Integer)
    best_for: Mapped[str] = mapped_column(String(300))
    note: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint(
            "starting_price_kes IS NULL OR starting_price_kes >= 0", name="price_valid"
        ),
        Index("ix_services_is_active_sort_order", "is_active", "sort_order"),
    )


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30))
    summary: Mapped[str] = mapped_column(String(400))
    problem: Mapped[str] = mapped_column(Text)
    solution: Mapped[str] = mapped_column(Text)
    features: Mapped[list[str]] = mapped_column(JSON, default=list)
    technologies: Mapped[list[str]] = mapped_column(JSON, default=list)
    result: Mapped[str] = mapped_column(Text)
    live_url: Mapped[str | None] = mapped_column(String(300))
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    motif: Mapped[str] = mapped_column(String(20))
    caveat: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint(_in_list("category", PROJECT_CATEGORIES), name="category_valid"),
        CheckConstraint(_in_list("status", PROJECT_STATUSES), name="status_valid"),
        CheckConstraint(_in_list("motif", PROJECT_MOTIFS), name="motif_valid"),
        Index("ix_projects_is_active_sort_order", "is_active", "sort_order"),
    )
