"""Imports every database model in one place.

Alembic imports this file so it knows about all tables. When you add a new
module with models, import it here.
"""

from app.modules.catalog import models as catalog_models  # noqa: F401
from app.modules.conversations import models as conversations_models  # noqa: F401
from app.modules.leads import models as leads_models  # noqa: F401
from app.modules.users import models as users_models  # noqa: F401
