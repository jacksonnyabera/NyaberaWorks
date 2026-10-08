"""Create (or promote) the administrator account.

Run from the backend folder, with the virtual environment active:
    python -m app.cli.create_admin

The password is typed at a hidden prompt, so it never appears in your shell
history or on screen.
"""

import argparse
import getpass
import sys

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_engine
from app.core.security import hash_password
from app.modules.auth.schemas import check_password_strength
from app.modules.users.models import User


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create or promote the NyaberaWorks admin account."
    )
    parser.add_argument("--email", help="Admin email address (asked if omitted)")
    parser.add_argument("--name", help="Admin display name (asked if omitted)")
    args = parser.parse_args()

    typed_email = (args.email or input("Admin email: ")).strip()
    try:
        # Same check the login form uses, so the admin can actually sign in.
        email = validate_email(typed_email, check_deliverability=False).normalized.lower()
    except EmailNotValidError as problem:
        print(f"That email address cannot be used: {problem}")
        return 1

    with Session(get_engine()) as db:
        existing = db.scalar(select(User).where(User.email == email))
        if existing:
            if existing.role == "ADMIN":
                print(f"{email} is already an admin. Nothing to do.")
                return 0
            answer = input(f"{email} already has a client account. Make it an admin? [y/N] ")
            if answer.strip().lower() != "y":
                print("Cancelled.")
                return 1
            existing.role = "ADMIN"
            db.commit()
            print(f"{email} is now an admin.")
            return 0

        name = (args.name or input("Admin name: ")).strip()
        if len(name) < 2:
            print("Enter a name of at least 2 characters.")
            return 1
        password = getpass.getpass("Password (typing is hidden): ")
        if password != getpass.getpass("Repeat password: "):
            print("The passwords do not match.")
            return 1
        try:
            check_password_strength(password, email)
        except ValueError as problem:
            print(problem)
            return 1

        db.add(User(email=email, name=name, password_hash=hash_password(password), role="ADMIN"))
        db.commit()
        print(f"Admin account created for {email}.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
