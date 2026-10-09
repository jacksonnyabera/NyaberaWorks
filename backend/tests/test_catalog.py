"""Public services/portfolio endpoints, the seed, and form validation against the catalogue."""

from sqlalchemy import select
from test_leads import CONTACT

from app.modules.catalog.models import Project, Service
from app.modules.catalog.seed import seed_catalog


def test_seed_loads_the_starter_content(db_session_factory):
    with db_session_factory() as db:
        assert len(db.scalars(select(Service)).all()) == 9
        assert len(db.scalars(select(Project)).all()) == 7


def test_seed_never_overwrites_admin_edits(db_session_factory):
    with db_session_factory() as db:
        row = db.scalar(select(Service).where(Service.slug == "python-automation"))
        row.title = "Edited by the owner"
        row.starting_price_kes = 12000
        db.commit()
        assert seed_catalog(db) == (0, 0)
        db.refresh(row)
        assert row.title == "Edited by the owner"
        assert row.starting_price_kes == 12000


def test_public_service_list_uses_camel_case_and_hides_internals(client):
    body = client.get("/api/v1/services").json()
    assert len(body) == 9
    first = body[0]
    assert first["slug"] == "custom-website-development"  # seed order
    assert "startingPriceKes" in first and "bestFor" in first
    assert "isActive" not in first and "id" not in first


def test_public_service_detail_and_404(client):
    assert client.get("/api/v1/services/python-automation").status_code == 200
    missing = client.get("/api/v1/services/nope")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "NOT_FOUND"


def test_inactive_service_is_hidden_and_rejected_by_forms(client, db_session_factory):
    with db_session_factory() as db:
        row = db.scalar(select(Service).where(Service.slug == "website-maintenance"))
        row.is_active = False
        db.commit()
    assert client.get("/api/v1/services/website-maintenance").status_code == 404
    assert "website-maintenance" not in [s["slug"] for s in client.get("/api/v1/services").json()]
    response = client.post("/api/v1/contact-messages", json=CONTACT)  # uses that service
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "service"


def test_forms_accept_other_and_reject_unknown_services(client):
    ok = client.post("/api/v1/contact-messages", json={**CONTACT, "service": "other"})
    assert ok.status_code == 201
    bad = client.post("/api/v1/contact-messages", json={**CONTACT, "service": "made-up"})
    assert bad.status_code == 422


def test_public_projects(client):
    body = client.get("/api/v1/projects").json()
    assert len(body) == 7
    nyumba = client.get("/api/v1/projects/nyumbadirect").json()
    assert nyumba["liveUrl"] == "https://nyumbadirect.co.ke"
    assert client.get("/api/v1/projects/nope").status_code == 404
