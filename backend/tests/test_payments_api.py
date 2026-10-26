from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.db import Base, get_db
from app.main import create_app
from app.modules.auth.deps import require_admin


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)

    def override_db():
        with TestingSession() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[require_admin] = lambda: SimpleNamespace(id=uuid4())

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def payload(key="payment-test-key-0001"):
    return {
        "amount_minor": 150000,
        "currency": "KES",
        "provider_method": "manual",
        "idempotency_key": key,
    }


def test_create_payment_intent(client):
    response = client.post(
        "/api/v1/payments/admin/intents",
        json=payload(),
        headers={"Idempotency-Key": "payment-test-key-0001"},
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["amount_minor"] == 150000
    assert data["currency"] == "KES"
    assert data["status"] == "CREATED"
    assert data["kind"] == "PAYMENT"
    assert data["id"]


def test_idempotent_retry_returns_same_payment(client):
    headers = {"Idempotency-Key": "payment-test-key-0002"}
    first = client.post(
        "/api/v1/payments/admin/intents",
        json=payload("payment-test-key-0002"),
        headers=headers,
    )
    second = client.post(
        "/api/v1/payments/admin/intents",
        json=payload("payment-test-key-0002"),
        headers=headers,
    )
    assert first.status_code == 201, first.text
    assert second.status_code == 201, second.text
    assert first.json()["id"] == second.json()["id"]


def test_idempotency_key_cannot_be_reused_for_different_amount(client):
    headers = {"Idempotency-Key": "payment-test-key-0003"}
    first = client.post(
        "/api/v1/payments/admin/intents",
        json=payload("payment-test-key-0003"),
        headers=headers,
    )
    changed = payload("payment-test-key-0003")
    changed["amount_minor"] = 999999
    second = client.post(
        "/api/v1/payments/admin/intents",
        json=changed,
        headers=headers,
    )
    assert first.status_code == 201, first.text
    assert second.status_code == 409, second.text


def test_admin_can_retrieve_payment_status(client):
    created = client.post(
        "/api/v1/payments/admin/intents",
        json=payload("payment-test-key-0004"),
        headers={"Idempotency-Key": "payment-test-key-0004"},
    )
    assert created.status_code == 201, created.text

    payment_id = created.json()["id"]
    response = client.get(f"/api/v1/payments/admin/{payment_id}")
    assert response.status_code == 200, response.text
    assert response.json()["id"] == payment_id
    assert response.json()["status"] == "CREATED"


def test_missing_payment_returns_404(client):
    response = client.get(f"/api/v1/payments/admin/{uuid4()}")
    assert response.status_code == 404


def _create_mpesa_intent(client, key="payment-stk-test-0001"):
    data = payload(key)
    data["provider_method"] = "mpesa"
    response = client.post(
        "/api/v1/payments/admin/intents",
        json=data,
        headers={"Idempotency-Key": key},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_stk_push_and_valid_callback(client, monkeypatch):
    import app.modules.payments.router as payments_router_module

    def fake_stk_push(**kwargs):
        assert kwargs["amount_kes"] == 1500
        return {
            "checkout_request_id": "ws_CO_test_0001",
            "merchant_request_id": "merchant_test_0001",
            "customer_message": "Accepted",
        }

    monkeypatch.setattr(payments_router_module, "initiate_stk_push", fake_stk_push)

    created = _create_mpesa_intent(client)
    started = client.post(
        f"/api/v1/payments/admin/{created['id']}/stk-push",
        json={"phone_number": "0712345678"},
    )
    assert started.status_code == 200, started.text
    assert started.json()["status"] == "PENDING"

    callback = {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": "merchant_test_0001",
                "CheckoutRequestID": "ws_CO_test_0001",
                "ResultCode": 0,
                "ResultDesc": "Success",
                "CallbackMetadata": {
                    "Item": [
                        {"Name": "Amount", "Value": 1500},
                        {"Name": "MpesaReceiptNumber", "Value": "TESTRCPT001"},
                        {"Name": "TransactionDate", "Value": 20261023120000},
                        {"Name": "PhoneNumber", "Value": 254712345678},
                    ]
                },
            }
        }
    }
    received = client.post("/api/v1/payments/callbacks/stk", json=callback)
    assert received.status_code == 200, received.text

    status_response = client.get(f"/api/v1/payments/admin/{created['id']}")
    assert status_response.json()["status"] == "PROCESSING"
    assert status_response.json()["needs_review"] is True


def test_callback_amount_mismatch_never_marks_payment_successful(client, monkeypatch):
    import app.modules.payments.router as payments_router_module

    monkeypatch.setattr(
        payments_router_module,
        "initiate_stk_push",
        lambda **kwargs: {
            "checkout_request_id": "ws_CO_test_0002",
            "merchant_request_id": "merchant_test_0002",
            "customer_message": "Accepted",
        },
    )

    created = _create_mpesa_intent(client, "payment-stk-test-0002")
    started = client.post(
        f"/api/v1/payments/admin/{created['id']}/stk-push",
        json={"phone_number": "0712345678"},
    )
    assert started.status_code == 200, started.text

    callback = {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": "merchant_test_0002",
                "CheckoutRequestID": "ws_CO_test_0002",
                "ResultCode": 0,
                "CallbackMetadata": {
                    "Item": [
                        {"Name": "Amount", "Value": 100},
                        {"Name": "MpesaReceiptNumber", "Value": "WRONGAMOUNT"},
                    ]
                },
            }
        }
    }
    received = client.post("/api/v1/payments/callbacks/stk", json=callback)
    assert received.status_code == 200, received.text

    status_response = client.get(f"/api/v1/payments/admin/{created['id']}")
    assert status_response.json()["status"] == "PROCESSING"
    assert status_response.json()["needs_review"] is True


