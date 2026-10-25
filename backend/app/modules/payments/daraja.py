"""Safaricom Daraja STK Push client.

No credentials or full provider responses are logged.
Network calls can be mocked by tests through request_json().
"""

import base64
import json
from datetime import datetime
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from app.core.config import get_settings


class DarajaError(RuntimeError):
    """Safe-to-display provider integration error."""


def request_json(url: str, *, method: str = "GET", headers=None, body=None) -> dict:
    """Make a bounded-time JSON request; never include secrets in raised errors."""
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = Request(url, data=data, headers=headers or {}, method=method)

    try:
        with urlopen(request, timeout=15) as response:
            raw = response.read(1_000_001)
            if len(raw) > 1_000_000:
                raise DarajaError("Provider response exceeded the allowed size")
            parsed = json.loads(raw.decode("utf-8"))
            if not isinstance(parsed, dict):
                raise DarajaError("Unexpected provider response")
            return parsed
    except HTTPError as exc:
        # Do not expose provider response bodies or authentication details.
        raise DarajaError(f"Daraja returned HTTP {exc.code}") from None
    except (URLError, TimeoutError, OSError):
        raise DarajaError("Could not reach Daraja; check connectivity and retry safely") from None
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise DarajaError("Daraja returned an invalid JSON response") from None


def _configuration():
    settings = get_settings()
    required = {
        "consumer key": settings.daraja_consumer_key,
        "consumer secret": settings.daraja_consumer_secret,
        "shortcode": settings.daraja_shortcode,
        "passkey": settings.daraja_passkey,
        "callback URL": settings.daraja_callback_url,
    }
    missing = [label for label, value in required.items() if not value.strip()]
    if missing:
        raise DarajaError("Missing Daraja configuration: " + ", ".join(missing))

    if (
        settings.is_production or settings.daraja_environment == "production"
    ) and not settings.daraja_callback_url.startswith("https://"):
        raise DarajaError("Production Daraja callback URL must use HTTPS")

    base_url = (
        "https://api.safaricom.co.ke"
        if settings.daraja_environment == "production"
        else "https://sandbox.safaricom.co.ke"
    )
    return settings, base_url


def access_token() -> tuple[str, str]:
    settings, base_url = _configuration()
    credentials = f"{settings.daraja_consumer_key}:{settings.daraja_consumer_secret}"
    encoded = base64.b64encode(credentials.encode("utf-8")).decode("ascii")

    result = request_json(
        f"{base_url}/oauth/v1/generate?grant_type=client_credentials",
        headers={"Authorization": f"Basic {encoded}", "Accept": "application/json"},
    )
    token = result.get("access_token")
    if not isinstance(token, str) or not token:
        raise DarajaError("Daraja did not return an access token")
    return token, base_url


def initiate_stk_push(
    *,
    phone_number: str,
    amount_kes: int,
    account_reference: str,
    transaction_description: str = "NyaberaWorks payment",
) -> dict:
    """Submit an STK prompt. A successful response means accepted, not paid."""
    settings, base_url = _configuration()
    token, _ = access_token()

    phone = phone_number.strip().replace("+", "")
    if phone.startswith("0") and len(phone) == 10:
        phone = "254" + phone[1:]
    if phone.startswith("7") or phone.startswith("1"):
        phone = "254" + phone

    if not (phone.isdigit() and len(phone) == 12 and phone.startswith("254")):
        raise DarajaError("Enter a valid Kenyan mobile number, such as 0712345678")

    if amount_kes < 1:
        raise DarajaError("STK Push amount must be at least KSh 1")

    timestamp = datetime.now(ZoneInfo("Africa/Nairobi")).strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{settings.daraja_shortcode}{settings.daraja_passkey}{timestamp}".encode()
    ).decode("ascii")

    payload = {
        "BusinessShortCode": settings.daraja_shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": settings.daraja_transaction_type,
        "Amount": amount_kes,
        "PartyA": phone,
        "PartyB": settings.daraja_shortcode,
        "PhoneNumber": phone,
        "CallBackURL": settings.daraja_callback_url,
        "AccountReference": account_reference[:12],
        "TransactionDesc": transaction_description[:13],
    }

    result = request_json(
        f"{base_url}/mpesa/stkpush/v1/processrequest",
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body=payload,
    )

    if str(result.get("ResponseCode", "")) != "0":
        # Avoid returning provider messages that may contain sensitive details.
        raise DarajaError("Daraja did not accept the STK Push request")

    if not result.get("CheckoutRequestID") or not result.get("MerchantRequestID"):
        raise DarajaError("Daraja response is missing required request identifiers")

    return {
        "checkout_request_id": str(result["CheckoutRequestID"]),
        "merchant_request_id": str(result["MerchantRequestID"]),
        "customer_message": str(result.get("CustomerMessage", "STK Push accepted")),
    }


def query_stk_push(*, checkout_request_id: str) -> dict:
    """Query an existing STK checkout; acceptance alone is not proof of payment."""
    if (
        not isinstance(checkout_request_id, str)
        or not checkout_request_id.strip()
        or len(checkout_request_id) > 128
    ):
        raise DarajaError("Invalid STK checkout reference")

    settings, base_url = _configuration()
    token, _ = access_token()
    timestamp = datetime.now(ZoneInfo("Africa/Nairobi")).strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{settings.daraja_shortcode}{settings.daraja_passkey}{timestamp}".encode()
    ).decode("ascii")

    return request_json(
        f"{base_url}/mpesa/stkpushquery/v1/query",
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body={
            "BusinessShortCode": settings.daraja_shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id,
        },
    )
