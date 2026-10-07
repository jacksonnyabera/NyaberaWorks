import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.main import create_app


def test_defaults_are_safe_for_development() -> None:
    settings = Settings()
    assert settings.app_env == "development"
    assert settings.app_debug is False
    assert settings.cors_origins == []


def test_cors_origins_are_split_and_trimmed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "http://a.test, http://b.test ,")
    assert Settings().cors_origins == ["http://a.test", "http://b.test"]


def test_production_refuses_debug_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("APP_DEBUG", "true")
    monkeypatch.setenv("ENABLE_API_DOCS", "false")
    with pytest.raises(ValidationError):
        Settings()


def test_production_refuses_public_api_docs(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ENABLE_API_DOCS", "true")
    with pytest.raises(ValidationError):
        Settings()


def test_wildcard_cors_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "*")
    with pytest.raises(ValidationError):
        Settings()


def test_api_docs_can_be_switched_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENABLE_API_DOCS", "false")
    get_settings.cache_clear()
    client = TestClient(create_app(), raise_server_exceptions=False)
    assert client.get("/api/docs").status_code == 404
    assert client.get("/api/openapi.json").status_code == 404
    assert client.get("/api/health").status_code == 200
