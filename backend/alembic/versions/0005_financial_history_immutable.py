"""Preserve financial history and freeze transaction and invoice records."""
from alembic import context, op
import sqlalchemy as sa

from alembic_financial_history import (
    FUNCTION_NAME,
    ROW_TRIGGERS,
    TRUNCATE_TRIGGERS,
    USER_FK_NAMES,
    postcheck,
    precheck,
)

revision = "0005_financial_history"
down_revision = "0004_subscription_period"
branch_labels = None
depends_on = None


def upgrade():
    if context.is_offline_mode():
        existing_names = {
            "payment_transactions": "payment_transactions_user_id_fkey",
            "invoices": "invoices_user_id_fkey",
        }
        before = None
    else:
        before = precheck(op.get_bind(), "fresh")
        existing_names = before["foreign_keys"]

    op.add_column(
        "payment_transactions",
        sa.Column("plan_name_snapshot", sa.String(50), nullable=True),
        schema="public",
    )
    for table_name, constraint_name in USER_FK_NAMES.items():
        op.drop_constraint(
            existing_names[table_name],
            table_name,
            type_="foreignkey",
            schema="public",
        )
        op.create_foreign_key(
            constraint_name,
            table_name,
            "users",
            ["user_id"],
            ["id"],
            source_schema="public",
            referent_schema="public",
            ondelete="RESTRICT",
        )

    op.execute(sa.text(f"""
        CREATE FUNCTION public.{FUNCTION_NAME}()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $codrop$
        BEGIN
            RAISE EXCEPTION 'Financial history is immutable.'
                USING ERRCODE = '55000';
        END;
        $codrop$
    """))
    for table_name, trigger_name in ROW_TRIGGERS.items():
        op.execute(sa.text(
            f"CREATE TRIGGER {trigger_name} BEFORE UPDATE OR DELETE "
            f"ON public.{table_name} FOR EACH ROW "
            f"EXECUTE FUNCTION public.{FUNCTION_NAME}()"
        ))
    for table_name, trigger_name in TRUNCATE_TRIGGERS.items():
        op.execute(sa.text(
            f"CREATE TRIGGER {trigger_name} BEFORE TRUNCATE "
            f"ON public.{table_name} FOR EACH STATEMENT "
            f"EXECUTE FUNCTION public.{FUNCTION_NAME}()"
        ))

    if before is not None:
        postcheck(op.get_bind(), before)


def downgrade():
    raise RuntimeError("Downgrade would remove financial-history protections and is not authorized.")
