"""Fill an empty catalogue from the bundled starter content.

Safe to run again: a slug that already exists is left exactly as it is, so
anything you edited in the admin area is never overwritten.
"""

import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.catalog.models import Project, Service

SEED_DIR = Path(__file__).resolve().parents[2] / "seed"

_SERVICE_FIELDS = {
    "title": "title",
    "summary": "summary",
    "description": "description",
    "problem": "problem",
    "deliverables": "deliverables",
    "technologies": "technologies",
    "timeline": "timeline",
    "startingPriceKes": "starting_price_kes",
    "bestFor": "best_for",
    "note": "note",
    "sortOrder": "sort_order",
}
_PROJECT_FIELDS = {
    "title": "title",
    "category": "category",
    "status": "status",
    "summary": "summary",
    "problem": "problem",
    "solution": "solution",
    "features": "features",
    "technologies": "technologies",
    "result": "result",
    "liveUrl": "live_url",
    "featured": "featured",
    "motif": "motif",
    "caveat": "caveat",
    "sortOrder": "sort_order",
}


def _load(name: str) -> list[dict]:
    return json.loads((SEED_DIR / name).read_text(encoding="utf-8"))


def _insert_missing(db: Session, model, items: list[dict], fields: dict[str, str]) -> int:  # noqa: ANN001
    existing = set(db.scalars(select(model.slug)))
    added = 0
    for item in items:
        if item["slug"] in existing:
            continue
        values = {column: item.get(key) for key, column in fields.items() if key in item}
        db.add(model(slug=item["slug"], is_active=True, **values))
        added += 1
    db.commit()
    return added


def seed_catalog(db: Session) -> tuple[int, int]:
    """Returns (services added, projects added)."""
    return (
        _insert_missing(db, Service, _load("services.json"), _SERVICE_FIELDS),
        _insert_missing(db, Project, _load("projects.json"), _PROJECT_FIELDS),
    )
