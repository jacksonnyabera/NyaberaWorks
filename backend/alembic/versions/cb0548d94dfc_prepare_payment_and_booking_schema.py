"""prepare payment and booking schema

Revision ID: cb0548d94dfc
Revises: 0003
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "cb0548d94dfc"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Preserve all existing booking-request records by renaming in place.
    op.rename_table("bookings", "booking_requests")

    op.execute(
        "ALTER TABLE booking_requests RENAME CONSTRAINT "
        "ck_bookings_status_valid TO ck_booking_requests_status_valid"
    )
    op.execute(
        "ALTER TABLE booking_requests RENAME CONSTRAINT "
        "pk_bookings TO pk_booking_requests"
    )
    op.execute(
        "ALTER TABLE booking_requests RENAME CONSTRAINT "
        "uq_bookings_reference TO uq_booking_requests_reference"
    )

    op.execute(
        "ALTER INDEX ix_bookings_email RENAME TO ix_booking_requests_email"
    )
    op.execute(
        "ALTER INDEX ix_bookings_ip_hash_created_at "
        "RENAME TO ix_booking_requests_ip_hash_created_at"
    )
    op.execute(
        "ALTER INDEX ix_bookings_status_preferred_date "
        "RENAME TO ix_booking_requests_status_preferred_date"
    )

    # Provider-independent payment ledger.
    op.create_table(
        "payments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(length=30), nullable=False),
        sa.Column("provider_method", sa.String(length=30), nullable=False),
        sa.Column("kind", sa.String(length=10), nullable=False),
        sa.Column("amount_minor", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("needs_review", sa.Boolean(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("provider_reference", sa.String(length=128), nullable=True),
        sa.Column("failure_code", sa.String(length=100), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "currency IN ('KES', 'USD')",
            name=op.f("ck_payments_currency_valid"),
        ),
        sa.CheckConstraint(
            "kind IN ('PAYMENT', 'REFUND')",
            name=op.f("ck_payments_kind_valid"),
        ),
        sa.CheckConstraint(
            "status IN ('CREATED', 'PENDING', 'PROCESSING', "
            "'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED')",
            name=op.f("ck_payments_status_valid"),
        ),
        sa.CheckConstraint(
            "amount_minor > 0",
            name=op.f("ck_payments_amount_positive"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payments")),
        sa.UniqueConstraint(
            "idempotency_key",
            name=op.f("uq_payments_idempotency_key"),
        ),
    )
    op.create_index(
        "ix_payments_provider_reference",
        "payments",
        ["provider_reference"],
        unique=False,
    )
    op.create_index(
        "ix_payments_status_created_at",
        "payments",
        ["status", "created_at"],
        unique=False,
    )

    # Append-only provider event ledger.
    op.create_table(
        "payment_transactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("payment_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(length=30), nullable=False),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("provider_event_id", sa.String(length=128), nullable=True),
        sa.Column(
            "raw_payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("signature_valid", sa.Boolean(), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["payment_id"],
            ["payments.id"],
            name=op.f("fk_payment_transactions_payment_id_payments"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint(
            "id", name=op.f("pk_payment_transactions")
        ),
    )
    op.create_index(
        op.f("ix_payment_transactions_payment_id"),
        "payment_transactions",
        ["payment_id"],
        unique=False,
    )
    op.create_index(
        "uq_payment_transactions_provider_event",
        "payment_transactions",
        ["provider", "provider_event_id"],
        unique=True,
        postgresql_where=sa.text("provider_event_id IS NOT NULL"),
    )


def downgrade() -> None:
    # Remove payment tables created by this revision.
    op.drop_index(
        "uq_payment_transactions_provider_event",
        table_name="payment_transactions",
    )
    op.drop_index(
        op.f("ix_payment_transactions_payment_id"),
        table_name="payment_transactions",
    )
    op.drop_table("payment_transactions")

    op.drop_index("ix_payments_status_created_at", table_name="payments")
    op.drop_index("ix_payments_provider_reference", table_name="payments")
    op.drop_table("payments")

    # Restore the original booking table name and object names.
    op.execute(
        "ALTER INDEX ix_booking_requests_email RENAME TO ix_bookings_email"
    )
    op.execute(
        "ALTER INDEX ix_booking_requests_ip_hash_created_at "
        "RENAME TO ix_bookings_ip_hash_created_at"
    )
    op.execute(
        "ALTER INDEX ix_booking_requests_status_preferred_date "
        "RENAME TO ix_bookings_status_preferred_date"
    )

    op.execute(
        "ALTER TABLE booking_requests RENAME CONSTRAINT "
        "ck_booking_requests_status_valid TO ck_bookings_status_valid"
    )
    op.execute(
        "ALTER TABLE booking_requests RENAME CONSTRAINT "
        "pk_booking_requests TO pk_bookings"
    )
    op.execute(
        "ALTER TABLE booking_requests RENAME CONSTRAINT "
        "uq_booking_requests_reference TO uq_bookings_reference"
    )

    op.rename_table("booking_requests", "bookings")
