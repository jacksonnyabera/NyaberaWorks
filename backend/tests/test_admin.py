"""Admin lists and management. Everything needs an ADMIN account."""

import uuid

import pytest
from sqlalchemy import select
from test_auth import bearer, login, make_admin, register
from test_leads import CONTACT, QUOTE, booking_payload

from app.modules.users.models import RefreshToken, User


@pytest.fixture
def admin(client, db_session_factory):
    make_admin(db_session_factory)
    token = login(client, "boss@example.com").json()["accessToken"]
    return bearer(token)


def make_leads(client):
    client.post("/api/v1/contact-messages", json=CONTACT)
    client.post("/api/v1/quote-requests", json=QUOTE)
    client.post("/api/v1/bookings", json=booking_payload())


LIST_PATHS = ["contact-messages", "quote-requests", "bookings"]


@pytest.mark.parametrize("path", LIST_PATHS + ["clients", "services", "projects"])
def test_admin_endpoints_need_sign_in_and_the_admin_role(client, path):
    assert client.get(f"/api/v1/admin/{path}").status_code == 401
    token = register(client).json()["accessToken"]
    assert client.get(f"/api/v1/admin/{path}", headers=bearer(token)).status_code == 403


@pytest.mark.parametrize("path", LIST_PATHS)
def test_lead_lists_are_paged_and_hide_the_ip_hash(client, admin, path):
    make_leads(client)
    body = client.get(f"/api/v1/admin/{path}", headers=admin).json()
    assert body["total"] == 1 and body["page"] == 1 and body["pageSize"] == 20
    [item] = body["items"]
    assert item["reference"].startswith("NW-")
    assert "ipHash" not in item and "ip_hash" not in item
    assert "createdAt" in item and "adminNotes" in item


def test_booking_item_has_its_own_fields(client, admin):
    make_leads(client)
    [item] = client.get("/api/v1/admin/bookings", headers=admin).json()["items"]
    assert item["preferredTime"] == "Morning (9:00 to 12:00 EAT)"
    assert item["status"] == "requested"


def test_filter_search_and_paging(client, admin):
    for i in range(3):
        client.post(
            "/api/v1/contact-messages",
            json={**CONTACT, "name": f"Visitor {i}", "email": f"v{i}@example.com"},
            headers={"x-test": str(i)},
        )
    url = "/api/v1/admin/contact-messages"
    assert client.get(url, params={"pageSize": 2}, headers=admin).json()["total"] == 3
    page2 = client.get(url, params={"pageSize": 2, "page": 2}, headers=admin).json()
    assert len(page2["items"]) == 1
    found = client.get(url, params={"q": "V1@EXAMPLE"}, headers=admin).json()
    assert [i["email"] for i in found["items"]] == ["v1@example.com"]
    # % is searched literally, not as a wildcard
    assert client.get(url, params={"q": "%"}, headers=admin).json()["total"] == 0
    assert client.get(url, params={"status": "read"}, headers=admin).json()["total"] == 0
    assert client.get(url, params={"status": "bogus"}, headers=admin).status_code == 422
    assert client.get(url, params={"pageSize": 500}, headers=admin).status_code == 422


def test_update_status_and_notes(client, admin):
    make_leads(client)
    [item] = client.get("/api/v1/admin/quote-requests", headers=admin).json()["items"]
    url = f"/api/v1/admin/quote-requests/{item['id']}"
    response = client.patch(
        url, json={"status": "quoted", "adminNotes": "Sent KES 80,000 quote"}, headers=admin
    )
    assert response.status_code == 200
    assert response.json()["status"] == "quoted"
    assert response.json()["adminNotes"] == "Sent KES 80,000 quote"
    # notes can be cleared; status stays when omitted
    cleared = client.patch(url, json={"adminNotes": ""}, headers=admin).json()
    assert cleared["adminNotes"] is None and cleared["status"] == "quoted"


def test_update_rejects_wrong_status_for_that_kind(client, admin):
    make_leads(client)
    [item] = client.get("/api/v1/admin/bookings", headers=admin).json()["items"]
    url = f"/api/v1/admin/bookings/{item['id']}"
    assert client.patch(url, json={"status": "spam"}, headers=admin).status_code == 422
    assert client.patch(url, json={"status": "confirmed"}, headers=admin).status_code == 200
    missing = "/api/v1/admin/bookings/00000000-0000-0000-0000-000000000000"
    assert client.patch(missing, json={"status": "confirmed"}, headers=admin).status_code == 404


def test_overview_counts_change_after_status_update(client, admin):
    make_leads(client)
    assert client.get("/api/v1/admin/overview", headers=admin).json()["newContactMessages"] == 1
    [item] = client.get("/api/v1/admin/contact-messages", headers=admin).json()["items"]
    client.patch(
        f"/api/v1/admin/contact-messages/{item['id']}", json={"status": "read"}, headers=admin
    )
    assert client.get("/api/v1/admin/overview", headers=admin).json()["newContactMessages"] == 0


# ---------- clients ----------


