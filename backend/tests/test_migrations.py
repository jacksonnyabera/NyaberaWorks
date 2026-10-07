"""Runs the real migrations against a real PostgreSQL database.

Skipped unless TEST_DATABASE_URL is set, for example:
    postgresql+psycopg://nyaberaworks:PASSWORD@127.0.0.1:5432/nyaberaworks_test
Use an empty, throwaway database: this test creates and drops the tables.
"""

import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

TEST_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="TEST_DATABASE_URL is not set")

BACKEND = Path(__file__).resolve().parents[1]


def _config() -> Config:
    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))
    config.set_main_option("sqlalchemy.url", TEST_URL or "")
    return config


def test_upgrade_then_downgrade_round_trip():
    config = _config()
    engine = create_engine(TEST_URL or "")
    command.upgrade(config, "head")
    tables = set(inspect(engine).get_table_names())
    assert {"contact_messages", "quote_requests", "bookings"} <= tables
    command.downgrade(config, "base")
    assert "contact_messages" not in set(inspect(engine).get_table_names())
    engine.dispose()
