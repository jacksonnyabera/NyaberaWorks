"""Accounts and sessions: register, sign in, refresh, sign out."""

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from fastapi import Request
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import totp
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
from app.modules.auth.schemas import (
    ChangePasswordIn,
    ForgotPasswordIn,
    LoginIn,
    ProfileIn,
    RegisterIn,
    ResetPasswordIn,
    check_password_strength,
)
from app.modules.leads.service import client_ip, hash_ip
from app.modules.users.models import AuthEvent, PasswordResetToken, RefreshToken, User

logger = logging.getLogger("app.auth")

# If two tabs refresh at the same moment, the second presents a token the first
# just rotated. Within this window that is treated as a race, not as theft.
REUSE_GRACE_SECONDS = 10
REGISTER_LIMIT_PER_HOUR = 5
LOGIN_FAILURES_PER_IP = 10  # per 15 minutes
RESET_REQUESTS_PER_IP_PER_HOUR = 5
RESET_LINKS_PER_ACCOUNT_PER_HOUR = 3
RESET_LINK_MINUTES = 30


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
        _failed_attempt(db, user, ip_hash, now, settings)
        raise AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password.")

    if user.totp_enabled:
        if not data.totp_code:
            # The password was right; the second step is still needed. Not counted as a failure.
            raise AppError(
                401, "TOTP_REQUIRED", "Enter the 6-digit code from your authenticator app."
            )
        if not _check_second_factor(user, data.totp_code):
            _failed_attempt(db, user, ip_hash, now, settings)
            raise AppError(
                401,
                "INVALID_CODE",
                "That code is not correct or was already used. Try the next code.",
            )

    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(data.password)
    db.commit()
    _record(db, "login", True, ip_hash)
    return _issue_session(db, user, settings, request)


def _failed_attempt(
    db: Session, user: User | None, ip_hash: str, now: datetime, settings: Settings
) -> None:
    if user:
        user.failed_login_count += 1
        if user.failed_login_count >= settings.login_max_failures:
            user.locked_until = now + timedelta(minutes=settings.login_lockout_minutes)
            user.failed_login_count = 0
            logger.warning("account locked", extra={"fields": {"user_id": str(user.id)}})
        db.commit()
    _record(db, "login", False, ip_hash)


def _check_second_factor(user: User, code: str) -> bool:
    """Accepts an authenticator code (once per time step) or a single-use recovery code."""
    if user.totp_secret and code.isdigit():
        step = totp.verify(user.totp_secret, code, user.totp_last_step)
        if step is not None:
            user.totp_last_step = step
            return True
        return False
    wanted = hash_token(totp.normalize_recovery(code))
    remaining = list(user.recovery_hashes or [])
    if wanted in remaining:
        remaining.remove(wanted)
        user.recovery_hashes = remaining  # new list so the change is saved
        logger.warning("recovery code used", extra={"fields": {"user_id": str(user.id)}})
        return True
    return False


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


# ---------- password reset ----------


def request_password_reset(
    db: Session, data: ForgotPasswordIn, request: Request, settings: Settings
) -> tuple[str, str, str] | None:
    """Returns (to, subject, body) when an email should be sent, otherwise None.

    The caller sends it after replying, so the response time and text are the same whether or
    not the address has an account.
    """
    ip_hash = _ip_hash(request, settings)
    now = _now()
    if _count_events(db, ip_hash, "reset", now - timedelta(hours=1), None) >= (
        RESET_REQUESTS_PER_IP_PER_HOUR
    ):
        raise AppError(429, "TOO_MANY_REQUESTS", "Too many requests. Try again in an hour.")
    _record(db, "reset", True, ip_hash)

    user = db.scalar(select(User).where(User.email == data.email))
    if user is None or not user.is_active:
        return None
    recent = (
        db.scalar(
            select(func.count())
            .select_from(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.created_at >= now - timedelta(hours=1),
            )
        )
        or 0
    )
    if recent >= RESET_LINKS_PER_ACCOUNT_PER_HOUR:
        return None
    raw, token_hash = new_refresh_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(minutes=RESET_LINK_MINUTES),
        )
    )
    db.commit()
    link = f"{settings.site_url.rstrip('/')}/reset-password#token={raw}"
    body = (
        "Someone asked to reset the password for this account.\n\n"
        f"To choose a new password, open this link within {RESET_LINK_MINUTES} minutes:\n"
        f"{link}\n\n"
        "If you did not ask for this, ignore this email. Your password stays the same.\n"
    )
    return user.email, "Reset your NyaberaWorks password", body


def reset_password(db: Session, data: ResetPasswordIn) -> None:
    now = _now()
    row = db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(data.token))
    )
    if row is None or row.used_at is not None or _aware(row.expires_at) <= now:
        raise AppError(
            400,
            "INVALID_RESET_LINK",
            "This reset link is not valid any more. Request a new one.",
        )
    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        raise AppError(
            400, "INVALID_RESET_LINK", "This reset link is not valid any more. Request a new one."
        )
    try:
        check_password_strength(data.new_password, user.email)
    except ValueError as exc:
        raise AppError(
            422,
            "VALIDATION_ERROR",
            "Request validation failed.",
            [{"field": "newPassword", "message": str(exc)}],
        ) from None
    user.password_hash = hash_password(data.new_password)
    user.failed_login_count = 0
    user.locked_until = None
    row.used_at = now
    # Any other unused links for this account stop working, and every device is signed out.
    db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    db.commit()
    logger.info("password reset", extra={"fields": {"user_id": str(user.id)}})


# ---------- two-factor setup ----------


def totp_setup(db: Session, user: User) -> tuple[str, str]:
    if user.totp_enabled:
        raise AppError(409, "CONFLICT", "Two-factor sign-in is already on.")
    user.totp_secret = totp.new_secret()
    db.commit()
    return user.totp_secret, totp.otpauth_uri(user.totp_secret, user.email)


def totp_enable(db: Session, user: User, code: str) -> list[str]:
    if user.totp_enabled:
        raise AppError(409, "CONFLICT", "Two-factor sign-in is already on.")
    if not user.totp_secret:
        raise AppError(409, "CONFLICT", "Start the setup first.")
    step = totp.verify(user.totp_secret, code)
    if step is None:
        raise AppError(
            400,
            "INVALID_CODE",
            "That code is not correct. Check your phone's clock and try the next code.",
        )
    codes = totp.new_recovery_codes()
    user.totp_enabled = True
    user.totp_last_step = step
    user.recovery_hashes = [hash_token(totp.normalize_recovery(c)) for c in codes]
    db.commit()
    logger.info("two-factor enabled", extra={"fields": {"user_id": str(user.id)}})
    return codes


def totp_disable(db: Session, user: User, password: str, code: str) -> None:
    if not user.totp_enabled:
        return
    if not verify_password(password, user.password_hash):
        raise AppError(
            400,
            "INVALID_PASSWORD",
            "Your password is not correct.",
            [{"field": "password", "message": "Your password is not correct"}],
        )
    if not _check_second_factor(user, code):
        raise AppError(400, "INVALID_CODE", "That code is not correct.")
    user.totp_enabled = False
    user.totp_secret = None
    user.totp_last_step = None
    user.recovery_hashes = None
    db.commit()
    logger.warning("two-factor disabled", extra={"fields": {"user_id": str(user.id)}})