def test_clients_list_excludes_admins_and_can_deactivate(client, admin, db_session_factory):
    register(client)
    body = client.get("/api/v1/admin/clients", headers=admin).json()
    assert body["total"] == 1
    [item] = body["items"]
    assert item["email"] == "amina@example.com" and "passwordHash" not in item
    url = f"/api/v1/admin/clients/{item['id']}"
    assert client.patch(url, json={"isActive": False}, headers=admin).json()["isActive"] is False
    # the client can no longer sign in, and their refresh tokens are ended
    assert login(client).status_code == 401
    with db_session_factory() as db:
        tokens = db.scalars(
            select(RefreshToken).where(RefreshToken.user_id == uuid.UUID(item["id"]))
        ).all()
        assert tokens and all(t.revoked_at for t in tokens)
    assert client.patch(url, json={"isActive": True}, headers=admin).json()["isActive"] is True
    assert login(client).status_code == 200


def test_admin_account_cannot_be_changed_through_clients(client, admin, db_session_factory):
    with db_session_factory() as db:
        admin_id = db.scalar(select(User.id).where(User.role == "ADMIN"))
    response = client.patch(
        f"/api/v1/admin/clients/{admin_id}", json={"isActive": False}, headers=admin
    )
    assert response.status_code == 404


def test_deactivated_client_token_stops_working(client, admin):
    token = register(client).json()["accessToken"]
    [item] = client.get("/api/v1/admin/clients", headers=admin).json()["items"]
    client.patch(f"/api/v1/admin/clients/{item['id']}", json={"isActive": False}, headers=admin)
    assert client.get("/api/v1/auth/me", headers=bearer(token)).status_code == 401


# ---------- services and projects ----------

NEW_SERVICE = {
    "slug": "iot-prototyping",
    "title": "IoT Prototyping",
    "summary": "Sensor prototypes.",
    "description": "Long description.",
    "problem": "A problem.",
    "deliverables": ["A prototype"],
    "technologies": ["Python"],
    "timeline": "2 weeks",
    "startingPriceKes": "",
    "bestFor": "Teams",
    "note": "",
    "isActive": True,
    "sortOrder": 5,
}


def test_admin_services_include_inactive_and_can_be_created(client, admin):
    created = client.post("/api/v1/admin/services", json=NEW_SERVICE, headers=admin)
    assert created.status_code == 201
    assert created.json()["startingPriceKes"] is None  # empty means "priced per project"
    assert created.json()["note"] is None
    assert client.get("/api/v1/services/iot-prototyping").status_code == 200
    assert client.get("/api/v1/services").json()[0]["slug"] == "iot-prototyping"  # sortOrder 5
    duplicate = client.post("/api/v1/admin/services", json=NEW_SERVICE, headers=admin)
    assert duplicate.status_code == 409


@pytest.mark.parametrize("slug", ["Bad Slug", "other", "x", "-a", "a--b"])
def test_service_slug_rules(client, admin, slug):
    response = client.post(
        "/api/v1/admin/services", json={**NEW_SERVICE, "slug": slug}, headers=admin
    )
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "slug"


def test_service_update_changes_price_and_can_hide(client, admin):
    base = {k: v for k, v in NEW_SERVICE.items() if k != "slug"}
    client.post("/api/v1/admin/services", json=NEW_SERVICE, headers=admin)
    url = "/api/v1/admin/services/iot-prototyping"
    updated = client.put(url, json={**base, "startingPriceKes": 25000}, headers=admin)
    assert updated.json()["startingPriceKes"] == 25000
    client.put(url, json={**base, "isActive": False}, headers=admin)
    assert client.get("/api/v1/services/iot-prototyping").status_code == 404
    listed = [s["slug"] for s in client.get("/api/v1/admin/services", headers=admin).json()]
    assert "iot-prototyping" in listed
    assert client.put("/api/v1/admin/services/nope", json=base, headers=admin).status_code == 404
    bad = client.put(url, json={**base, "deliverables": []}, headers=admin)
    assert bad.status_code == 422


def test_service_rejects_nul_characters_and_negative_prices(client, admin):
    bad = {**NEW_SERVICE, "title": "Bad\x00title", "startingPriceKes": -5}
    response = client.post("/api/v1/admin/services", json=bad, headers=admin)
    fields = {d["field"] for d in response.json()["error"]["details"]}
    assert {"title", "startingPriceKes"} <= fields


NEW_PROJECT = {
    "slug": "clinic-scheduler",
    "title": "Clinic Scheduler",
    "category": "Web platform",
    "status": "Prototype",
    "summary": "Appointment scheduling.",
    "problem": "P",
    "solution": "S",
    "features": ["Booking"],
    "technologies": [],
    "result": "A prototype.",
    "liveUrl": "",
    "featured": False,
    "motif": "board",
    "caveat": "",
    "isActive": True,
    "sortOrder": 1,
}


def test_project_create_update_and_validation(client, admin):
    created = client.post("/api/v1/admin/projects", json=NEW_PROJECT, headers=admin)
    assert created.status_code == 201
    assert created.json()["liveUrl"] is None
    base = {k: v for k, v in NEW_PROJECT.items() if k != "slug"}
    url = "/api/v1/admin/projects/clinic-scheduler"
    ok = client.put(url, json={**base, "liveUrl": "https://example.com"}, headers=admin)
    assert ok.json()["liveUrl"] == "https://example.com"
    assert (
        client.put(url, json={**base, "liveUrl": "javascript:alert(1)"}, headers=admin).status_code
        == 422
    )
    assert client.put(url, json={**base, "motif": "star"}, headers=admin).status_code == 422
    assert client.put(url, json={**base, "status": "Done"}, headers=admin).status_code == 422
    assert client.get("/api/v1/projects/clinic-scheduler").status_code == 200
    assert client.post("/api/v1/admin/projects", json=NEW_PROJECT, headers=admin).status_code == 409
