"""Add nullable current periods and invoice PDF metadata to the Debian history."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic_billing_fields import postcheck, precheck

revision = "d0003_subscription_period"
down_revision = "d0002_admin_audit_set_null"
branch_labels = None
depends_on = None


def upgrade():
    before = precheck(op.get_bind(), "debian")
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
    postcheck(op.get_bind(), "debian", before)


def downgrade():
    raise RuntimeError("Downgrade would remove billing metadata and is not authorized.")
