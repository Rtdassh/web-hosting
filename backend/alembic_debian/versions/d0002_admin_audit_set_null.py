"""Preserve admin audit records when an instance is deleted."""
from alembic import context, op

from alembic_fk import (
    DEFAULT_AUDIT_FK_NAME,
    find_existing_audit_instance_fk,
    replace_audit_instance_fk,
)

revision = "d0002_admin_audit_set_null"
down_revision = "d0001_adopt_debian"
branch_labels = None
depends_on = None


def upgrade():
    existing_name = (
        DEFAULT_AUDIT_FK_NAME
        if context.is_offline_mode()
        else find_existing_audit_instance_fk(op.get_bind())
    )
    replace_audit_instance_fk(op, existing_name)


def downgrade():
    raise RuntimeError("Downgrade cannot restore deleted instance references.")
