"""Reusable checks for routes: who is calling, and are they allowed?"""

import uuid
from typing import Annotated
from urllib.parse import urlsplit

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import decode_access_token
from app.modules.users.models import User

_bearer = HTTPBearer(auto_error=False)


def _unauthorized(message: str) -> AppError:
    return AppError(401, "UNAUTHORIZED", message)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    """The signed-in user, or a 401. The role is read from the database every time,
    so disabling an account or changing a role takes effect immediately."""
    if credentials is None:
        raise _unauthorized("Sign in to continue.")
    try:
        claims = decode_access_token(credentials.credentials, settings)
        user_id = uuid.UUID(claims["sub"])
    except (jwt.PyJWTError, ValueError):
        raise _unauthorized("Your session has expired. Sign in again.") from None
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _unauthorized("Your session has expired. Sign in again.")
    return user


def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User | None:
    """The signed-in user if there is a valid token, otherwise None (a guest).
    Used by the public forms, which work with or without an account."""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db, settings)
    except AppError:
        return None


def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != "ADMIN":
        raise AppError(403, "FORBIDDEN", "You do not have access to this area.")
    return user


def _origin(url: str) -> str:
    parts = urlsplit(url)
    return f"{parts.scheme}://{parts.netloc}".lower()


def require_same_origin(
    request: Request, settings: Annotated[Settings, Depends(get_settings)]
) -> None:
    """Cookie-based endpoints only accept requests that come from our own site.

    Browsers always send the Origin header on cross-site POSTs; tools like curl
    do not send it, so they are allowed (they cannot ride on a visitor's cookies).
    """
    origin = request.headers.get("origin")
    if origin is None:
        return
    allowed = {_origin(settings.site_url), *(_origin(o) for o in settings.cors_origins)}
    if origin.lower() in allowed:
        return
    if not settings.is_production:
        parts = urlsplit(origin)
        if parts.scheme == "http" and parts.hostname in {"localhost", "127.0.0.1"}:
            return  # local development, any port
    raise AppError(403, "FORBIDDEN", "This request came from an unexpected website.")


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
AdminUser = Annotated[User, Depends(require_admin)]
