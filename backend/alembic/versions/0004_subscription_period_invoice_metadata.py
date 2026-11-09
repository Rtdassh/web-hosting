"""Add plan billing fields, subscription periods and invoice PDF metadata."""
from alembic import context, op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic_billing_fields import postcheck, precheck

revision = "0004_subscription_period"
down_revision = "0003_admin_audit_set_null"
branch_labels = None
depends_on = None


def upgrade():
    before = None if context.is_offline_mode() else precheck(op.get_bind(), "fresh")
    op.add_column(
        "plans",
        sa.Column(
            "billing_period",
            sa.String(20),
            nullable=False,
            server_default="monthly",
        ),
        schema="public",
    )
    op.add_column(
        "plans",
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        schema="public",
    )
    op.add_column(
        "plans",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        schema="public",
    )
    op.add_column(
        "subscriptions",
        sa.Column(
            "start_date",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        schema="public",
    )
    op.add_column(
        "subscriptions",
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        schema="public",
    )
    op.add_column(
        "subscriptions",
        sa.Column(
            "auto_renew",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        schema="public",
    )
    op.add_column(
        "subscriptions",
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        schema="public",
    )
    op.add_column(
        "subscriptions",
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        schema="public",
    )
    op.add_column(
        "invoices",
        sa.Column("pdf_metadata", postgresql.JSONB(), nullable=True),
        schema="public",
    )
    if before is not None:
        postcheck(op.get_bind(), "fresh", before)


def downgrade():
    raise RuntimeError("Downgrade would remove billing metadata and is not authorized.")
