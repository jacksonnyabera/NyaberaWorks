"""Accounts, sessions and access control."""

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import ALGORITHM, create_access_token, hash_password, verify_password
from app.modules.users.models import RefreshToken, User

PASSWORD = "correct horse battery"
REGISTER = {"name": "Amina Otieno", "email": "Amina@Example.com", "password": PASSWORD}


def register(client, **overrides):
    return client.post("/api/v1/auth/register", json={**REGISTER, **overrides})


def login(client, email="amina@example.com", password=PASSWORD):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def make_admin(db_session_factory, email="boss@example.com"):
    with db_session_factory() as db:
        db.add(
            User(email=email, name="The Boss", password_hash=hash_password(PASSWORD), role="ADMIN")
        )
        db.commit()


# ---------- registration ----------


def test_register_signs_you_in_and_hides_the_password(client, db_session_factory):
    response = register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["tokenType"] == "bearer"
    assert body["user"]["email"] == "amina@example.com"  # lower-cased
    assert body["user"]["role"] == "CLIENT"
    assert "password" not in response.text.lower().replace("passwords", "")
    with db_session_factory() as db:
        user = db.scalar(select(User))
        assert user.password_hash.startswith("$argon2id$")
        assert PASSWORD not in user.password_hash


def test_register_sets_a_locked_down_refresh_cookie(client):
    response = register(client)
    headers = response.headers.get_list("set-cookie")
    refresh = next(h for h in headers if h.startswith("nw_refresh="))
    assert "HttpOnly" in refresh
    assert "SameSite=strict" in refresh
    assert "Path=/api/v1/auth" in refresh
    hint = next(h for h in headers if h.startswith("nw_session="))
    assert "HttpOnly" not in hint  # the page may read this one; it holds nothing secret
    assert response.headers["cache-control"] == "no-store"


def test_duplicate_email_is_a_conflict_on_the_email_field(client):
    assert register(client).status_code == 201
    again = register(client, email="amina@example.com")
    assert again.status_code == 409
    assert again.json()["error"]["details"][0]["field"] == "email"


@pytest.mark.parametrize(
    "password", ["short", "password123", "aaaaaaaaaaaa", "amina@example.com", "x" * 200]
)
def test_weak_passwords_are_rejected_with_a_password_field_error(client, password):
    response = register(client, password=password)
    assert response.status_code == 422
    fields = {d["field"] for d in response.json()["error"]["details"]}
    assert "password" in fields
    assert password not in response.text


def test_register_rejects_extra_fields_so_nobody_can_pick_their_role(client):
    response = register(client, role="ADMIN")
    assert response.status_code == 422


def test_registration_is_rate_limited(client):
    for i in range(5):
        assert register(client, email=f"user{i}@example.com").status_code == 201
    assert register(client, email="one-more@example.com").status_code == 429


# ---------- sign in ----------


def test_login_works_and_wrong_password_is_generic(client):
    register(client)
    assert login(client).status_code == 200
    wrong = login(client, password="wrong password here")
    unknown = login(client, email="nobody@example.com")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["error"]["message"] == unknown.json()["error"]["message"]


def test_account_locks_after_repeated_failures(client):
    register(client)
    for _ in range(5):
        assert login(client, password="wrong password here").status_code == 401
    locked = login(client)  # even the right password is refused while locked
    assert locked.status_code == 429
    assert locked.json()["error"]["code"] == "ACCOUNT_LOCKED"


def test_lock_expires(client, db_session_factory):
    register(client)
    for _ in range(5):
        login(client, password="wrong password here")
    with db_session_factory() as db:
        user = db.scalar(select(User))
        user.locked_until = datetime.now(UTC) - timedelta(minutes=1)
        db.commit()
    assert login(client).status_code == 200


def test_disabled_accounts_cannot_sign_in(client, db_session_factory):
    register(client)
    with db_session_factory() as db:
        db.scalar(select(User)).is_active = False
        db.commit()
    assert login(client).status_code == 401


