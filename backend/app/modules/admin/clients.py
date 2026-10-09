"""Admin list of client accounts. Admin accounts are never listed or changed here."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import AppError
from app.modules.admin.leads import _like
from app.modules.admin.schemas import ClientOut, ClientUpdate, Page
from app.modules.users.models import RefreshToken, User

router = APIRouter()
Db = Annotated[Session, Depends(get_db)]


@router.get("/clients", response_model=Page[ClientOut])
def list_clients(
    db: Db,
    q: Annotated[str | None, Query(max_length=100)] = None,
    page: Annotated[int, Query(ge=1, le=100_000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, alias="pageSize")] = 20,
):
    conditions = [User.role == "CLIENT"]
    if q and q.strip():
        pattern = _like(q.strip().lower())
        conditions.append(
            or_(
                func.lower(User.name).like(pattern, escape="\\"),
                func.lower(User.email).like(pattern, escape="\\"),
            )
        )
    total = db.scalar(select(func.count()).select_from(User).where(*conditions)) or 0
    rows = db.scalars(
        select(User)
        .where(*conditions)
        .order_by(User.created_at.desc(), User.id)
        .limit(page_size)
        .offset((page - 1) * page_size)
    ).all()
    return {"items": rows, "total": total, "page": page, "page_size": page_size}


@router.patch("/clients/{user_id}", response_model=ClientOut)
def update_client(user_id: uuid.UUID, data: ClientUpdate, db: Db):
    user = db.get(User, user_id)
    if user is None or user.role != "CLIENT":
        raise AppError(404, "NOT_FOUND", "That client does not exist.")
    user.is_active = data.is_active
    if not data.is_active:
        # Deactivating also ends every sign-in this person has.
        db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=func.now())
        )
    db.commit()
    db.refresh(user)
    return user
