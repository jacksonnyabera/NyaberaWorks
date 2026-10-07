"""Application settings, read from environment variables and backend/.env.

Settings are validated when the app starts. If something is wrong the app
refuses to start, which is safer than running with a bad configuration.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ folder (this file is backend/app/core/config.py)
BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",  # ignore variables that belong to other parts of the project
    )

    app_env: Literal["development", "staging", "production"] = "development"
    app_debug: bool = False
    site_url: str = "http://localhost:3000"
    enable_api_docs: bool = True
    # Comma-separated list. Empty means "no cross-origin access", which is the
    # correct production setting because the site and API share one domain.
    cors_allowed_origins: str = ""
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    # PostgreSQL connection string. No default on purpose: it holds a password,
    # so it comes from backend/.env or the server environment.
    database_url: str = ""
    # Long random value used to hash visitor IP addresses (and, later, sign tokens).
    app_secret_key: str = ""
    # Public form spam limit: submissions allowed per visitor per hour.
    lead_rate_limit_per_hour: int = 5

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @model_validator(mode="after")
    def _check_production_safety(self) -> "Settings":
        if self.is_production and self.app_debug:
            raise ValueError("APP_DEBUG must be false when APP_ENV=production")
        if self.is_production and self.enable_api_docs:
            raise ValueError("ENABLE_API_DOCS must be false when APP_ENV=production")
        if self.is_production and not self.database_url:
            raise ValueError("DATABASE_URL must be set when APP_ENV=production")
        if self.is_production and len(self.app_secret_key) < 32:
            raise ValueError("APP_SECRET_KEY must be at least 32 characters in production")
        if "*" in self.cors_origins:
            raise ValueError("CORS_ALLOWED_ORIGINS must not contain '*'")
        return self


@lru_cache
def get_settings() -> Settings:
    """Create the settings once and reuse them."""
    return Settings()