def test_per_ip_failure_limit(client):
    for i in range(10):
        login(client, email=f"ghost{i}@example.com")
    assert login(client, email="ghost-final@example.com").status_code == 429


# ---------- current user and access control ----------


def test_me_requires_a_valid_token(client):
    token = register(client).json()["accessToken"]
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/auth/me", headers=bearer("garbage")).status_code == 401
    ok = client.get("/api/v1/auth/me", headers=bearer(token))
    assert ok.status_code == 200
    assert ok.json()["email"] == "amina@example.com"


def test_expired_and_forged_tokens_are_rejected(client, db_session_factory):
    register(client)
    with db_session_factory() as db:
        user = db.scalar(select(User))
        user_id = user.id
    settings = get_settings()
    now = datetime.now(UTC)
    expired = jwt.encode(
        {
            "sub": str(user_id),
            "role": "CLIENT",
            "typ": "access",
            "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),
        },
        settings.app_secret_key or __import__("app.core.security", fromlist=["x"])._DEV_JWT_SECRET,
        algorithm=ALGORITHM,
    )
    assert client.get("/api/v1/auth/me", headers=bearer(expired)).status_code == 401
    forged = jwt.encode(
        {
            "sub": str(user_id),
            "role": "ADMIN",
            "typ": "access",
            "iat": now,
            "exp": now + timedelta(hours=1),
        },
        "some-other-secret-that-is-long-enough-for-hs256",
        algorithm=ALGORITHM,
    )
    assert client.get("/api/v1/auth/me", headers=bearer(forged)).status_code == 401
    unsigned = jwt.encode(
        {
            "sub": str(user_id),
            "role": "ADMIN",
            "typ": "access",
            "iat": now,
            "exp": now + timedelta(hours=1),
        },
        None,
        algorithm="none",
    )
    assert client.get("/api/v1/auth/me", headers=bearer(unsigned)).status_code == 401


def test_admin_area_is_closed_to_visitors_and_clients(client, db_session_factory):
    assert client.get("/api/v1/admin/overview").status_code == 401
    token = register(client).json()["accessToken"]
    assert client.get("/api/v1/admin/overview", headers=bearer(token)).status_code == 403


def test_admin_can_open_the_overview(client, db_session_factory):
    make_admin(db_session_factory)
    token = login(client, email="boss@example.com").json()["accessToken"]
    response = client.get("/api/v1/admin/overview", headers=bearer(token))
    assert response.status_code == 200
    assert set(response.json()) == {
        "newContactMessages",
        "newQuoteRequests",
        "pendingBookings",
        "clients",
    }


def test_role_is_read_from_the_database_not_the_token(client, db_session_factory):
    make_admin(db_session_factory)
    token = login(client, email="boss@example.com").json()["accessToken"]
    with db_session_factory() as db:
        db.scalar(select(User)).role = "CLIENT"  # demoted after the token was issued
        db.commit()
    assert client.get("/api/v1/admin/overview", headers=bearer(token)).status_code == 403


# ---------- refresh and logout ----------


def test_refresh_rotates_the_cookie_and_returns_a_new_access_token(client):
    register(client)
    first = client.cookies.get("nw_refresh", path="/api/v1/auth")
    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    assert response.json()["accessToken"]
    assert client.cookies.get("nw_refresh", path="/api/v1/auth") != first


def test_refresh_without_a_cookie_is_unauthorized(client):
    assert client.post("/api/v1/auth/refresh").status_code == 401


def test_stolen_old_refresh_token_ends_the_whole_session(client, db_session_factory):
    register(client)
    stolen = client.cookies.get("nw_refresh", path="/api/v1/auth")
    assert client.post("/api/v1/auth/refresh").status_code == 200
    # Pretend the rotation happened a minute ago, outside the race window.
    with db_session_factory() as db:
        for row in db.scalars(select(RefreshToken).where(RefreshToken.rotated_at.is_not(None))):
            row.rotated_at = datetime.now(UTC) - timedelta(minutes=1)
        db.commit()
    client.cookies.clear()
    client.cookies.set("nw_refresh", stolen, path="/api/v1/auth")
    assert client.post("/api/v1/auth/refresh").status_code == 401
    with db_session_factory() as db:
        assert all(r.revoked_at is not None for r in db.scalars(select(RefreshToken)))


