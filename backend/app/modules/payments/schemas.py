from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class AdminPaymentIntentCreate(BaseModel):
    amount_minor: int = Field(gt=0, description="Amount in the currency's minor units")
    currency: Literal["KES", "USD"] = "KES"
    provider_method: Literal["manual", "mpesa"] = "manual"
    idempotency_key: str = Field(min_length=8, max_length=128)


class PaymentResponse(BaseModel):
    id: UUID
    provider: str
    provider_method: str
    kind: str
    amount_minor: int
    currency: str
    status: str
    needs_review: bool
    idempotency_key: str
    provider_reference: str | None = None
    failure_code: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class STKPushRequest(BaseModel):
    phone_number: str = Field(min_length=10, max_length=16)
