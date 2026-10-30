"""Frozen seven-table baseline. For new databases only, not legacy adoption."""
from alembic import context, op
import sqlalchemy as sa

revision = "0001_existing_core"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    if not context.is_offline_mode():
        existing = set(sa.inspect(op.get_bind()).get_table_names(schema="public"))
        if existing - {"alembic_version"}:
            raise RuntimeError("Baseline requires an empty public schema. Legacy adoption needs verification.")
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("ADMIN", "CLIENT", name="userrole"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table(
        "plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(50), nullable=False, unique=True),
        sa.Column("description", sa.String(255)),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("max_instances", sa.Integer(), nullable=False),
        sa.Column("max_ram_mb", sa.Integer(), nullable=False),
        sa.Column("cpu_quota", sa.Float(), nullable=False),
    )
    op.create_index("ix_plans_id", "plans", ["id"])
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan_id", sa.Integer(), sa.ForeignKey("plans.id"), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_subscriptions_id", "subscriptions", ["id"])
    op.create_table(
        "instances",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("uuid", sa.String(36), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("container_id", sa.String(64), unique=True),
        sa.Column("assigned_port", sa.Integer(), nullable=False, unique=True),
        sa.Column("public_url", sa.String(255), nullable=False),
        sa.Column("status", sa.Enum("PENDING", "RUNNING", "STOPPED", "FAILED", name="instancestatus"), nullable=False),
        sa.Column("storage_path", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_instances_id", "instances", ["id"])
    op.create_index("ix_instances_uuid", "instances", ["uuid"], unique=True)
    op.create_table(
        "port_allocations",
        sa.Column("port_number", sa.Integer(), primary_key=True),
        sa.Column("is_allocated", sa.Boolean(), nullable=False),
        sa.Column("instance_id", sa.Integer(), sa.ForeignKey("instances.id")),
    )
    op.create_index("ix_port_allocations_port_number", "port_allocations", ["port_number"])
    op.create_table(
        "instance_status_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("instance_id", sa.Integer(), sa.ForeignKey("instances.id", ondelete="CASCADE"), nullable=False),
        sa.Column("previous_status", sa.String(50)),
        sa.Column("new_status", sa.String(50), nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "payment_transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan_id", sa.Integer(), sa.ForeignKey("plans.id"), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("card_last_four", sa.String(4), nullable=False),
        sa.Column("card_brand", sa.String(20), nullable=False),
        sa.Column("auth_code", sa.String(32), nullable=False, unique=True),
        sa.Column("status", sa.Enum("APPROVED", "REJECTED", "PENDING", name="transactionstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_payment_transactions_id", "payment_transactions", ["id"])


def downgrade():
    raise RuntimeError("Baseline downgrade would remove data and is not authorized.")
