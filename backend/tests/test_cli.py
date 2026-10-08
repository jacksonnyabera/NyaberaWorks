"""The create-admin command."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cli import create_admin
from app.core.security import verify_password
from app.modules.users.models import User


@pytest.fixture
def cli(monkeypatch, db_session_factory):
    engine = db_session_factory.kw["bind"]
    monkeypatch.setattr(create_admin, "get_engine", lambda: engine)
    monkeypatch.setattr("sys.argv", ["create_admin"])
    return engine


def answers(monkeypatch, typed: list[str], passwords: list[str] | None = None):
    typed_iter = iter(typed)
    password_iter = iter(passwords or [])
    monkeypatch.setattr("builtins.input", lambda _prompt="": next(typed_iter))
    monkeypatch.setattr("getpass.getpass", lambda _prompt="": next(password_iter))


def test_creates_an_admin(cli, monkeypatch):
    answers(monkeypatch, ["Boss@Example.com", "The Boss"], ["a long enough passphrase"] * 2)
    assert create_admin.main() == 0
    with Session(cli) as db:
        user = db.scalar(select(User))
        assert user.email == "boss@example.com"
        assert user.role == "ADMIN"
        assert verify_password("a long enough passphrase", user.password_hash)


def test_refuses_a_weak_password_and_mismatch(cli, monkeypatch):
    answers(monkeypatch, ["boss@example.com", "The Boss"], ["password123", "password123"])
    assert create_admin.main() == 1
    answers(
        monkeypatch,
        ["boss@example.com", "The Boss"],
        ["a long enough passphrase", "different one entirely"],
    )
    assert create_admin.main() == 1
    with Session(cli) as db:
        assert db.scalar(select(User)) is None


def test_promotes_an_existing_client_only_after_confirmation(cli, monkeypatch):
    with Session(cli) as db:
        db.add(User(email="amina@example.com", name="Amina", password_hash="x", role="CLIENT"))
        db.commit()
    answers(monkeypatch, ["amina@example.com", "n"])
    assert create_admin.main() == 1
    answers(monkeypatch, ["amina@example.com", "y"])
    assert create_admin.main() == 0
    with Session(cli) as db:
        assert db.scalar(select(User)).role == "ADMIN"


def test_refuses_an_email_the_login_form_would_reject(cli, monkeypatch):
    answers(monkeypatch, ["admin@nyabera.test", "The Boss"], ["a long enough passphrase"] * 2)
    assert create_admin.main() == 1
    with Session(cli) as db:
        assert db.scalar(select(User)) is None