def _prepare_stk_verification_case(client, monkeypatch, key, *, send_callback=True):
    import app.modules.payments.router as payments_router_module

    checkout_id = f"ws_CO_{key[-8:]}"
    merchant_id = f"merchant_{key[-8:]}"

    monkeypatch.setattr(
        payments_router_module,
        "initiate_stk_push",
        lambda **kwargs: {
            "checkout_request_id": checkout_id,
            "merchant_request_id": merchant_id,
            "customer_message": "Accepted",
        },
    )

    created = _create_mpesa_intent(client, key)
    started = client.post(
        f"/api/v1/payments/admin/{created['id']}/stk-push",
        json={"phone_number": "0712345678"},
    )
    assert started.status_code == 200, started.text

    if send_callback:
        callback = {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": merchant_id,
                    "CheckoutRequestID": checkout_id,
                    "ResultCode": 0,
                    "ResultDesc": "Success",
                    "CallbackMetadata": {
                        "Item": [
                            {"Name": "Amount", "Value": 1500},
                            {"Name": "MpesaReceiptNumber", "Value": f"RCPT{key[-8:]}"},
                            {"Name": "TransactionDate", "Value": 20261023120000},
                            {"Name": "PhoneNumber", "Value": 254712345678},
                        ]
                    },
                }
            }
        }
        received = client.post("/api/v1/payments/callbacks/stk", json=callback)
        assert received.status_code == 200, received.text

    return created, checkout_id, merchant_id


def test_stk_query_verification_marks_matching_payment_successful(client, monkeypatch):
    import app.modules.payments.router as payments_router_module

    created, checkout_id, merchant_id = _prepare_stk_verification_case(
        client, monkeypatch, "payment-verify-success-0001"
    )
    monkeypatch.setattr(
        payments_router_module,
        "query_stk_push",
        lambda **kwargs: {
            "ResponseCode": "0",
            "ResultCode": "0",
            "CheckoutRequestID": checkout_id,
            "MerchantRequestID": merchant_id,
        },
    )

    response = client.post(f"/api/v1/payments/admin/{created['id']}/verify-stk")
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "SUCCEEDED"
    assert response.json()["needs_review"] is False

    # Repeated verification must not create another success transition.
    again = client.post(f"/api/v1/payments/admin/{created['id']}/verify-stk")
    assert again.status_code == 200, again.text
    assert again.json()["status"] == "SUCCEEDED"


def test_stk_query_without_callback_evidence_stays_processing(client, monkeypatch):
    import app.modules.payments.router as payments_router_module

    created, checkout_id, merchant_id = _prepare_stk_verification_case(
        client, monkeypatch, "payment-verify-nocallback-0002", send_callback=False
    )
    monkeypatch.setattr(
        payments_router_module,
        "query_stk_push",
        lambda **kwargs: {
            "ResponseCode": "0",
            "ResultCode": "0",
            "CheckoutRequestID": checkout_id,
            "MerchantRequestID": merchant_id,
        },
    )

    response = client.post(f"/api/v1/payments/admin/{created['id']}/verify-stk")
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "PROCESSING"
    assert response.json()["needs_review"] is True


def test_stk_query_mismatched_checkout_never_succeeds(client, monkeypatch):
    import app.modules.payments.router as payments_router_module

    created, checkout_id, merchant_id = _prepare_stk_verification_case(
        client, monkeypatch, "payment-verify-mismatch-0003"
    )
    monkeypatch.setattr(
        payments_router_module,
        "query_stk_push",
        lambda **kwargs: {
            "ResponseCode": "0",
            "ResultCode": "0",
            "CheckoutRequestID": "different-checkout",
            "MerchantRequestID": merchant_id,
        },
    )

    response = client.post(f"/api/v1/payments/admin/{created['id']}/verify-stk")
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "PROCESSING"
    assert response.json()["needs_review"] is True


def test_stk_query_provider_error_does_not_mark_payment_successful(client, monkeypatch):
    import app.modules.payments.router as payments_router_module
    from app.modules.payments.daraja import DarajaError

    created, _, _ = _prepare_stk_verification_case(client, monkeypatch, "payment-verify-error-0004")

    def fail_query(**kwargs):
        raise DarajaError("Provider unavailable")

    monkeypatch.setattr(payments_router_module, "query_stk_push", fail_query)

    response = client.post(f"/api/v1/payments/admin/{created['id']}/verify-stk")
    assert response.status_code == 502

    status_response = client.get(f"/api/v1/payments/admin/{created['id']}")
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "PROCESSING"
    assert status_response.json()["needs_review"] is True
