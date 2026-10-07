"""Alembic environment: connects to the database named in DATABASE_URL."""

from alembic import context
from sqlalchemy import create_engine, pool

from app import db_models  # noqa: F401  (imports every table so Alembic can see them)
from app.core.config import get_settings
from app.core.db import Base

target_metadata = Base.metadata


def _database_url() -> str:
    url = context.config.get_main_option("sqlalchemy.url") or get_settings().database_url
    if not url:
        raise RuntimeError("DATABASE_URL is not set. Add it to backend/.env.")
    return url


def run_migrations_offline() -> None:
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(_database_url(), poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
