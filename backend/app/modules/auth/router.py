"""Sign-in endpoints. Mounted under /api/v1/auth."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.core.email import send_email
from app.core.errors import AppError, error_response
from app.modules.auth import service
from app.modules.auth.deps import AdminUser, CurrentUser, require_same_origin
from app.modules.auth.schemas import (
    ChangePasswordIn,
    ForgotPasswordIn,
    LoginIn,
    ProfileIn,
    RegisterIn,
    ResetPasswordIn,
    SessionOut,
    TotpDisableIn,
    TotpEnabledOut,
    TotpEnableIn,
    TotpSetupOut,
    UserOut,
)

REFRESH_COOKIE = "nw_refresh"  # httpOnly: JavaScript cannot read it
HINT_COOKIE = "nw_session"  # readable flag so the site only asks for a session when one may exist
REFRESH_PATH = "/api/v1/auth"

router = APIRouter(prefix="/auth", tags=["auth"], dependencies=[Depends(require_same_origin)])

Db = Annotated[Session, Depends(get_db)]
Config = Annotated[Settings, Depends(get_settings)]


def _set_cookies(response: Response, issued: service.IssuedSession, settings: Settings) -> None:
    max_age = int((issued.refresh_expires_at - datetime.now(UTC)).total_seconds())
    common = {"max_age": max_age, "secure": settings.cookie_secure, "samesite": "strict"}
    response.set_cookie(
        REFRESH_COOKIE, issued.refresh_token, httponly=True, path=REFRESH_PATH, **common
    )
    response.set_cookie(HINT_COOKIE, "1", httponly=False, path="/", **common)
    response.headers["Cache-Control"] = "no-store"


def _clear_cookies(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        REFRESH_COOKIE,
        path=REFRESH_PATH,
        secure=settings.cookie_secure,
        samesite="strict",
        httponly=True,
    )
    response.delete_cookie(HINT_COOKIE, path="/", secure=settings.cookie_secure, samesite="strict")


def _session_out(issued: service.IssuedSession) -> SessionOut:
    return SessionOut(
        access_token=issued.access_token,
        expires_in=issued.expires_in,
        user=UserOut.model_validate(issued.user),
    )


@router.post("/register", status_code=201, response_model=SessionOut)
def register(
    data: RegisterIn, request: Request, response: Response, db: Db, settings: Config
) -> SessionOut:
    issued = service.register(db, data, request, settings)
    _set_cookies(response, issued, settings)
    return _session_out(issued)


@router.post("/login", response_model=SessionOut)
def login(
    data: LoginIn, request: Request, response: Response, db: Db, settings: Config
) -> SessionOut:
    issued = service.login(db, data, request, settings)
    _set_cookies(response, issued, settings)
    return _session_out(issued)


@router.post("/refresh", response_model=SessionOut)
def refresh(
    request: Request,
    db: Db,
    settings: Config,
    nw_refresh: Annotated[str | None, Cookie()] = None,
) -> SessionOut | JSONResponse:
    try:
        issued = service.refresh(db, nw_refresh, request, settings)
    except AppError as exc:
        failed = error_response(request, exc.status_code, exc.code, exc.message, exc.details)
        _clear_cookies(failed, settings)
        return failed
    body = _session_out(issued)
    response = JSONResponse(body.model_dump(mode="json", by_alias=True))
    _set_cookies(response, issued, settings)
    return response


@router.post("/logout", status_code=204)
def logout(
    db: Db,
    settings: Config,
    nw_refresh: Annotated[str | None, Cookie()] = None,
) -> Response:
    service.logout(db, nw_refresh)
    response = Response(status_code=204)
    _clear_cookies(response, settings)
    response.headers["Cache-Control"] = "no-store"
    return response


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser, response: Response) -> UserOut:
    response.headers["Cache-Control"] = "no-store"
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
def update_me(data: ProfileIn, user: CurrentUser, db: Db) -> UserOut:
    return UserOut.model_validate(service.update_profile(db, user, data))


@router.post("/change-password", response_model=SessionOut)
def change_password(
    data: ChangePasswordIn,
    user: CurrentUser,
    request: Request,
    response: Response,
    db: Db,
    settings: Config,
) -> SessionOut:
    issued = service.change_password(db, user, data, request, settings)
    _set_cookies(response, issued, settings)
    return _session_out(issued)


@router.post("/forgot-password", status_code=202)
def forgot_password(
    data: ForgotPasswordIn, request: Request, db: Db, settings: Config, tasks: BackgroundTasks
) -> dict[str, str]:
    # The same answer whether or not the address has an account.
    mail = service.request_password_reset(db, data, request, settings)
    if mail:
        to, subject, body = mail
        if settings.email_send_inline:
            send_email(settings, to=to, subject=subject, body=body)
        else:
            tasks.add_task(send_email, settings, to=to, subject=subject, body=body)
    return {"status": "If that address has an account, a reset link is on its way."}


@router.post("/reset-password", status_code=204)
def reset_password(data: ResetPasswordIn, db: Db) -> Response:
    service.reset_password(db, data)
    response = Response(status_code=204)
    response.headers["Cache-Control"] = "no-store"
    return response


# Two-factor sign-in for the owner's account. Clients do not need it.


@router.post("/2fa/setup", response_model=TotpSetupOut)
def two_factor_setup(user: AdminUser, db: Db, response: Response) -> TotpSetupOut:
    response.headers["Cache-Control"] = "no-store"
    secret, uri = service.totp_setup(db, user)
    return TotpSetupOut(secret=secret, otpauth_uri=uri)


@router.post("/2fa/enable", response_model=TotpEnabledOut)
def two_factor_enable(
    data: TotpEnableIn, user: AdminUser, db: Db, response: Response
) -> TotpEnabledOut:
    response.headers["Cache-Control"] = "no-store"
    return TotpEnabledOut(recovery_codes=service.totp_enable(db, user, data.code))


@router.post("/2fa/disable", status_code=204)
def two_factor_disable(data: TotpDisableIn, user: AdminUser, db: Db) -> Response:
    service.totp_disable(db, user, data.password, data.code)
    return Response(status_code=204)
