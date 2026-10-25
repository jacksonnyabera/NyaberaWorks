"""Two-way conversations, account linking and quotations."""

from datetime import timedelta

import pytest
from test_auth import bearer, login, make_admin, register
from test_leads import CONTACT, QUOTE, booking_payload

from app.modules.leads.schemas import today_eat

API = "/api/v1"


def client_headers(client, email="amina@example.com"):
    return bearer(register(client, email=email).json()["accessToken"])


@pytest.fixture
def admin(client, db_session_factory):
    make_admin(db_session_factory)
    return bearer(login(client, "boss@example.com").json()["accessToken"])


def submit(client, path, payload, headers=None):
    response = client.post(f"{API}/{path}", json=payload, headers=headers or {})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def future(days=7):
    return (today_eat() + timedelta(days=days)).isoformat()


def test_signed_in_submission_is_linked_and_guest_is_not(client, admin):
    me = client_headers(client)
    submit(client, "contact-messages", CONTACT, me)
    submit(client, "quote-requests", QUOTE)
    mine = client.get(f"{API}/me/requests", headers=me).json()
    assert [i["kind"] for i in mine] == ["contact"]
    rows = client.get(f"{API}/admin/quote-requests", headers=admin).json()["items"]
    assert rows[0]["userId"] is None


def test_bad_token_on_a_form_is_treated_as_a_guest(client):
    submit(client, "contact-messages", CONTACT, {"Authorization": "Bearer nonsense"})


def test_my_requests_need_sign_in(client):
    assert client.get(f"{API}/me/requests").status_code == 401
    assert client.get(f"{API}/me/unread").status_code == 401


def test_full_conversation_between_client_and_admin(client, admin):
    me = client_headers(client)
    lead = submit(client, "contact-messages", CONTACT, me)

    sent = client.post(
        f"{API}/admin/requests/contact/{lead}/messages", json={"body": "Hello!"}, headers=admin
    )
    assert sent.status_code == 201
    assert [m["authorRole"] for m in sent.json()["messages"]] == ["ADMIN"]
    row = client.get(f"{API}/admin/contact-messages", headers=admin).json()["items"][0]
    assert row["status"] == "replied"

    assert client.get(f"{API}/me/unread", headers=me).json() == {"unread": 1}
    assert client.get(f"{API}/me/requests", headers=me).json()[0]["unread"] == 1
    opened = client.get(f"{API}/me/requests/contact/{lead}", headers=me).json()
    assert opened["messages"][0]["body"] == "Hello!"
    assert opened["summary"][0][0] == "Message"
    assert client.get(f"{API}/me/unread", headers=me).json() == {"unread": 0}

    back = client.post(
        f"{API}/me/requests/contact/{lead}/messages",
        json={"body": "Thanks, Monday works."},
        headers=me,
    )
    assert back.status_code == 201
    assert [m["authorRole"] for m in back.json()["messages"]] == ["ADMIN", "CLIENT"]
    thread = client.get(f"{API}/admin/requests/contact/{lead}/thread", headers=admin).json()
    assert thread["messages"][1]["read"] is True  # opening the thread marks it read
    assert (
        client.get(f"{API}/admin/contact-messages", headers=admin).json()["items"][0]["status"]
        == "new"
    )


def test_other_clients_and_guests_cannot_see_a_request(client):
    owner = client_headers(client)
    lead = submit(client, "bookings", booking_payload(), owner)
    other = client_headers(client, "other@example.com")
    for headers in (other, {}):
        path = f"{API}/me/requests/booking/{lead}"
        assert client.get(path, headers=headers).status_code in (401, 404)
        assert client.post(
            f"{path}/messages", json={"body": "hi"}, headers=headers
        ).status_code in (401, 404)
    assert client.get(f"{API}/me/requests", headers=other).json() == []


def test_clients_cannot_use_admin_endpoints(client):
    me = client_headers(client)
    lead = submit(client, "contact-messages", CONTACT, me)
    assert client.get(f"{API}/admin/requests/contact/{lead}/thread", headers=me).status_code == 403
    assert (
        client.post(
            f"{API}/admin/requests/contact/{lead}/messages", json={"body": "x"}, headers=me
        ).status_code
        == 403
    )


def test_unknown_kind_and_id_are_404(client):
    me = client_headers(client)
    assert (
        client.get(
            f"{API}/me/requests/nonsense/{'0' * 8}-0000-0000-0000-{'0' * 12}", headers=me
        ).status_code
        == 404
    )
    assert client.get(f"{API}/me/requests/contact/not-a-uuid", headers=me).status_code == 422


def test_replying_to_a_guest_request_explains_why_it_cannot(client, admin):
    lead = submit(client, "contact-messages", CONTACT)
    response = client.post(
        f"{API}/admin/requests/contact/{lead}/messages", json={"body": "Hi"}, headers=admin
    )
    assert response.status_code == 409
    assert "account" in response.json()["error"]["message"]
    thread = client.get(f"{API}/admin/requests/contact/{lead}/thread", headers=admin).json()
    assert thread["canReply"] is False


@pytest.mark.parametrize("body", ["", "   ", "x" * 4001, "bad\x00char"])
def test_message_body_is_validated(client, body):
    me = client_headers(client)
    lead = submit(client, "contact-messages", CONTACT, me)
    response = client.post(
        f"{API}/me/requests/contact/{lead}/messages", json={"body": body}, headers=me
    )
    assert response.status_code == 422


