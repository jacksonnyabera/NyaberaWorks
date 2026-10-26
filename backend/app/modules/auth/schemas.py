"""Request and response shapes for sign-in and accounts.

Responses use camelCase field names (accessToken, createdAt) because that is
what the TypeScript front end expects.
"""

import re
import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    StringConstraints,
    ValidationInfo,
    field_validator,
    model_validator,
)
from pydantic.alias_generators import to_camel

from app.modules.leads.schemas import Email, PersonName, Text

_PHONE = re.compile(r"^\+?[0-9][0-9\s-]{6,19}$")

# A short list of the passwords attackers try first. Length matters more than
# complexity rules, so this is a safety net, not the main defence.
_COMMON = {
    "password",
    "password1",
    "password12",
    "password123",
    "passw0rd123",
    "1234567890",
    "12345678910",
    "123456789012",
    "qwertyuiop",
    "qwerty12345",
    "qwerty123456",
    "iloveyou123",
    "welcome123",
    "welcome1234",
    "admin12345",
    "administrator",
    "letmein1234",
    "abc1234567",
    "abcdefghij",
    "0123456789",
    "1q2w3e4r5t",
    "kenya12345",
    "nairobi123",
    "nairobi2024",
    "changeme123",
    "p@ssw0rd123",
}

MIN_PASSWORD = 10
MAX_PASSWORD = 128


def check_password_strength(password: str, email: str | None = None) -> str:
    """Return the password if acceptable, else raise ValueError with a plain message."""
    if len(password) < MIN_PASSWORD:
        raise ValueError(f"Use at least {MIN_PASSWORD} characters")
    if len(password) > MAX_PASSWORD:
        raise ValueError(f"Use at most {MAX_PASSWORD} characters")
    if any(ord(ch) < 32 for ch in password):
        raise ValueError("Contains characters that are not allowed")
    lowered = password.lower()
    if lowered in _COMMON or len(set(lowered)) < 4:
        raise ValueError(
            "That password is too easy to guess. Choose something longer or less common"
        )
    if email and (lowered == email.lower() or lowered == email.split("@")[0].lower()):
        raise ValueError("The password must not be your email address")
    return password


Password = Annotated[str, AfterValidator(lambda v: check_password_strength(v))]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


def _normalize_phone(data: object) -> object:
    """Empty phone becomes None; anything else must look like a phone number."""
    if isinstance(data, dict) and "phone" in data:
        phone = data["phone"]
        if phone is None or (isinstance(phone, str) and phone.strip() == ""):
            return {**data, "phone": None}
        if not isinstance(phone, str) or not _PHONE.match(phone.strip()):
            raise ValueError("Enter a valid phone number, for example 0712 345 678")
        return {**data, "phone": phone.strip()}
    return data


class RegisterIn(CamelModel):
    name: PersonName
    email: Email
    phone: Text | None = None
    password: Password

    @model_validator(mode="before")
    @classmethod
    def _clean_phone(cls, data: object) -> object:
        return _normalize_phone(data)

    @field_validator("email", mode="after")
    @classmethod
    def _lower_email(cls, value: str) -> str:
        return value.lower()

    @field_validator("password", mode="after")
    @classmethod
    def _password_not_email(cls, value: str, info: ValidationInfo) -> str:
        return check_password_strength(value, info.data.get("email"))


Code = Annotated[str, StringConstraints(strip_whitespace=True, min_length=6, max_length=20)]


class LoginIn(CamelModel):
    email: Email
    password: Annotated[str, StringConstraints(min_length=1, max_length=MAX_PASSWORD)]
    # Only needed for accounts that turned on two-factor sign-in.
    totp_code: Code | None = None


class ForgotPasswordIn(CamelModel):
    email: Email

    @field_validator("email", mode="after")
    @classmethod
    def _lower_email(cls, value: str) -> str:
        return value.lower()


class ResetPasswordIn(CamelModel):
    token: Annotated[str, StringConstraints(min_length=20, max_length=200)]
    new_password: Password


class TotpEnableIn(CamelModel):
    code: Code


class TotpDisableIn(CamelModel):
    password: Annotated[str, StringConstraints(min_length=1, max_length=MAX_PASSWORD)]
    code: Code


class TotpSetupOut(CamelModel):
    secret: str
    otpauth_uri: str


class TotpEnabledOut(CamelModel):
    recovery_codes: list[str]


class ProfileIn(CamelModel):
    name: PersonName
    phone: Text | None = None

    @model_validator(mode="before")
    @classmethod
    def _clean_phone(cls, data: object) -> object:
        return _normalize_phone(data)


class ChangePasswordIn(CamelModel):
    current_password: Annotated[str, StringConstraints(min_length=1, max_length=MAX_PASSWORD)]
    new_password: Password


class UserOut(CamelModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    phone: str | None
    role: Literal["CLIENT", "ADMIN"]
    totp_enabled: bool = False
    created_at: datetime


class SessionOut(CamelModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserOut
