"""FastAPI application entry point.

Run from the backend folder with:
    python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import health
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging_config import setup_logging
from app.core.request_id import REQUEST_ID_HEADER, RequestIdMiddleware


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(settings.log_level)

    app = FastAPI(
        title="NyaberaWorks API",
        version=__version__,
        debug=settings.app_debug,
        docs_url="/api/docs" if settings.enable_api_docs else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if settings.enable_api_docs else None,
    )

    # Middleware added last runs first, so the request ID is the outermost layer.
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type", "Idempotency-Key", REQUEST_ID_HEADER],
            expose_headers=[REQUEST_ID_HEADER],
        )
    app.add_middleware(RequestIdMiddleware)

    register_exception_handlers(app)

    # Every API route lives under /api. Business routes will use /api/v1/... later.
    app.include_router(health.router, prefix="/api")
    return app


app = create_app()