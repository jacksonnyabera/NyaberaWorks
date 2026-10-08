"""Password hashing and tokens.

- Passwords are hashed with Argon2id (a slow, memory-hard hash). Plain
  passwords are never stored or logged.
- The access token is a short-lived signed JWT.
- The refresh token is a random string. Only its SHA-256 hash is stored, so a
  database leak does not hand out working sessions.
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import Settings

_hasher = PasswordHasher()
# Verifying against this when the email is unknown keeps response time similar,
# so timing does not reveal which emails have accounts.
_DUMMY_HASH = _hasher.hash("not-a-real-password-for-timing-only")

ALGORITHM = "HS256"
# Development only: used when APP_SECRET_KEY is empty. It changes every restart,
# which just signs you out. Production refuses to start without a real key.
_DEV_JWT_SECRET = secrets.token_urlsafe(48)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    """Check a password. Pass None for an unknown user to spend equal time."""
    try:
        _hasher.verify(password_hash or _DUMMY_HASH, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
    return password_hash is not None


def password_needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def _jwt_secret(settings: Settings) -> str:
    return settings.app_secret_key or _DEV_JWT_SECRET


def create_access_token(user_id: uuid.UUID, role: str, settings: Settings) -> tuple[str, int]:
    """Return (token, seconds until it expires)."""
    now = datetime.now(UTC)
    lifetime = timedelta(minutes=settings.access_token_minutes)
    payload = {
        "sub": str(user_id),
        "role": role,
        "typ": "access",
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + lifetime,
    }
    return jwt.encode(payload, _jwt_secret(settings), algorithm=ALGORITHM), int(
        lifetime.total_seconds()
    )


def decode_access_token(token: str, settings: Settings) -> dict:
    """Return the token's claims, or raise jwt.PyJWTError if it is invalid or expired."""
    claims = jwt.decode(
        token,
        _jwt_secret(settings),
        algorithms=[ALGORITHM],  # never trust the algorithm named inside the token
        options={"require": ["exp", "sub", "iat"]},
    )
    if claims.get("typ") != "access":
        raise jwt.InvalidTokenError("wrong token type")
    return claims


def new_refresh_token() -> tuple[str, str]:
    """Return (raw token for the cookie, hash for the database)."""
    raw = secrets.token_urlsafe(48)
    return raw, hash_token(raw)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
