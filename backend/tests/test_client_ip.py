"""Which address is used for spam limits, and when a forwarded one is trusted."""

import pytest
from sqlalchemy import select
from test_leads import CONTACT

from app.core.config import get_settings
from app.modules.leads.models import ContactMessage
from app.modules.leads.service import hash_ip

SECRET = "s" * 40


def stored_hash(db_session_factory):
    with db_session_factory() as db:
        return db.scalar(select(ContactMessage.ip_hash))


@pytest.fixture
def with_secret(monkeypatch):
    monkeypatch.setenv("PROXY_SHARED_SECRET", SECRET)
    get_settings.cache_clear()


def test_forwarded_ip_is_ignored_without_a_configured_secret(client, db_session_factory):
    client.post(
        "/api/v1/contact-messages",
        json=CONTACT,
        headers={"x-proxy-secret": SECRET, "x-client-ip": "203.0.113.7"},
    )
    assert stored_hash(db_session_factory) == hash_ip("testclient", get_settings())


def test_forwarded_ip_is_used_when_the_secret_matches(client, db_session_factory, with_secret):
    client.post(
        "/api/v1/contact-messages",
        json=CONTACT,
        headers={"x-proxy-secret": SECRET, "x-client-ip": "203.0.113.7"},
    )
    assert stored_hash(db_session_factory) == hash_ip("203.0.113.7", get_settings())


@pytest.mark.parametrize(
    "headers",
    [
        {"x-client-ip": "203.0.113.7"},  # no secret
        {"x-proxy-secret": "wrong" * 10, "x-client-ip": "203.0.113.7"},  # wrong secret
        {"x-proxy-secret": SECRET, "x-client-ip": "not-an-ip"},  # trusted but unusable
    ],
)
def test_untrusted_or_unusable_headers_fall_back_to_the_connection(
    client, db_session_factory, with_secret, headers
):
    client.post("/api/v1/contact-messages", json=CONTACT, headers=headers)
    assert stored_hash(db_session_factory) == hash_ip("testclient", get_settings())


def test_spoofing_cannot_dodge_the_rate_limit(client, with_secret):
    for i in range(5):
        r = client.post(
            "/api/v1/contact-messages",
            json=CONTACT,
            headers={"x-client-ip": f"198.51.100.{i}"},  # no secret, so all count as one visitor
        )
        assert r.status_code == 201
    blocked = client.post(
        "/api/v1/contact-messages", json=CONTACT, headers={"x-client-ip": "198.51.100.99"}
    )
    assert blocked.status_code == 429


def test_short_proxy_secret_is_rejected(monkeypatch):
    from app.core.config import Settings

    with pytest.raises(ValueError, match="PROXY_SHARED_SECRET"):
        Settings(proxy_shared_secret="short", _env_file=None)
