"""Request and response shapes for the public forms.

These rules mirror frontend/src/lib/schemas.ts. The browser check is for
convenience; this server-side check is the one that counts.
"""

import re
from datetime import UTC, date, datetime, timedelta, timezone
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
)

# Keep in sync with frontend/src/content/general.ts.
Budget = Literal[
    "Under KES 20,000",
    "KES 20,000 to 50,000",
    "KES 50,000 to 150,000",
    "KES 150,000 to 500,000",
    "Over KES 500,000",
    "Not sure yet",
]
TimeSlot = Literal[
    "Morning (9:00 to 12:00 EAT)",
    "Afternoon (12:00 to 15:00 EAT)",
    "Late afternoon (15:00 to 18:00 EAT)",
]

_PHONE = re.compile(r"^\+?[0-9][0-9\s-]{6,19}$")
_EAT = timezone(timedelta(hours=3))  # Kenya has no daylight saving time.


def _no_control_chars(value: str) -> str:
    """Reject NUL and other control characters (PostgreSQL cannot store NUL)."""
    if any(ord(ch) < 32 and ch not in "\n\r\t" for ch in value):
        raise ValueError("Contains characters that are not allowed")
    return value


def today_eat() -> date:
    return datetime.now(UTC).astimezone(_EAT).date()


Text = Annotated[str, AfterValidator(_no_control_chars)]
PersonName = Annotated[Text, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
Email = Annotated[EmailStr, StringConstraints(strip_whitespace=True, max_length=254)]


class LeadBase(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    name: PersonName
    email: Email
    phone: Text | None = None
    # Checked against the service catalogue in the database (see service.py).
    service: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
    # Hidden spam trap. Real visitors never see or fill it in.
    website: str = Field(default="", max_length=200)

    @field_validator("phone", mode="before")
    @classmethod
    def _clean_phone(cls, value: object) -> object:
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("Enter a valid phone number")
        value = value.strip()
        if value == "":
            return None
        if not _PHONE.match(value):
            raise ValueError("Enter a valid phone number, for example 0712 345 678")
        return value

    @field_validator("email", mode="after")
    @classmethod
    def _lower_email(cls, value: str) -> str:
        return value.lower()


class ContactIn(LeadBase):
    message: Annotated[
        Text, StringConstraints(strip_whitespace=True, min_length=10, max_length=2000)
    ]


class QuoteIn(LeadBase):
    budget: Budget
    deadline: date | None = None
    description: Annotated[
        Text, StringConstraints(strip_whitespace=True, min_length=20, max_length=4000)
    ]

    @field_validator("deadline", mode="before")
    @classmethod
    def _empty_deadline(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator("deadline", mode="after")
    @classmethod
    def _deadline_not_past(cls, value: date | None) -> date | None:
        if value is not None and value < today_eat():
            raise ValueError("Choose a date that is today or later")
        return value


class BookingIn(LeadBase):
    phone: Text  # type: ignore[assignment]  # required for bookings
    preferred_date: date = Field(alias="preferredDate")
    preferred_time: TimeSlot = Field(alias="preferredTime")
    requirements: Annotated[
        Text, StringConstraints(strip_whitespace=True, min_length=10, max_length=2000)
    ]

    @field_validator("phone", mode="before")
    @classmethod
    def _require_phone(cls, value: object) -> object:
        if not isinstance(value, str) or not _PHONE.match(value.strip()):
            raise ValueError("Enter a valid phone number, for example 0712 345 678")
        return value.strip()

    @field_validator("preferred_date", mode="after")
    @classmethod
    def _date_not_past(cls, value: date) -> date:
        if value < today_eat():
            raise ValueError("Choose a date that is today or later")
        return value


class LeadReceipt(BaseModel):
    id: str
    reference: str
    status: Literal["received"] = "received"
