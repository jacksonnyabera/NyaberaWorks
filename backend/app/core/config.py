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
    # Sign-in sessions. The access token lives in browser memory for a short time;
    # the refresh token lives in an httpOnly cookie and is rotated on every use.
    access_token_minutes: int = 15
    refresh_token_days: int = 14
    session_max_days: int = 30
    login_max_failures: int = 5
    login_lockout_minutes: int = 15
    # Shared with the website server (Cloud Run). When it matches the X-Proxy-Secret header,
    # the X-Client-IP header is trusted as the visitor's address. Empty = never trusted.
    proxy_shared_secret: str = ""
    # Email notifications to you when a visitor submits a form.
    # "console" only writes a short line to the log (fine for development).
    # "smtp" sends real email through your mail provider.
    email_backend: Literal["console", "smtp"] = "console"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_starttls: bool = True
    email_from: str = ""
    admin_notify_email: str = ""
    # Send the notification before replying instead of after. Needed on hosts that
    # pause the server as soon as the reply is sent (Cloud Run).
    email_send_inline: bool = False

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    @property
    def cookie_secure(self) -> bool:
        """Send cookies over HTTPS only (always true for a real https:// site)."""
        return self.is_production or self.site_url.startswith("https://")

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
        if self.proxy_shared_secret and len(self.proxy_shared_secret) < 32:
            raise ValueError("PROXY_SHARED_SECRET must be at least 32 characters")
        if self.email_backend == "smtp":
            missing = [
                name.upper()
                for name in ("smtp_host", "email_from", "admin_notify_email")
                if not getattr(self, name)
            ]
            if missing:
                raise ValueError(f"EMAIL_BACKEND=smtp needs these set: {', '.join(missing)}")
        if "*" in self.cors_origins:
            raise ValueError("CORS_ALLOWED_ORIGINS must not contain '*'")
        return self


@lru_cache
def get_settings() -> Settings:
    """Create the settings once and reuse them."""
    return Settings()
