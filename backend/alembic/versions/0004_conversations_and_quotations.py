"""link requests to accounts; add conversation messages and quotations

Revision ID: 0004
Revises: cb0548d94dfc
Create Date: 2026-10-18 09:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "cb0548d94dfc"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

LEAD_TABLES = ("contact_messages", "quote_requests", "booking_requests")


def upgrade() -> None:
    for table in LEAD_TABLES:
        op.add_column(table, sa.Column("user_id", sa.Uuid(), nullable=True))
        op.create_foreign_key(
            f"fk_{table}_user_id_users", table, "users", ["user_id"], ["id"], ondelete="SET NULL"
        )
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])

    op.create_table(
        "lead_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("lead_kind", sa.String(length=10), nullable=False),
        sa.Column("lead_id", sa.Uuid(), nullable=False),
        sa.Column("author_role", sa.String(length=10), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "lead_kind IN ('contact', 'quote', 'booking')",
            name=op.f("ck_lead_messages_lead_kind_valid"),
        ),
        sa.CheckConstraint(
            "author_role IN ('CLIENT', 'ADMIN')", name=op.f("ck_lead_messages_author_role_valid")
        ),
        sa.ForeignKeyConstraint(
            ["author_id"],
            ["users.id"],
            name=op.f("fk_lead_messages_author_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_lead_messages")),
    )
    op.create_index(
        "ix_lead_messages_lead", "lead_messages", ["lead_kind", "lead_id", "created_at"]
    )

    op.create_table(
        "quotations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("quote_request_id", sa.Uuid(), nullable=False),
        sa.Column("amount_kes", sa.Integer(), nullable=False),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=12), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('sent', 'accepted', 'declined', 'withdrawn')",
            name=op.f("ck_quotations_status_valid"),
        ),
        sa.CheckConstraint("amount_kes > 0", name=op.f("ck_quotations_amount_positive")),
        sa.ForeignKeyConstraint(
            ["quote_request_id"],
            ["quote_requests.id"],
            name=op.f("fk_quotations_quote_request_id_quote_requests"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_quotations")),
    )
    op.create_index("ix_quotations_quote_request_id", "quotations", ["quote_request_id"])


def downgrade() -> None:
    op.drop_table("quotations")
    op.drop_table("lead_messages")
    for table in LEAD_TABLES:
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        op.drop_constraint(f"fk_{table}_user_id_users", table, type_="foreignkey")
        op.drop_column(table, "user_id")
