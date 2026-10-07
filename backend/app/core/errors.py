"""One consistent error format for every error the API returns.

Shape: an "error" object holding code, message, details and request_id.
"""

import logging
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.request_id import REQUEST_ID_HEADER

logger = logging.getLogger("app.errors")

_STATUS_TO_CODE = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "TOO_MANY_REQUESTS",
    500: "INTERNAL_ERROR",
}


class AppError(Exception):
    """Raise this from business code to return a clean, predictable error."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: list[Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or []


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def error_response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: list[Any] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    request_id = _request_id(request)
    response_headers = dict(headers or {})
    if request_id:
        response_headers[REQUEST_ID_HEADER] = request_id
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details or [],
                "request_id": request_id,
            }
        },
        headers=response_headers,
    )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return error_response(request, exc.status_code, exc.code, exc.message, exc.details)


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = _STATUS_TO_CODE.get(exc.status_code, "HTTP_ERROR")
    if isinstance(exc.detail, str):
        message = exc.detail
    else:
        message = HTTPStatus(exc.status_code).phrase
    return error_response(request, exc.status_code, code, message, headers=exc.headers)


def _field_name(loc: tuple[Any, ...]) -> str:
    """Turn ("body", "email") into "email" so forms can match it to an input."""
    parts = [str(part) for part in loc]
    if parts and parts[0] in {"body", "query", "path", "header", "cookie"}:
        parts = parts[1:]
    return ".".join(parts)


def _clean_message(message: str) -> str:
    return message.removeprefix("Value error, ")


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    # Report where and why, but never echo the submitted values back.
    details = [
        {
            "field": _field_name(error["loc"]),
            "message": _clean_message(error["msg"]),
            "type": error["type"],
        }
        for error in exc.errors()
    ]
    return error_response(request, 422, "VALIDATION_ERROR", "Request validation failed.", details)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Full details go to the log only; the client gets a generic message.
    logger.error(
        "unhandled exception",
        exc_info=exc,
        extra={"fields": {"request_id": _request_id(request)}},
    )
    return error_response(request, 500, "INTERNAL_ERROR", "An unexpected error occurred.")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)
