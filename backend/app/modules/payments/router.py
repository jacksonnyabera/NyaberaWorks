from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.modules.auth.deps import AdminUser
from app.modules.payments.daraja import DarajaError, initiate_stk_push, query_stk_push
from app.modules.payments.models import Payment, PaymentTransaction
from app.modules.payments.schemas import AdminPaymentIntentCreate, PaymentResponse, STKPushRequest

router = APIRouter(prefix="/payments", tags=["payments"])
Db = Annotated[Session, Depends(get_db)]


@router.post(
    "/admin/intents",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_admin_payment_intent(
    payload: AdminPaymentIntentCreate,
    db: Db,
    admin: AdminUser,
    idempotency_header: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    # Require the explicit header so clients can safely retry requests.
    key = idempotency_header or payload.idempotency_key
    if key != payload.idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency key header and body must match")

    existing = db.scalar(select(Payment).where(Payment.idempotency_key == key))
    if existing:
        if (
            existing.amount_minor != payload.amount_minor
            or existing.currency != payload.currency
            or existing.provider_method != payload.provider_method
        ):
            raise HTTPException(
                status_code=409,
                detail="Idempotency key was already used with different payment details",
            )
        return existing

    # This endpoint is admin-only and creates a ledger intent only.
    # It does not call a provider or mark the payment as paid.
    payment = Payment(
        provider="manual",
        provider_method=payload.provider_method,
        kind="PAYMENT",
        amount_minor=payload.amount_minor,
        currency=payload.currency,
        status="CREATED",
        needs_review=False,
        idempotency_key=key,
    )
    db.add(payment)
    try:
        db.flush()
        db.add(
            PaymentTransaction(
                payment_id=payment.id,
                provider="manual",
                event_type="INTENT_CREATED",
                raw_payload={
                    "source": "admin_api",
                    "admin_id": str(getattr(admin, "id", "")),
                    "currency": payload.currency,
                    "amount_minor": payload.amount_minor,
                },
            )
        )
        db.commit()
        db.refresh(payment)
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(Payment).where(Payment.idempotency_key == key))
        if existing:
            if (
                existing.amount_minor != payload.amount_minor
                or existing.currency != payload.currency
                or existing.provider_method != payload.provider_method
            ):
                raise HTTPException(status_code=409, detail="Idempotency key conflict") from None
            return existing
        raise HTTPException(status_code=409, detail="Could not create payment intent") from None
    return payment


@router.get("/admin/{payment_id}", response_model=PaymentResponse)
def get_admin_payment(
    payment_id: UUID,
    db: Db,
    admin: AdminUser,
):
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.post("/admin/{payment_id}/stk-push", response_model=PaymentResponse)
def start_stk_push(
    payment_id: UUID,
    payload: STKPushRequest,
    db: Db,
    admin: AdminUser,
):
    """Start an STK prompt for an existing admin-created payment intent."""
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.provider_method != "mpesa":
        raise HTTPException(status_code=409, detail="Payment intent is not configured for M-Pesa")

    # Safe retry: do not send another prompt after a request has been accepted.
    if payment.status == "PENDING" and payment.provider_reference:
        return payment

    if payment.status != "CREATED":
        raise HTTPException(status_code=409, detail="Payment is not available for STK Push")

    if payment.currency != "KES":
        raise HTTPException(status_code=400, detail="STK Push currently supports KES only")

    # Daraja accepts whole shillings. Stored KES amounts use minor units (100 = KSh 1).
    if payment.amount_minor % 100 != 0:
        raise HTTPException(
            status_code=400,
            detail="STK Push amount must represent a whole number of Kenyan shillings",
        )

    try:
        result = initiate_stk_push(
            phone_number=payload.phone_number,
            amount_kes=payment.amount_minor // 100,
            account_reference=f"NW{str(payment.id).replace('-', '')[:10]}",
        )
    except DarajaError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from None

    payment.provider = "mpesa"
    payment.provider_reference = result["checkout_request_id"]
    payment.status = "PENDING"

    db.add(
        PaymentTransaction(
            payment_id=payment.id,
            provider="mpesa",
            event_type="STK_PUSH_REQUESTED",
            provider_event_id=result["checkout_request_id"],
            raw_payload={
                "checkout_request_id": result["checkout_request_id"],
                "merchant_request_id": result["merchant_request_id"],
                "amount_minor": payment.amount_minor,
                "currency": payment.currency,
            },
        )
    )
    db.commit()
    db.refresh(payment)
    return payment


@router.post(
    "/admin/{payment_id}/verify-stk",
    response_model=PaymentResponse,
)
def verify_stk_payment(
    payment_id: UUID,
    db: Db,
    admin: AdminUser,
):
    """Verify an STK checkout against Daraja and matching callback evidence."""
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.status == "SUCCEEDED":
        return payment

    if (
        payment.provider_method != "mpesa"
        or not payment.provider_reference
        or payment.status not in {"PENDING", "PROCESSING"}
    ):
        raise HTTPException(
            status_code=409,
            detail="Payment is not eligible for STK verification",
        )

    request_event = db.scalar(
        select(PaymentTransaction)
        .where(
            PaymentTransaction.payment_id == payment.id,
            PaymentTransaction.provider == "mpesa",
            PaymentTransaction.event_type == "STK_PUSH_REQUESTED",
        )
        .order_by(PaymentTransaction.created_at.desc())
    )
    request_data = (
        request_event.raw_payload
        if request_event and isinstance(request_event.raw_payload, dict)
        else {}
    )
    expected_merchant_id = request_data.get("merchant_request_id")
    checkout_id = payment.provider_reference

    if not isinstance(expected_merchant_id, str) or not expected_merchant_id:
        payment.status = "PROCESSING"
        payment.needs_review = True
        db.commit()
        db.refresh(payment)
        return payment

    try:
        result = query_stk_push(checkout_request_id=checkout_id)
    except DarajaError:
        raise HTTPException(
            status_code=502,
            detail="Daraja verification is temporarily unavailable; retry safely",
        ) from None

    query_confirmed = (
        isinstance(result, dict)
        and str(result.get("ResponseCode", "")) == "0"
        and str(result.get("ResultCode", "")) == "0"
        and result.get("CheckoutRequestID") == checkout_id
        and result.get("MerchantRequestID") == expected_merchant_id
    )

    # Query success alone does not establish the amount and receipt in this ledger.
    callback_events = db.scalars(
        select(PaymentTransaction).where(
            PaymentTransaction.payment_id == payment.id,
            PaymentTransaction.provider == "mpesa",
            PaymentTransaction.event_type == "CALLBACK_AWAITING_VERIFICATION",
        )
    ).all()

    matching_callback = None
    for event in callback_events:
        data = event.raw_payload if isinstance(event.raw_payload, dict) else {}
        receipt = data.get("receipt")
        amount = data.get("amount")
        if (
            data.get("checkout_request_id") == checkout_id
            and data.get("merchant_request_id") == expected_merchant_id
            and isinstance(amount, int)
            and not isinstance(amount, bool)
            and amount == payment.amount_minor // 100
            and payment.currency == "KES"
            and payment.amount_minor % 100 == 0
            and isinstance(receipt, str)
            and bool(receipt.strip())
        ):
            matching_callback = data
            break

    if not query_confirmed or matching_callback is None:
        payment.status = "PROCESSING"
        payment.needs_review = True
        db.add(
            PaymentTransaction(
                payment_id=payment.id,
                provider="mpesa",
                event_type="STK_QUERY_INCONCLUSIVE",
                raw_payload={
                    "checkout_request_id": checkout_id,
                    "merchant_request_id": expected_merchant_id,
                    "response_code": str(result.get("ResponseCode", ""))[:40]
                    if isinstance(result, dict)
                    else "",
                    "result_code": str(result.get("ResultCode", ""))[:40]
                    if isinstance(result, dict)
                    else "",
                    "query_ids_match": bool(query_confirmed),
                    "matching_callback_found": matching_callback is not None,
                },
                processed_at=datetime.now(UTC),
            )
        )
        db.commit()
        db.refresh(payment)
        return payment

    receipt = matching_callback["receipt"]
    payment.status = "SUCCEEDED"
    payment.needs_review = False
    payment.failure_code = None
    payment.verified_at = datetime.now(UTC)

    db.add(
        PaymentTransaction(
            payment_id=payment.id,
            provider="mpesa",
            event_type="STK_QUERY_VERIFIED_SUCCESS",
            provider_event_id=f"{checkout_id[:118]}:verified",
            raw_payload={
                "checkout_request_id": checkout_id,
                "merchant_request_id": expected_merchant_id,
                "result_code": "0",
                "amount": matching_callback["amount"],
                "receipt": receipt[:128],
            },
            processed_at=datetime.now(UTC),
        )
    )
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/callbacks/stk")
def receive_stk_callback(payload: dict, db: Db):
    """Receive provider callbacks; never trust unmatched or inconsistent events."""
    body = payload.get("Body")
    callback = body.get("stkCallback") if isinstance(body, dict) else None
    if not isinstance(callback, dict):
        raise HTTPException(status_code=400, detail="Invalid callback structure")

    checkout_id = callback.get("CheckoutRequestID")
    merchant_id = callback.get("MerchantRequestID")
    result_code = callback.get("ResultCode")

    if not isinstance(checkout_id, str) or not checkout_id or len(checkout_id) > 128:
        raise HTTPException(status_code=400, detail="Invalid checkout reference")
    if result_code is None or not str(result_code).lstrip("-").isdigit():
        raise HTTPException(status_code=400, detail="Invalid result code")

    code = int(result_code)
    metadata = callback.get("CallbackMetadata") or {}
    items = metadata.get("Item", []) if isinstance(metadata, dict) else []
    if not isinstance(items, list):
        items = []

    values = {
        item.get("Name"): item.get("Value")
        for item in items
        if isinstance(item, dict) and isinstance(item.get("Name"), str)
    }

    receipt = values.get("MpesaReceiptNumber")
    amount = values.get("Amount")

    # Only correlate against the checkout reference created by our own request.
    payment = db.scalar(
        select(Payment).where(
            Payment.provider == "mpesa",
            Payment.provider_reference == checkout_id,
        )
    )

    # Unknown references must never mutate a payment. Acknowledge to avoid retries.
    if payment is None:
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    if payment.status not in ("PENDING", "PROCESSING"):
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    # Correlate the merchant request ID with the original STK request.
    request_event = db.scalar(
        select(PaymentTransaction)
        .where(
            PaymentTransaction.payment_id == payment.id,
            PaymentTransaction.provider == "mpesa",
            PaymentTransaction.event_type == "STK_PUSH_REQUESTED",
        )
        .order_by(PaymentTransaction.created_at.desc())
    )
    original_payload = (
        request_event.raw_payload
        if request_event and isinstance(request_event.raw_payload, dict)
        else {}
    )
    expected_merchant_id = original_payload.get("merchant_request_id")

    if (
        not isinstance(merchant_id, str)
        or not merchant_id
        or not isinstance(expected_merchant_id, str)
        or merchant_id != expected_merchant_id
    ):
        event_id = f"{checkout_id}:merchant-review"
        duplicate_review = db.scalar(
            select(PaymentTransaction).where(
                PaymentTransaction.provider == "mpesa",
                PaymentTransaction.provider_event_id == event_id,
            )
        )
        if not duplicate_review:
            payment.status = "PROCESSING"
            payment.needs_review = True
            db.add(
                PaymentTransaction(
                    payment_id=payment.id,
                    provider="mpesa",
                    event_type="CALLBACK_REVIEW",
                    provider_event_id=event_id,
                    signature_valid=None,
                    raw_payload={
                        "checkout_request_id": checkout_id,
                        "merchant_request_id": str(merchant_id or "")[:128],
                        "reason": "Merchant request ID missing or mismatched",
                    },
                    processed_at=datetime.now(UTC),
                )
            )
            db.commit()
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    # Successful result codes require a receipt and an exact expected amount.
    amount_is_valid = (
        isinstance(amount, (int, float))
        and not isinstance(amount, bool)
        and float(amount).is_integer()
        and payment.currency == "KES"
        and payment.amount_minor % 100 == 0
        and int(amount) == payment.amount_minor // 100
    )
    success_is_valid = code == 0 and isinstance(receipt, str) and bool(receipt.strip())

    if code == 0 and not (amount_is_valid and success_is_valid):
        event_id = f"{checkout_id}:review"
        if db.scalar(
            select(PaymentTransaction).where(
                PaymentTransaction.provider == "mpesa",
                PaymentTransaction.provider_event_id == event_id,
            )
        ):
            return {"ResultCode": 0, "ResultDesc": "Accepted"}

        payment.status = "PROCESSING"
        payment.needs_review = True
        db.add(
            PaymentTransaction(
                payment_id=payment.id,
                provider="mpesa",
                event_type="CALLBACK_REVIEW",
                provider_event_id=event_id,
                signature_valid=None,
                raw_payload={
                    "checkout_request_id": checkout_id,
                    "merchant_request_id": str(merchant_id or "")[:128],
                    "result_code": code,
                    "received_amount": amount if isinstance(amount, (int, float)) else None,
                    "receipt_present": bool(receipt),
                    "reason": "Missing receipt or amount mismatch",
                },
                processed_at=datetime.now(UTC),
            )
        )
        db.commit()
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    event_id = str(receipt).strip() if code == 0 else f"{checkout_id}:{code}"

    duplicate = db.scalar(
        select(PaymentTransaction).where(
            PaymentTransaction.provider == "mpesa",
            PaymentTransaction.provider_event_id == event_id,
        )
    )
    if duplicate:
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    if code == 0:
        # Callback data alone is not independent proof of settlement.
        payment.status = "PROCESSING"
        payment.needs_review = True
        event_type = "CALLBACK_AWAITING_VERIFICATION"
    else:
        payment.status = "FAILED"
        payment.failure_code = f"DARAJA_{code}"[:100]
        event_type = "PAYMENT_FAILED"

    # Store only the relevant audit fields, not the customer's full phone number.
    db.add(
        PaymentTransaction(
            payment_id=payment.id,
            provider="mpesa",
            event_type=event_type,
            provider_event_id=event_id,
            signature_valid=None,
            raw_payload={
                "checkout_request_id": checkout_id,
                "merchant_request_id": str(merchant_id or "")[:128],
                "result_code": code,
                "amount": int(amount) if amount_is_valid else None,
                "receipt": str(receipt)[:128] if code == 0 else None,
            },
            processed_at=datetime.now(UTC),
        )
    )
    db.commit()
    return {"ResultCode": 0, "ResultDesc": "Accepted"}
