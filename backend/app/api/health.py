"""Health checks: lets you (and later, uptime monitors) confirm the API is alive."""

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text

from app import __version__
from app.core.db import get_engine

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    time: datetime


class ReadyResponse(BaseModel):
    status: Literal["ready", "unavailable"]
    database: Literal["ok", "down"]


@router.get("/health", response_model=HealthResponse, summary="Health check")
async def health() -> HealthResponse:
    """Is the API process alive? Does not touch the database."""
    return HealthResponse(
        status="ok",
        service="nyaberaworks-api",
        version=__version__,
        time=datetime.now(UTC),
    )


@router.get(
    "/health/ready",
    response_model=ReadyResponse,
    responses={503: {"model": ReadyResponse}},
    summary="Readiness check (includes the database)",
)
def ready() -> ReadyResponse | JSONResponse:
    """Can the API reach PostgreSQL? Used by Docker health checks."""
    try:
        with get_engine().connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unavailable", "database": "down"})
    return ReadyResponse(status="ready", database="ok")
