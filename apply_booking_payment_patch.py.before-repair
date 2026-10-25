from pathlib import Path
from datetime import datetime
import shutil
import sys

ROOT = Path.cwd()
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")

def read(rel):
    p = ROOT / rel
    if not p.is_file():
        raise RuntimeError(f"Missing file: {rel}")
    return p.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

files = [
    "backend/app/modules/leads/models.py",
    "backend/app/modules/payments/models.py",
    "backend/app/modules/payments/schemas.py",
    "backend/app/modules/payments/router.py",
    "backend/app/modules/admin/schemas.py",
    "backend/app/modules/admin/leads.py",
    "backend/alembic/versions/cb0548d94dfc_prepare_payment_and_booking_schema.py",
]

try:
    src = {f: read(f) for f in files}

    # Confirm the migration parent revision before preparing a child migration.
    if 'revision: str = "cb0548d94dfc"' not in src[files[6]] and 'revision = "cb0548d94dfc"' not in src[files[6]]:
        raise RuntimeError("Expected parent migration revision was not found.")

    # 1. Booking model: store the price explicitly approved by the admin.
    f = files[0]
    s = src[f]
    s = replace_once(
        s,
        "from sqlalchemy import CheckConstraint, Date, DateTime, Index, String, Text, Uuid, func",
        "from sqlalchemy import CheckConstraint, Date, DateTime, Index, Integer, String, Text, Uuid, func",
        "Booking model SQLAlchemy imports",
    )
    s = replace_once(
        s,
        '    requirements: Mapped[str] = mapped_column(Text)\n    status: Mapped[str] = mapped_column(String(20), default="requested")',
        '    requirements: Mapped[str] = mapped_column(Text)\n    status: Mapped[str] = mapped_column(String(20), default="requested")\n    agreed_price_kes: Mapped[int | None] = mapped_column(Integer, nullable=True)',
        "Booking price field",
    )
    src[f] = s

    # 2. Payment model: optionally tie a payment to a booking.
    f = files[1]
    s = src[f]
    s = replace_once(
        s,
        '    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)\n    currency: Mapped[str] = mapped_column(String(3), nullable=False)',
        '    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)\n    booking_id: Mapped[uuid.UUID | None] = mapped_column(\n        Uuid(as_uuid=True),\n        ForeignKey("booking_requests.id", ondelete="RESTRICT"),\n        nullable=True,\n        index=True,\n    )\n    currency: Mapped[str] = mapped_column(String(3), nullable=False)',
        "Payment booking foreign key",
    )
    src[f] = s

    # 3. Request and response schemas.
    f = files[2]
    s = src[f]
    s = replace_once(
        s,
        'class AdminPaymentIntentCreate(BaseModel):\n',
        'class AdminPaymentIntentCreate(BaseModel):\n    booking_id: UUID | None = None\n',
        "Payment-intent booking input",
    )
    s = replace_once(
        s,
        '    amount_minor: int\n    currency: str\n    status: str',
        '    amount_minor: int\n    booking_id: UUID | None = None\n    currency: str\n    status: str',
        "Payment response booking field",
    )
    src[f] = s

    # 4. Admin booking response and update schema.
    f = files[4]
    s = src[f]
    s = replace_once(
        s,
        'class BookingOut(LeadOutBase):\n    preferred_date: date\n    preferred_time: str\n    requirements: str',
        'class BookingOut(LeadOutBase):\n    preferred_date: date\n    preferred_time: str\n    requirements: str\n    agreed_price_kes: int | None = None',
        "Admin booking output price",
    )
    s = replace_once(
        s,
        'class LeadUpdate(CamelModel):\n    status: str | None = None',
        'class LeadUpdate(CamelModel):\n    agreed_price_kes: int | None = Field(default=None, ge=1)\n    status: str | None = None',
        "Admin lead price update input",
    )
    src[f] = s

    # 5. Admin lead update: only booking records can receive an agreed price.
    f = files[5]
    s = src[f]
    s = replace_once(
        s,
        '        changes = data.model_dump(exclude_unset=True)\n        if "status" in changes:',
        '        changes = data.model_dump(exclude_unset=True)\n        if "agreed_price_kes" in changes:\n            if model is not Booking:\n                raise AppError(\n                    422,\n                    "VALIDATION_ERROR",\n                    "Request validation failed.",\n                    [{"field": "agreed_price_kes", "message": "Only bookings can have an agreed price", "type": "value_error"}],\n                )\n            row.agreed_price_kes = changes["agreed_price_kes"]\n        if "status" in changes:',
        "Admin lead price update handler",
    )
    src[f] = s

    # 6. Payment endpoint: validate booking, status, currency, and exact amount.
    f = files[3]
    s = src[f]
    s = replace_once(
        s,
        'from app.modules.payments.models import Payment, PaymentTransaction\n',
        'from app.modules.payments.models import Payment, PaymentTransaction\nfrom app.modules.leads.models import Booking\n',
        "Payment router Booking import",
    )
    s = replace_once(
        s,
        '    existing = db.scalar(select(Payment).where(Payment.idempotency_key == key))',
        '    if payload.booking_id is not None:\n'
        '        booking = db.get(Booking, payload.booking_id)\n'
        '        if booking is None:\n'
        '            raise HTTPException(status_code=404, detail="Booking not found")\n'
        '        if booking.status != "confirmed":\n'
        '            raise HTTPException(status_code=409, detail="Booking must be confirmed before payment")\n'
        '        if booking.agreed_price_kes is None:\n'
        '            raise HTTPException(status_code=409, detail="Booking has no approved price")\n'
        '        if payload.currency != "KES" or payload.amount_minor != booking.agreed_price_kes * 100:\n'
        '            raise HTTPException(status_code=422, detail="Payment amount must match the approved booking price in KES")\n'
        '\n'
        '    existing = db.scalar(select(Payment).where(Payment.idempotency_key == key))',
        "Payment booking validation",
    )
    s = replace_once(
        s,
        '            or existing.provider_method != payload.provider_method\n',
        '            or existing.provider_method != payload.provider_method\n'
        '            or existing.booking_id != payload.booking_id\n',
        "Payment idempotency booking comparison",
    )
    # The same comparison occurs in the concurrent-retry branch; replace its remaining occurrence.
    s = replace_once(
        s,
        '                or existing.provider_method != payload.provider_method\n',
        '                or existing.provider_method != payload.provider_method\n'
        '                or existing.booking_id != payload.booking_id\n',
        "Payment concurrent idempotency booking comparison",
    )
    s = replace_once(
        s,
        '        amount_minor=payload.amount_minor,\n        currency=payload.currency,',
        '        amount_minor=payload.amount_minor,\n        booking_id=payload.booking_id,\n        currency=payload.currency,',
        "Payment record booking assignment",
    )
    s = replace_once(
        s,
        '                    "amount_minor": payload.amount_minor,\n',
        '                    "amount_minor": payload.amount_minor,\n'
        '                    "booking_id": str(payload.booking_id) if payload.booking_id else None,\n',
        "Payment transaction booking audit field",
    )
    src[f] = s

    # 7. New migration. Do not execute it in this patch.
    migration = ROOT / "backend/alembic/versions/a17c4d92e6b1_link_payments_to_approved_bookings.py"
    if migration.exists():
        raise RuntimeError(f"Migration already exists: {migration}")
    migration_text = '''"""Link payments to bookings and store approved booking prices.

Revision ID: a17c4d92e6b1
Revises: cb0548d94dfc
"""
from alembic import op
import sqlalchemy as sa

revision = "a17c4d92e6b1"
down_revision = "cb0548d94dfc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "booking_requests",
        sa.Column("agreed_price_kes", sa.Integer(), nullable=True),
    )
    op.add_column(
        "payments",
        sa.Column("booking_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_payments_booking_id_booking_requests",
        "payments",
        "booking_requests",
        ["booking_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_payments_booking_id", "payments", ["booking_id"])


def downgrade() -> None:
    op.drop_index("ix_payments_booking_id", table_name="payments")
    op.drop_constraint(
        "fk_payments_booking_id_booking_requests",
        "payments",
        type_="foreignkey",
    )
    op.drop_column("payments", "booking_id")
    op.drop_column("booking_requests", "agreed_price_kes")
'''
    # Ensure model-level and migration index names agree.
    if "index=True" not in src[files[1]]:
        raise RuntimeError("Expected payment booking index declaration is missing.")

    # All expected source patterns validated. Back up every changed source before writing.
    for rel in files:
        p = ROOT / rel
        backup = p.with_name(p.name + ".backup-" + stamp)
        shutil.copy2(p, backup)

    written = []
    try:
        for rel in files:
            (ROOT / rel).write_text(src[rel], encoding="utf-8")
            written.append(ROOT / rel)
        migration.write_text(migration_text, encoding="utf-8")
        written.append(migration)
    except Exception:
        for p in written:
            # Backups share the exact timestamp generated above.
            backup = p.with_name(p.name + ".backup-" + stamp)
            if backup.exists():
                shutil.copy2(backup, p)
            elif p == migration and p.exists():
                p.unlink()
        raise

    print("PATCH APPLIED. Migration file created but NOT executed.")
    print(f"Backup timestamp: {stamp}")
    print("Changed files:")
    for rel in files:
        print(f"  {rel}")
    print(f"  {migration.relative_to(ROOT)}")

except Exception as exc:
    print(f"PATCH ABORTED: {exc}", file=sys.stderr)
    print("No source files were written unless the output explicitly said PATCH APPLIED.", file=sys.stderr)
    sys.exit(1)

