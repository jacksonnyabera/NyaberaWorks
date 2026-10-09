"""Reading and changing services and projects."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.modules.catalog.models import Project, Service


def _order(model):  # noqa: ANN001, ANN202
    return (model.sort_order, model.title)


def list_active(db: Session, model):  # noqa: ANN001, ANN201
    return db.scalars(select(model).where(model.is_active.is_(True)).order_by(*_order(model))).all()


def list_all(db: Session, model):  # noqa: ANN001, ANN201
    return db.scalars(select(model).order_by(*_order(model))).all()


def get_by_slug(db: Session, model, slug: str, *, active_only: bool):  # noqa: ANN001, ANN201
    query = select(model).where(model.slug == slug)
    if active_only:
        query = query.where(model.is_active.is_(True))
    return db.scalar(query)


def require(db: Session, model, slug: str, *, active_only: bool = False):  # noqa: ANN001, ANN201
    row = get_by_slug(db, model, slug, active_only=active_only)
    if row is None:
        raise AppError(404, "NOT_FOUND", "That item does not exist.")
    return row


def create(db: Session, model, values: dict):  # noqa: ANN001, ANN201
    if get_by_slug(db, model, values["slug"], active_only=False):
        raise AppError(
            409,
            "CONFLICT",
            "That address is already in use.",
            [{"field": "slug", "message": "That address is already in use."}],
        )
    row = model(**values)
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError(409, "CONFLICT", "That address is already in use.") from None
    return row


def update(db: Session, row, values: dict):  # noqa: ANN001, ANN201
    for key, value in values.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


def is_valid_service_choice(db: Session, slug: str) -> bool:
    """A form may name an active service, or "other"."""
    return slug == "other" or get_by_slug(db, Service, slug, active_only=True) is not None


__all__ = ["Project", "Service"]
