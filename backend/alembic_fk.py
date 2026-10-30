"""Validation helpers for narrowly scoped FK migrations."""
import sqlalchemy as sa

from app.core.schema_profiles_v2 import AUDIT_INSTANCE_FK_NAME

AUDIT_TABLE = "admin_audit_logs"
AUDIT_COLUMN = "target_instance_id"
INSTANCE_TABLE = "instances"
DEFAULT_AUDIT_FK_NAME = "admin_audit_logs_target_instance_id_fkey"


def find_existing_audit_instance_fk(connection):
    inspector = sa.inspect(connection)
    columns = {
        column["name"]: column
        for column in inspector.get_columns(AUDIT_TABLE, schema="public")
    }
    if AUDIT_COLUMN not in columns or columns[AUDIT_COLUMN]["nullable"] is not True:
        raise RuntimeError("Expected nullable admin_audit_logs.target_instance_id.")

    constraints = inspector.get_foreign_keys(AUDIT_TABLE, schema="public")
    touching = [
        fk for fk in constraints
        if AUDIT_COLUMN in (fk.get("constrained_columns") or [])
    ]
    if len(touching) != 1 or touching[0].get("constrained_columns") != [AUDIT_COLUMN]:
        raise RuntimeError("Expected exactly one FK on admin_audit_logs.target_instance_id.")

    fk = touching[0]
    options = fk.get("options") or {}
    ondelete = (options.get("ondelete") or "NO ACTION").upper()
    onupdate = (options.get("onupdate") or "NO ACTION").upper()
    if (
        fk.get("referred_table") != INSTANCE_TABLE
        or fk.get("referred_columns") != ["id"]
        or fk.get("referred_schema") not in (None, "public")
        or ondelete != "NO ACTION"
        or onupdate != "NO ACTION"
        or options.get("deferrable")
        or options.get("match") not in (None, "SIMPLE")
        or options.get("initially") not in (None, "IMMEDIATE")
        or not fk.get("name")
    ):
        raise RuntimeError(
            "Existing audit-instance FK differs from the reviewed NO ACTION contract."
        )
    return fk["name"]


def replace_audit_instance_fk(operations, existing_name):
    operations.drop_constraint(
        existing_name, AUDIT_TABLE, type_="foreignkey", schema="public"
    )
    operations.create_foreign_key(
        AUDIT_INSTANCE_FK_NAME,
        AUDIT_TABLE,
        INSTANCE_TABLE,
        [AUDIT_COLUMN],
        ["id"],
        source_schema="public",
        referent_schema="public",
        ondelete="SET NULL",
    )
