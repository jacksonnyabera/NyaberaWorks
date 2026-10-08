"""Accounts and sessions: register, sign in, refresh, sign out."""

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from fastapi import Request
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    password_needs_rehash,
    verify_password,
)
from app.modules.auth.schemas import ChangePasswordIn, LoginIn, ProfileIn, RegisterIn
from app.modules.leads.service import client_ip, hash_ip
from app.modules.users.models import AuthEvent, RefreshToken, User

logger = logging.getLogger("app.auth")

# If two tabs refresh at the same moment, the second presents a token the first
# just rotated. Within this window that is treated as a race, not as theft.
REUSE_GRACE_SECONDS = 10
REGISTER_LIMIT_PER_HOUR = 5
LOGIN_FAILURES_PER_IP = 10  # per 15 minutes


@dataclass
class IssuedSession:
    user: User
    access_token: str
    expires_in: int
    refresh_token: str
    refresh_expires_at: datetime


def _now() -> datetime:
    return datetime.now(UTC)


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _unauthorized(message: str = "Your session has ended. Sign in again.") -> AppError:
    return AppError(401, "UNAUTHORIZED", message)


def _ip_hash(request: Request, settings: Settings) -> str:
    return hash_ip(client_ip(request), settings)


def _count_events(
    db: Session, ip_hash: str, kind: str, since: datetime, success: bool | None
) -> int:
    query = (
        select(func.count())
        .select_from(AuthEvent)
        .where(AuthEvent.ip_hash == ip_hash, AuthEvent.kind == kind, AuthEvent.created_at >= since)
    )
    if success is not None:
        query = query.where(AuthEvent.success == success)
    return db.scalar(query) or 0


def _record(db: Session, kind: str, success: bool, ip_hash: str) -> None:
    db.add(AuthEvent(kind=kind, success=success, ip_hash=ip_hash))
    db.commit()


def _issue_session(
    db: Session,
    user: User,
    settings: Settings,
    request: Request,
    family_id: uuid.UUID | None = None,
    family_expires_at: datetime | None = None,
) -> IssuedSession:
    now = _now()
    raw, token_hash = new_refresh_token()
    family_expires = family_expires_at or now + timedelta(days=settings.session_max_days)
    expires = min(now + timedelta(days=settings.refresh_token_days), family_expires)
    agent = (request.headers.get("user-agent") or "")[:200] or None
    db.add(
        RefreshToken(
            user_id=user.id,
            family_id=family_id or uuid.uuid4(),
            token_hash=token_hash,
            expires_at=expires,
            family_expires_at=family_expires,
            user_agent=agent,
        )
    )
    db.commit()
    access, ttl = create_access_token(user.id, user.role, settings)
    return IssuedSession(user, access, ttl, raw, expires)


def register(db: Session, data: RegisterIn, request: Request, settings: Settings) -> IssuedSession:
    ip_hash = _ip_hash(request, settings)
    since = _now() - timedelta(hours=1)
    if _count_events(db, ip_hash, "register", since, None) >= REGISTER_LIMIT_PER_HOUR:
        raise AppError(429, "TOO_MANY_REQUESTS", "Too many sign-up attempts. Try again in an hour.")
    _record(db, "register", True, ip_hash)

    taken = AppError(
        409,
        "EMAIL_TAKEN",
        "An account with this email already exists. Sign in instead.",
        [{"field": "email", "message": "An account with this email already exists"}],
    )
    if db.scalar(select(User.id).where(User.email == data.email)):
        raise taken
    user = User(
        email=data.email,
        name=data.name,
        phone=data.phone,
        password_hash=hash_password(data.password),
        role="CLIENT",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise taken from None
    logger.info("account created", extra={"fields": {"user_id": str(user.id)}})
    return _issue_session(db, user, settings, request)


def login(db: Session, data: LoginIn, request: Request, settings: Settings) -> IssuedSession:
    ip_hash = _ip_hash(request, settings)
    now = _now()
    recent_failures = _count_events(db, ip_hash, "login", now - timedelta(minutes=15), False)
    if recent_failures >= LOGIN_FAILURES_PER_IP:
        raise AppError(
            429, "TOO_MANY_REQUESTS", "Too many failed sign-in attempts. Try again in 15 minutes."
        )

    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if user and user.locked_until and _aware(user.locked_until) > now:
        raise AppError(
            429,
            "ACCOUNT_LOCKED",
            "Too many failed sign-in attempts. "
            f"Try again in {settings.login_lockout_minutes} minutes.",
        )

    password_ok = verify_password(data.password, user.password_hash if user else None)
    if not (password_ok and user and user.is_active):
        if user:
            user.failed_login_count += 1
            if user.failed_login_count >= settings.login_max_failures:
                user.locked_until = now + timedelta(minutes=settings.login_lockout_minutes)
                user.failed_login_count = 0
                logger.warning("account locked", extra={"fields": {"user_id": str(user.id)}})
            db.commit()
        _record(db, "login", False, ip_hash)
        raise AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password.")

    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(data.password)
    db.commit()
    _record(db, "login", True, ip_hash)
    return _issue_session(db, user, settings, request)


def refresh(
    db: Session, raw_token: str | None, request: Request, settings: Settings
) -> IssuedSession:
    if not raw_token:
        raise _unauthorized()
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw_token)))
    if row is None:
        raise _unauthorized()
    now = _now()
    if _aware(row.expires_at) <= now or _aware(row.family_expires_at) <= now:
        raise _unauthorized("Your session has expired. Sign in again.")
    if row.revoked_at is not None:
        raise _unauthorized()  # this sign-in was ended on purpose
    if row.rotated_at is not None:
        if now - _aware(row.rotated_at) > timedelta(seconds=REUSE_GRACE_SECONDS):
            # An already-used token came back: someone may have copied it. End the whole sign-in.
            _revoke_family(db, row.family_id)
            logger.warning("refresh token reuse", extra={"fields": {"user_id": str(row.user_id)}})
            raise _unauthorized()
    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        raise _unauthorized()
    if row.rotated_at is None:
        row.rotated_at = now
    return _issue_session(
        db,
        user,
        settings,
        request,
        family_id=row.family_id,
        family_expires_at=_aware(row.family_expires_at),
    )


def _revoke_family(db: Session, family_id: uuid.UUID) -> None:
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=_now())
    )
    db.commit()


def logout(db: Session, raw_token: str | None) -> None:
    """Sign out this device. Never fails: signing out twice is fine."""
    if not raw_token:
        return
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw_token)))
    if row:
        _revoke_family(db, row.family_id)


def update_profile(db: Session, user: User, data: ProfileIn) -> User:
    user.name = data.name
    user.phone = data.phone
    db.commit()
    return user


def change_password(
    db: Session, user: User, data: ChangePasswordIn, request: Request, settings: Settings
) -> IssuedSession:
    if not verify_password(data.current_password, user.password_hash):
        raise AppError(
            400,
            "INVALID_PASSWORD",
            "Your current password is not correct.",
            [{"field": "currentPassword", "message": "Your current password is not correct"}],
        )
    user.password_hash = hash_password(data.new_password)
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=_now())
    )
    db.commit()
    logger.info("password changed", extra={"fields": {"user_id": str(user.id)}})
    # Every other device is signed out; this one gets a fresh session.
    return _issue_session(db, user, settings, request)
