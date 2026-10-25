"""Request ID middleware.

Every request gets an ID. It is stored for logging, returned to the client in
the X-Request-ID response header, and included in error responses, so one
failing request can be traced through the logs.
"""

import logging
import re
import time
import uuid
from contextvars import ContextVar

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID_HEADER = "X-Request-ID"
_VALID_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{8,64}$")

request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)

logger = logging.getLogger("app.request")


class RequestIdMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = None
        for name, value in scope["headers"]:
            if name == b"x-request-id":
                incoming = value.decode("latin-1")
                break
        # Only trust a client-supplied ID if it looks safe; otherwise make our own.
        if incoming and _VALID_REQUEST_ID.match(incoming):
            request_id = incoming
        else:
            request_id = uuid.uuid4().hex

        scope.setdefault("state", {})["request_id"] = request_id
        token = request_id_ctx.set(request_id)
        started = time.perf_counter()
        status_code = 500

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = MutableHeaders(scope=message)
                headers[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            logger.info(
                "request completed",
                extra={
                    "fields": {
                        "method": scope["method"],
                        "path": scope["path"],  # path only: query strings can hold tokens
                        "status": status_code,
                        "duration_ms": duration_ms,
                    }
                },
            )
            request_id_ctx.reset(token)
