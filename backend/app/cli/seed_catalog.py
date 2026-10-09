"""Add the starter services and portfolio projects to the database.

Run from the backend folder, with the virtual environment active:
    python -m app.cli.seed_catalog

Safe to run more than once. Existing rows are never changed.
"""

from sqlalchemy.orm import Session

from app.core.db import get_engine
from app.modules.catalog.seed import seed_catalog


def main() -> int:
    with Session(get_engine()) as db:
        services, projects = seed_catalog(db)
    print(f"Added {services} service(s) and {projects} project(s). Existing ones were left alone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