def test_two_tabs_refreshing_at_once_do_not_sign_you_out(client):
    register(client)
    old = client.cookies.get("nw_refresh", path="/api/v1/auth")
    assert client.post("/api/v1/auth/refresh").status_code == 200
    client.cookies.clear()
    client.cookies.set("nw_refresh", old, path="/api/v1/auth")
    assert client.post("/api/v1/auth/refresh").status_code == 200  # inside the grace window


def test_logout_ends_the_session_and_clears_cookies(client):
    register(client)
    token = client.cookies.get("nw_refresh", path="/api/v1/auth")
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 204
    assert any(
        'nw_refresh=""' in h or "nw_refresh=;" in h for h in response.headers.get_list("set-cookie")
    )
    client.cookies.set("nw_refresh", token, path="/api/v1/auth")
    assert client.post("/api/v1/auth/refresh").status_code == 401
    assert client.post("/api/v1/auth/logout").status_code == 204  # signing out twice is fine


def test_refresh_tokens_are_stored_only_as_hashes(client, db_session_factory):
    register(client)
    raw = client.cookies.get("nw_refresh", path="/api/v1/auth")
    with db_session_factory() as db:
        assert db.scalar(select(RefreshToken)).token_hash != raw


# ---------- same-origin protection ----------


def test_cookie_endpoints_refuse_foreign_origins(client):
    register(client)
    foreign = client.post("/api/v1/auth/refresh", headers={"Origin": "https://evil.example"})
    assert foreign.status_code == 403
    own = client.post("/api/v1/auth/refresh", headers={"Origin": "http://127.0.0.1:3000"})
    assert own.status_code == 200  # local development origin


# ---------- profile and password ----------


def test_profile_update(client):
    token = register(client).json()["accessToken"]
    response = client.patch(
        "/api/v1/auth/me", headers=bearer(token), json={"name": "Amina O.", "phone": "0712 345 678"}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Amina O."
    assert response.json()["phone"] == "0712 345 678"


def test_change_password_signs_out_other_devices(client, db_session_factory):
    token = register(client).json()["accessToken"]
    other_device = client.cookies.get("nw_refresh", path="/api/v1/auth")
    wrong = client.post(
        "/api/v1/auth/change-password",
        headers=bearer(token),
        json={"currentPassword": "not my password", "newPassword": "a brand new passphrase"},
    )
    assert wrong.status_code == 400
    assert wrong.json()["error"]["details"][0]["field"] == "currentPassword"

    ok = client.post(
        "/api/v1/auth/change-password",
        headers=bearer(token),
        json={"currentPassword": PASSWORD, "newPassword": "a brand new passphrase"},
    )
    assert ok.status_code == 200
    assert login(client, password=PASSWORD).status_code == 401
    assert login(client, password="a brand new passphrase").status_code == 200
    client.cookies.clear()
    client.cookies.set("nw_refresh", other_device, path="/api/v1/auth")
    assert client.post("/api/v1/auth/refresh").status_code == 401


# ---------- hashing ----------


def test_password_hashing_round_trip():
    hashed = hash_password("a long enough passphrase")
    assert verify_password("a long enough passphrase", hashed)
    assert not verify_password("another passphrase", hashed)
    assert not verify_password("anything", None)


def test_access_token_carries_role_and_expiry():
    token, ttl = create_access_token(__import__("uuid").uuid4(), "CLIENT", get_settings())
    claims = jwt.decode(token, options={"verify_signature": False})
    assert claims["role"] == "CLIENT"
    assert claims["exp"] - claims["iat"] == ttl == 15 * 60