def test_client_message_rate_limit(client):
    me = client_headers(client)
    lead = submit(client, "contact-messages", CONTACT, me)
    codes = [
        client.post(
            f"{API}/me/requests/contact/{lead}/messages", json={"body": f"m{i}"}, headers=me
        ).status_code
        for i in range(21)
    ]
    assert codes[:20] == [201] * 20 and codes[20] == 429


def quote_lead(client, admin):
    me = client_headers(client)
    return me, submit(client, "quote-requests", QUOTE, me)


def send_quotation(client, admin, lead, **overrides):
    body = {
        "amountKes": 85000,
        "details": "Booking system, 3 pages, hosting setup.",
        "validUntil": future(),
        **overrides,
    }
    return client.post(f"{API}/admin/quote-requests/{lead}/quotations", json=body, headers=admin)


def test_quotation_accept_flow(client, admin):
    me, lead = quote_lead(client, admin)
    sent = send_quotation(client, admin, lead)
    assert sent.status_code == 201
    quotation = sent.json()["quotations"][0]
    assert (
        quotation["status"] == "sent"
        and quotation["amountKes"] == 85000
        and quotation["expired"] is False
    )
    assert (
        client.get(f"{API}/admin/quote-requests", headers=admin).json()["items"][0]["status"]
        == "quoted"
    )
    assert client.get(f"{API}/me/requests", headers=me).json()[0]["openQuotation"] is True

    done = client.post(f"{API}/me/quotations/{quotation['id']}/accept", headers=me)
    assert done.status_code == 200
    assert done.json()["quotations"][0]["status"] == "accepted"
    assert done.json()["status"] == "accepted"
    again = client.post(f"{API}/me/quotations/{quotation['id']}/decline", headers=me)
    assert again.status_code == 409


def test_quotation_decline_and_new_offer_replaces_old(client, admin):
    me, lead = quote_lead(client, admin)
    first = send_quotation(client, admin, lead).json()["quotations"][0]
    second = send_quotation(client, admin, lead, amountKes=70000).json()["quotations"]
    assert [q["status"] for q in second] == ["withdrawn", "sent"]
    assert client.post(f"{API}/me/quotations/{first['id']}/accept", headers=me).status_code == 409
    declined = client.post(f"{API}/me/quotations/{second[1]['id']}/decline", headers=me)
    assert declined.json()["status"] == "declined"
    assert send_quotation(client, admin, lead).status_code == 409  # closed request


def test_withdraw_returns_request_to_reviewing(client, admin):
    me, lead = quote_lead(client, admin)
    q = send_quotation(client, admin, lead).json()["quotations"][0]
    out = client.post(f"{API}/admin/quotations/{q['id']}/withdraw", headers=admin)
    assert out.json()["quotations"][0]["status"] == "withdrawn"
    assert out.json()["status"] == "reviewing"
    assert (
        client.post(f"{API}/admin/quotations/{q['id']}/withdraw", headers=admin).status_code == 409
    )


def test_only_the_owner_can_answer_a_quotation(client, admin):
    me, lead = quote_lead(client, admin)
    q = send_quotation(client, admin, lead).json()["quotations"][0]
    other = client_headers(client, "other@example.com")
    assert client.post(f"{API}/me/quotations/{q['id']}/accept", headers=other).status_code == 404
    assert client.post(f"{API}/me/quotations/{q['id']}/accept").status_code == 401
    assert client.post(f"{API}/me/quotations/{q['id']}/maybe", headers=me).status_code == 404
    assert (
        client.post(
            f"{API}/admin/quote-requests/{lead}/quotations", json={}, headers=me
        ).status_code
        == 403
    )


def test_expired_quotation_cannot_be_accepted(client, admin, db_session_factory):
    from sqlalchemy import select

    from app.modules.conversations.models import Quotation

    me, lead = quote_lead(client, admin)
    q = send_quotation(client, admin, lead).json()["quotations"][0]
    with db_session_factory() as db:
        row = db.scalar(select(Quotation))
        row.valid_until = today_eat() - timedelta(days=1)
        db.commit()
    shown = client.get(f"{API}/me/requests/quote/{lead}", headers=me).json()["quotations"][0]
    assert shown["expired"] is True
    assert client.get(f"{API}/me/requests", headers=me).json()[0]["openQuotation"] is False
    assert client.post(f"{API}/me/quotations/{q['id']}/accept", headers=me).status_code == 409


@pytest.mark.parametrize(
    "overrides",
    [
        {"amountKes": 0},
        {"amountKes": 50},
        {"amountKes": 10**9},
        {"details": "short"},
        {"validUntil": (today_eat() - timedelta(days=1)).isoformat()},
        {"validUntil": "tomorrow"},
    ],
)
def test_quotation_input_is_validated(client, admin, overrides):
    me, lead = quote_lead(client, admin)
    assert send_quotation(client, admin, lead, **overrides).status_code == 422


def test_quotation_needs_a_linked_account(client, admin):
    lead = submit(client, "quote-requests", QUOTE)
    assert send_quotation(client, admin, lead).status_code == 409


def test_deleting_the_account_keeps_the_request(client, admin, db_session_factory):
    from sqlalchemy import select, text

    from app.modules.leads.models import ContactMessage
    from app.modules.users.models import User

    me = client_headers(client)
    submit(client, "contact-messages", CONTACT, me)
    with db_session_factory() as db:
        db.execute(text("PRAGMA foreign_keys=ON"))
        user = db.scalar(select(User).where(User.email == "amina@example.com"))
        db.delete(user)
        db.commit()
        assert db.scalar(select(ContactMessage)).user_id is None
