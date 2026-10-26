"""Turn off two-factor sign-in for an account (lost phone and recovery codes).

Run from the backend folder, with the virtual environment active and DATABASE_URL set:
    python -m app.cli.reset_2fa --email you@example.com
"""

import argparse
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_engine
from app.modules.users.models import User


def main() -> int:
    parser = argparse.ArgumentParser(description="Turn off two-factor sign-in for one account.")
    parser.add_argument("--email", required=True)
    args = parser.parse_args()
    with Session(get_engine()) as db:
        user = db.scalar(select(User).where(User.email == args.email.strip().lower()))
        if user is None:
            print("No account with that email.")
            return 1
        user.totp_enabled = False
        user.totp_secret = None
        user.totp_last_step = None
        user.recovery_hashes = None
        db.commit()
    print("Two-factor sign-in is now off for that account. Turn it on again after you sign in.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
