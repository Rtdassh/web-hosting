"""Physical schema contract V4 for immutable financial history."""
import sqlalchemy as sa

from app.core.schema_profiles_v3 import (
    apply_profile as apply_profile_v3,
    metadata_for_profile as metadata_for_profile_v3,
)


FINANCIAL_USER_FKS = {
    "payment_transactions": "fk_payment_transactions_user_id_users",
    "invoices": "fk_invoices_user_id_users",
}


def _apply_v4_delta(metadata):
    transactions = metadata.tables["payment_transactions"]
    if "plan_name_snapshot" not in transactions.c:
        transactions.append_column(sa.Column("plan_name_snapshot", sa.String(50), nullable=True))

    for table_name, constraint_name in FINANCIAL_USER_FKS.items():
        column = metadata.tables[table_name].c.user_id
        foreign_keys = [
            foreign_key
            for foreign_key in column.foreign_keys
            if foreign_key.target_fullname == "users.id"
        ]
        if len(foreign_keys) != 1:
            raise ValueError(f"Expected exactly one financial user foreign key on {table_name}.")
        foreign_key = foreign_keys[0]
        foreign_key.ondelete = "RESTRICT"
        foreign_key.constraint.ondelete = "RESTRICT"
        foreign_key.constraint.name = constraint_name
    return metadata


def apply_profile(metadata, profile):
    return _apply_v4_delta(apply_profile_v3(metadata, profile))


def metadata_for_profile(source, profile):
    return _apply_v4_delta(metadata_for_profile_v3(source, profile))
