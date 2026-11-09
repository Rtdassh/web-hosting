"""Physical schema contracts introduced after the frozen V1 histories."""
from app.core.schema_profiles_v1 import (
    apply_profile as apply_profile_v1,
    metadata_for_profile as metadata_for_profile_v1,
)

AUDIT_INSTANCE_FK_NAME = "fk_admin_audit_logs_target_instance_id_instances"


def _apply_v2_delta(metadata):
    foreign_keys = [
        fk
        for fk in metadata.tables["admin_audit_logs"].c["target_instance_id"].foreign_keys
        if fk.target_fullname == "instances.id"
    ]
    if len(foreign_keys) != 1:
        raise ValueError("Expected exactly one audit-to-instance foreign key.")

    foreign_key = foreign_keys[0]
    foreign_key.ondelete = "SET NULL"
    foreign_key.constraint.ondelete = "SET NULL"
    foreign_key.constraint.name = AUDIT_INSTANCE_FK_NAME
    return metadata


def apply_profile(metadata, profile):
    return _apply_v2_delta(apply_profile_v1(metadata, profile))


def metadata_for_profile(source, profile):
    return _apply_v2_delta(metadata_for_profile_v1(source, profile))
