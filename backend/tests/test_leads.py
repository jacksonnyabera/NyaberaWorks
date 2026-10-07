"""The contact, quote and booking endpoints."""

from datetime import timedelta

import pytest
from sqlalchemy import select

from app.modules.leads.models import Booking, ContactMessage, QuoteRequest
from app.modules.leads.schemas import today_eat

CONTACT = {
    "name": "Amina Otieno",
    "email": "Amina@Example.com",
    "phone": "",
    "service": "website-maintenance",
    "message": "I need help keeping my website updated.",
    "website": "",
}
QUOTE = {
    "name": "Amina Otieno",
    "email": "amina@example.com",
    "phone": "0712 345 678",
    "service": "business-web-applications",
    "budget": "KES 50,000 to 150,000",
    "deadline": "",
    "description": "A booking system for my small guesthouse in Kisumu.",
    "website": "",
}


def booking_payload(**overrides):
    payload = {
        "name": "Amina Otieno",
        "email": "amina@example.com",
        "phone": "0712 345 678",
        "service": "python-automation",
        "preferredDate": (today_eat() + timedelta(days=3)).isoformat(),
        "preferredTime": "Morning (9:00 to 12:00 EAT)",
        "requirements": "Automate our weekly sales report.",
        "website": "",
    }
    payload.update(overrides)
    return payload


def rows(db_session_factory, model):
    with db_session_factory() as session:
        return session.scalars(select(model)).all()


def test_contact_is_saved_and_returns_a_reference(client, db_session_factory):
    response = client.post("/api/v1/contact-messages", json=CONTACT)
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "received"
    assert body["reference"].startswith("NW-C-")
    [row] = rows(db_session_factory, ContactMessage)
    assert row.email == "amina@example.com"  # lower-cased
    assert row.phone is None  # empty phone becomes "no phone"
    assert row.status == "new"
    assert row.ip_hash and "testclient" not in row.ip_hash


def test_quote_without_deadline_is_saved(client, db_session_factory):
    response = client.post("/api/v1/quote-requests", json=QUOTE)
    assert response.status_code == 201
    assert response.json()["reference"].startswith("NW-Q-")
    [row] = rows(db_session_factory, QuoteRequest)
    assert row.deadline is None
    assert row.budget == "KES 50,000 to 150,000"


def test_booking_accepts_camel_case_fields(client, db_session_factory):
    response = client.post("/api/v1/bookings", json=booking_payload())
    assert response.status_code == 201
    assert response.json()["reference"].startswith("NW-B-")
    [row] = rows(db_session_factory, Booking)
    assert row.preferred_time == "Morning (9:00 to 12:00 EAT)"
    assert row.status == "requested"


def test_validation_errors_name_the_form_field_without_echoing_input(client):
    response = client.post(
        "/api/v1/contact-messages", json={**CONTACT, "email": "not-an-email", "message": "hi"}
    )
    assert response.status_code == 422
    error = response.json()["error"]
    fields = {d["field"] for d in error["details"]}
    assert {"email", "message"} <= fields
    assert "not-an-email" not in response.text


def test_booking_errors_use_the_camel_case_field_names(client):
    response = client.post(
        "/api/v1/bookings",
        json=booking_payload(preferredDate="2001-01-01", phone=""),
    )
    assert response.status_code == 422
    fields = {d["field"] for d in response.json()["error"]["details"]}
    assert {"preferredDate", "phone"} <= fields


def test_quote_rejects_a_past_deadline_and_unknown_budget(client):
    response = client.post(
        "/api/v1/quote-requests", json={**QUOTE, "deadline": "2001-01-01", "budget": "a lot"}
    )
    assert response.status_code == 422
    fields = {d["field"] for d in response.json()["error"]["details"]}
    assert {"deadline", "budget"} <= fields


def test_unknown_service_and_extra_fields_are_rejected(client):
    assert (
        client.post("/api/v1/contact-messages", json={**CONTACT, "service": "hacking"}).status_code
        == 422
    )
    assert (
        client.post("/api/v1/contact-messages", json={**CONTACT, "role": "admin"}).status_code
        == 422
    )


def test_nul_characters_are_rejected_instead_of_crashing_the_database(client):
    response = client.post(
        "/api/v1/contact-messages", json={**CONTACT, "message": "hello\u0000 there, please help"}
    )
    assert response.status_code == 422


def test_honeypot_returns_success_but_saves_nothing(client, db_session_factory):
    response = client.post(
        "/api/v1/contact-messages", json={**CONTACT, "website": "http://spam.test"}
    )
    assert response.status_code == 201
    assert rows(db_session_factory, ContactMessage) == []


def test_rate_limit_stops_a_flood_across_all_forms(client):
    for _ in range(5):
        assert client.post("/api/v1/contact-messages", json=CONTACT).status_code == 201
    blocked = client.post("/api/v1/quote-requests", json=QUOTE)
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "TOO_MANY_REQUESTS"


@pytest.mark.parametrize(
    "path", ["/api/v1/contact-messages", "/api/v1/quote-requests", "/api/v1/bookings"]
)
def test_get_is_not_allowed_on_form_endpoints(client, path):
    assert client.get(path).status_code == 405


def test_readiness_reports_database_down_when_not_configured(client):
    response = client.get("/api/health/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable", "database": "down"}
