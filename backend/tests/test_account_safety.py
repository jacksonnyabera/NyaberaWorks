"""Password reset and two-factor sign-in."""

import re
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from test_auth import PASSWORD, bearer, login, make_admin, register

from app.core import totp
from app.core.config import get_settings
from app.modules.users.models import PasswordResetToken, RefreshToken, User

API = "/api/v1/auth"
RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"  # RFC 6238 test secret


# ---------- the one-time code maths ----------


def test_totp_matches_the_rfc_6238_test_vector():
    assert totp.verify(RFC_SECRET, "287082", now=59) == 1


def test_totp_rejects_wrong_old_and_replayed_codes():
    assert totp.verify(RFC_SECRET, "000000", now=59) is None
    assert totp.verify(RFC_SECRET, "287082", now=59 + 120) is None  # too old
    assert totp.verify(RFC_SECRET, "287082", last_step=1, now=59) is None  # already used
    assert totp.verify(RFC_SECRET, "28708", now=59) is None
    assert totp.verify(RFC_SECRET, "abcdef", now=59) is None


def test_recovery_codes_have_the_expected_shape():
    codes = totp.new_recovery_codes()
    assert len(codes) == len(set(codes)) == 8
    assert all(re.fullmatch(r"[a-z2-9]{5}-[a-z2-9]{5}", c) for c in codes)


# ---------- password reset ----------


@pytest.fixture
def sent(monkeypatch):
    """Capture the reset email instead of sending it."""
    mails = []
    import app.modules.auth.router as router_module

    monkeypatch.setattr(router_module, "send_email", lambda settings, **kw: mails.append(kw))
    monkeypatch.setenv("EMAIL_SEND_INLINE", "true")
    get_settings.cache_clear()
    return mails


def token_from(mail):
    return re.search(r"#token=([\w-]+)", mail["body"]).group(1)


def test_reset_flow_changes_the_password_and_signs_out_other_devices(client, sent):
    register(client)
    other_device = client.cookies.get("nw_refresh")
    assert other_device
    response = client.post(f"{API}/forgot-password", json={"email": "Amina@Example.com"})
    assert response.status_code == 202
    [mail] = sent
    assert mail["to"] == "amina@example.com"
    assert "/reset-password#token=" in mail["body"]
    token = token_from(mail)

    done = client.post(
        f"{API}/reset-password", json={"token": token, "newPassword": "a brand new phrase 77"}
    )
    assert done.status_code == 204
    assert login(client, password="a brand new phrase 77").status_code == 200
    assert login(client, password=PASSWORD).status_code == 401


def test_reset_link_works_once_only(client, sent):
    register(client)
    client.post(f"{API}/forgot-password", json={"email": "amina@example.com"})
    token = token_from(sent[0])
    body = {"token": token, "newPassword": "a brand new phrase 77"}
    assert client.post(f"{API}/reset-password", json=body).status_code == 204
    again = client.post(
        f"{API}/reset-password", json={**body, "newPassword": "another new phrase 88"}
    )
    assert again.status_code == 400
    assert again.json()["error"]["code"] == "INVALID_RESET_LINK"


def test_expired_and_unknown_links_are_refused(client, sent, db_session_factory):
    register(client)
    client.post(f"{API}/forgot-password", json={"email": "amina@example.com"})
    token = token_from(sent[0])
    with db_session_factory() as db:
        row = db.scalar(select(PasswordResetToken))
        row.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        db.commit()
    body = {"token": token, "newPassword": "a brand new phrase 77"}
    assert client.post(f"{API}/reset-password", json=body).status_code == 400
    bad = {"token": "x" * 40, "newPassword": "a brand new phrase 77"}
    assert client.post(f"{API}/reset-password", json=bad).status_code == 400


def test_weak_new_password_is_refused_and_link_stays_usable(client, sent):
    register(client)
    client.post(f"{API}/forgot-password", json={"email": "amina@example.com"})
    token = token_from(sent[0])
    weak = client.post(f"{API}/reset-password", json={"token": token, "newPassword": "short"})
    assert weak.status_code == 422
    ok = client.post(
        f"{API}/reset-password", json={"token": token, "newPassword": "a brand new phrase 77"}
    )
    assert ok.status_code == 204


def test_unknown_email_gets_the_same_answer_and_no_mail(client, sent):
    known = client.post(f"{API}/forgot-password", json={"email": "nobody@example.com"})
    assert known.status_code == 202
    assert sent == []
    register(client)
    real = client.post(f"{API}/forgot-password", json={"email": "amina@example.com"})
    assert real.status_code == 202 and real.json() == known.json()


def test_reset_requests_are_limited_per_visitor_and_per_account(client, sent):
    register(client)
    codes = [
        client.post(f"{API}/forgot-password", json={"email": "amina@example.com"}).status_code
        for _ in range(6)
    ]
    assert codes[:5] == [202] * 5 and codes[5] == 429
    assert len(sent) == 3  # at most 3 links per account per hour


