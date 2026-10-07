"""Shared test setup.

Every test starts from the same known settings, no matter what is in your own
backend/.env file.
"""

from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import db_models  # noqa: F401  (registers every table)
from app.core.config import get_settings
from app.core.db import Base, get_db
from app.main import create_app


@pytest.fixture(autouse=True)
def _clean_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    for name, value in {
        "APP_ENV": "development",
        "APP_DEBUG": "false",
        "ENABLE_API_DOCS": "true",
        "CORS_ALLOWED_ORIGINS": "",
        "LOG_LEVEL": "INFO",
        "DATABASE_URL": "",
        "APP_SECRET_KEY": "",
        "LEAD_RATE_LIMIT_PER_HOUR": "5",
    }.items():
        monkeypatch.setenv(name, value)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def db_session_factory() -> Iterator[sessionmaker[Session]]:
    """A throwaway in-memory database, so tests need no PostgreSQL running."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def app(db_session_factory: sessionmaker[Session]) -> FastAPI:
    application = create_app()

    def override_get_db() -> Iterator[Session]:
        with db_session_factory() as session:
            yield session

    application.dependency_overrides[get_db] = override_get_db
    return application


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    # raise_server_exceptions=False lets us see the 500 response a real client would get.
    return TestClient(app, raise_server_exceptions=False)
