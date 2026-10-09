"""Admin management of services and portfolio projects."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.modules.auth.deps import AdminUser
from app.modules.catalog import service
from app.modules.catalog.models import Project, Service
from app.modules.catalog.schemas import (
    AdminProjectOut,
    AdminServiceOut,
    ProjectCreate,
    ProjectUpdate,
    ServiceCreate,
    ServiceUpdate,
)

logger = logging.getLogger("app.admin")
router = APIRouter()
Db = Annotated[Session, Depends(get_db)]


def _log(admin: AdminUser, action: str, kind: str, slug: str) -> None:
    logger.info(
        "admin change",
        extra={"fields": {"admin": str(admin.id), "action": action, "kind": kind, "slug": slug}},
    )


@router.get("/services", response_model=list[AdminServiceOut])
def list_services(db: Db):
    return service.list_all(db, Service)


@router.post("/services", status_code=201, response_model=AdminServiceOut)
def create_service(data: ServiceCreate, db: Db, admin: AdminUser):
    row = service.create(db, Service, data.model_dump())
    _log(admin, "create", "service", row.slug)
    return row


@router.put("/services/{slug}", response_model=AdminServiceOut)
def update_service(slug: str, data: ServiceUpdate, db: Db, admin: AdminUser):
    row = service.update(db, service.require(db, Service, slug), data.model_dump())
    _log(admin, "update", "service", slug)
    return row


@router.get("/projects", response_model=list[AdminProjectOut])
def list_projects(db: Db):
    return service.list_all(db, Project)


@router.post("/projects", status_code=201, response_model=AdminProjectOut)
def create_project(data: ProjectCreate, db: Db, admin: AdminUser):
    row = service.create(db, Project, data.model_dump())
    _log(admin, "create", "project", row.slug)
    return row


@router.put("/projects/{slug}", response_model=AdminProjectOut)
def update_project(slug: str, data: ProjectUpdate, db: Db, admin: AdminUser):
    row = service.update(db, service.require(db, Project, slug), data.model_dump())
    _log(admin, "update", "project", slug)
    return row
