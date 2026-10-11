"""Email notifications for new form submissions."""

import logging

import pytest
from test_leads import CONTACT, QUOTE, booking_payload

from app.core import email as email_module
from app.core.config import Settings, get_settings
from app.core.email import send_email


class FakeSMTP:
    sent: list = []
    logins: list = []
    started_tls = False
    fail = False

    def __init__(self, host, port, timeout=None):
        if FakeSMTP.fail:
            raise OSError("connection refused")
        self.host, self.port = host, port

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def starttls(self, context=None):
        FakeSMTP.started_tls = True

    def login(self, user, password):
        FakeSMTP.logins.append((user, password))

    def send_message(self, message):
        FakeSMTP.sent.append(message)


@pytest.fixture
def smtp(monkeypatch):
    FakeSMTP.sent, FakeSMTP.logins, FakeSMTP.started_tls, FakeSMTP.fail = [], [], False, False
    monkeypatch.setattr(email_module.smtplib, "SMTP", FakeSMTP)
    for name, value in {
        "EMAIL_BACKEND": "smtp",
        "SMTP_HOST": "smtp.example.com",
        "SMTP_USERNAME": "mailer",
        "SMTP_PASSWORD": "s3cret-pass",
        "EMAIL_FROM": "site@example.com",
        "ADMIN_NOTIFY_EMAIL": "owner@example.com",
    }.items():
        monkeypatch.setenv(name, value)
    get_settings.cache_clear()
    return FakeSMTP


def test_contact_sends_owner_an_email_with_reply_to(client, smtp):
    response = client.post("/api/v1/contact-messages", json=CONTACT)
    reference = response.json()["reference"]
    [message] = smtp.sent
    assert message["To"] == "owner@example.com"
    assert message["From"] == "site@example.com"
    assert message["Reply-To"] == "amina@example.com"
    assert message["Subject"] == f"New message {reference}"
    body = message.get_content()
    assert "I need help keeping my website updated." in body and reference in body
    assert smtp.started_tls and smtp.logins == [("mailer", "s3cret-pass")]


def test_quote_and_booking_notifications(client, smtp):
    client.post("/api/v1/quote-requests", json=QUOTE)
    client.post("/api/v1/bookings", json=booking_payload())
    subjects = [m["Subject"] for m in smtp.sent]
    assert subjects[0].startswith("New quote request NW-Q-")
    assert subjects[1].startswith("New booking request NW-B-")
    assert "KES 50,000 to 150,000" in smtp.sent[0].get_content()
    assert "Morning (9:00 to 12:00 EAT)" in smtp.sent[1].get_content()


def test_mail_failure_does_not_break_the_form(client, smtp, caplog):
    smtp.fail = True
    with caplog.at_level(logging.ERROR):
        response = client.post("/api/v1/contact-messages", json=CONTACT)
    assert response.status_code == 201
    assert "email failed" in caplog.text
    assert "s3cret-pass" not in caplog.text


def test_honeypot_and_rejected_submissions_send_nothing(client, smtp):
    client.post("/api/v1/contact-messages", json={**CONTACT, "website": "http://spam.example"})
    client.post("/api/v1/contact-messages", json={**CONTACT, "service": "made-up"})
    assert smtp.sent == []


def test_console_backend_sends_nothing(client, monkeypatch):
    called = []
    monkeypatch.setattr(email_module.smtplib, "SMTP", lambda *a, **k: called.append(1))
    assert client.post("/api/v1/contact-messages", json=CONTACT).status_code == 201
    assert called == []


def test_header_injection_is_not_possible(smtp):
    settings = get_settings()
    ok = send_email(settings, to="owner@example.com", subject="Hi\r\nBcc: x@evil.test", body="b")
    assert ok is False  # EmailMessage refuses newlines in headers; the failure is contained
    assert smtp.sent == []


def test_smtp_needs_its_settings():
    with pytest.raises(ValueError, match="SMTP_HOST"):
        Settings(email_backend="smtp", _env_file=None)


def test_inline_mode_sends_before_the_reply(client, smtp, monkeypatch):
    monkeypatch.setenv("EMAIL_SEND_INLINE", "true")
    get_settings.cache_clear()
    order = []
    original = FakeSMTP.send_message
    FakeSMTP.send_message = lambda self, message: (order.append("sent"), original(self, message))[1]
    try:
        response = client.post("/api/v1/contact-messages", json=CONTACT)
    finally:
        FakeSMTP.send_message = original
    assert response.status_code == 201 and order == ["sent"]
