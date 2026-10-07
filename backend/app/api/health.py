"""Health check: lets you (and later, uptime monitors) confirm the API is alive."""

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app import __version__

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    time: datetime


@router.get("/health", response_model=HealthResponse, summary="Health check")
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="nyaberaworks-api",
        version=__version__,
        time=datetime.now(timezone.utc),
    )