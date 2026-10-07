"""Imports every database model in one place.

Alembic imports this file so it knows about all tables. When you add a new
module with models, import it here.
"""

from app.modules.leads import models as leads_models  # noqa: F401