def test_reset_clears_a_lockout_and_revokes_sessions(client, sent, db_session_factory):
    register(client)
    for _ in range(5):
        login(client, password="wrong password here")
    assert login(client).status_code == 429  # locked
    client.post(f"{API}/forgot-password", json={"email": "amina@example.com"})
    token = token_from(sent[0])
    client.post(
        f"{API}/reset-password", json={"token": token, "newPassword": "a brand new phrase 77"}
    )
    with db_session_factory() as db:
        assert all(r.revoked_at for r in db.scalars(select(RefreshToken)))
    assert login(client, password="a brand new phrase 77").status_code == 200


# ---------- two-factor sign-in ----------


def admin_headers(client, db_session_factory):
    make_admin(db_session_factory)
    return bearer(login(client, "boss@example.com").json()["accessToken"])


def current_code(db_session_factory, offset=0):
    with db_session_factory() as db:
        secret = db.scalar(select(User.totp_secret).where(User.email == "boss@example.com"))
    step = int(datetime.now(UTC).timestamp() // 30) + offset
    return totp._code_at(secret, step)


def enable(client, db_session_factory, headers):
    setup = client.post(f"{API}/2fa/setup", headers=headers)
    assert setup.status_code == 200
    assert setup.json()["otpauthUri"].startswith("otpauth://totp/")
    done = client.post(
        f"{API}/2fa/enable", json={"code": current_code(db_session_factory)}, headers=headers
    )
    assert done.status_code == 200
    return done.json()["recoveryCodes"]


def test_two_factor_is_for_admins_only(client):
    token = register(client).json()["accessToken"]
    assert client.post(f"{API}/2fa/setup", headers=bearer(token)).status_code == 403
    assert client.post(f"{API}/2fa/setup").status_code == 401


def test_enable_needs_a_correct_code(client, db_session_factory):
    headers = admin_headers(client, db_session_factory)
    client.post(f"{API}/2fa/setup", headers=headers)
    wrong = client.post(f"{API}/2fa/enable", json={"code": "000000"}, headers=headers)
    assert wrong.status_code == 400
    me = client.get(f"{API}/me", headers=headers).json()
    assert me["totpEnabled"] is False


def test_login_then_requires_the_second_step(client, db_session_factory):
    headers = admin_headers(client, db_session_factory)
    enable(client, db_session_factory, headers)
    fresh = login(client, "boss@example.com")
    assert fresh.status_code == 401
    assert fresh.json()["error"]["code"] == "TOTP_REQUIRED"
    assert "accessToken" not in fresh.text

    bad = client.post(
        f"{API}/login",
        json={"email": "boss@example.com", "password": PASSWORD, "totpCode": "123456"},
    )
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "INVALID_CODE"

    good = client.post(
        f"{API}/login",
        json={
            "email": "boss@example.com",
            "password": PASSWORD,
            "totpCode": current_code(db_session_factory, 1),
        },
    )
    assert good.status_code == 200
    assert good.json()["user"]["totpEnabled"] is True


def test_a_used_code_cannot_be_used_twice(client, db_session_factory):
    headers = admin_headers(client, db_session_factory)
    enable(client, db_session_factory, headers)
    code = current_code(db_session_factory, 1)
    body = {"email": "boss@example.com", "password": PASSWORD, "totpCode": code}
    assert client.post(f"{API}/login", json=body).status_code == 200
    assert client.post(f"{API}/login", json=body).status_code == 401


def test_recovery_code_works_once(client, db_session_factory):
    headers = admin_headers(client, db_session_factory)
    codes = enable(client, db_session_factory, headers)
    body = {"email": "boss@example.com", "password": PASSWORD, "totpCode": codes[0].upper()}
    assert client.post(f"{API}/login", json=body).status_code == 200
    assert client.post(f"{API}/login", json=body).status_code == 401
    other = {**body, "totpCode": codes[1]}
    assert client.post(f"{API}/login", json=other).status_code == 200


def test_wrong_codes_count_toward_the_lockout(client, db_session_factory):
    headers = admin_headers(client, db_session_factory)
    enable(client, db_session_factory, headers)
    body = {"email": "boss@example.com", "password": PASSWORD, "totpCode": "123456"}
    results = [client.post(f"{API}/login", json=body).status_code for _ in range(6)]
    assert results[:5] == [401] * 5 and results[5] == 429


def test_wrong_password_never_reveals_two_factor(client, db_session_factory):
    headers = admin_headers(client, db_session_factory)
    enable(client, db_session_factory, headers)
    response = login(client, "boss@example.com", "not the password at all")
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_disable_needs_password_and_code(client, db_session_factory):
    headers = admin_headers(client, db_session_factory)
    enable(client, db_session_factory, headers)
    code = current_code(db_session_factory, 1)
    bad = client.post(
        f"{API}/2fa/disable", json={"password": "wrong password!", "code": code}, headers=headers
    )
    assert bad.status_code == 400
    ok = client.post(
        f"{API}/2fa/disable", json={"password": PASSWORD, "code": code}, headers=headers
    )
    assert ok.status_code == 204
    assert login(client, "boss@example.com").status_code == 200


def test_secret_is_never_returned_after_setup(client, db_session_factory):
    headers = admin_headers(client, db_session_factory)
    enable(client, db_session_factory, headers)
    me = client.get(f"{API}/me", headers=headers)
    assert "secret" not in me.text.lower() and "recovery" not in me.text.lower()
