"""Public, read-only endpoints for the website's services and portfolio."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.modules.catalog import service
from app.modules.catalog.models import Project, Service
from app.modules.catalog.schemas import ProjectOut, ServiceOut

router = APIRouter(tags=["catalog"])
Db = Annotated[Session, Depends(get_db)]


@router.get("/services", response_model=list[ServiceOut])
def list_services(db: Db) -> list[Service]:
    return list(service.list_active(db, Service))


@router.get("/services/{slug}", response_model=ServiceOut)
def get_service(slug: str, db: Db) -> Service:
    return service.require(db, Service, slug, active_only=True)


@router.get("/projects", response_model=list[ProjectOut])
def list_projects(db: Db) -> list[Project]:
    return list(service.list_active(db, Project))


@router.get("/projects/{slug}", response_model=ProjectOut)
def get_project(slug: str, db: Db) -> Project:
    return service.require(db, Project, slug, active_only=True)
