"""Explicit physical contracts for two histories; neither profile changes a DB.

The runtime ORM returns the same Python enums/UTC instants for either history.
Autogeneration uses a copy with the selected history's physical types and FK rules.
Unknown differences are still compared normally; no global type/FK suppression.
"""
import sqlalchemy as sa

ENUMS = {
    ("users", "role"): ("userrole", ("ADMIN", "CLIENT")),
    ("instances", "status"): ("instancestatus", ("PENDING", "RUNNING", "STOPPED", "FAILED")),
    ("payment_transactions", "status"): ("transactionstatus", ("APPROVED", "REJECTED", "PENDING")),
}
DEBIAN_TIMESTAMPS = {
    ("users", "created_at"), ("subscriptions", "created_at"),
    ("instances", "created_at"), ("instances", "updated_at"),
    ("payment_transactions", "created_at"),
}
FROZEN_NAIVE = {
    ("invoices", "created_at"), ("admin_audit_logs", "timestamp"),
    ("password_reset_tokens", "expires_at"), ("password_reset_tokens", "created_at"),
}
DEBIAN_FKS = {
    ("instances", "user_id"): "CASCADE",
    ("subscriptions", "user_id"): "CASCADE",
    ("subscriptions", "plan_id"): "CASCADE",
    ("port_allocations", "instance_id"): "SET NULL",
    ("payment_transactions", "user_id"): "CASCADE",
}


def apply_profile(metadata, profile):
    """Apply known variations in memory, preserving future/unrecognized fields."""
    if profile not in {"fresh", "debian"}:
        raise ValueError("Unknown schema profile.")
    for (table, column), (name, labels) in ENUMS.items():
        metadata.tables[table].c[column].type = sa.Enum(
            *labels, name=name, native_enum=profile == "fresh", length=50,
            create_constraint=False, validate_strings=True,
        )
    for table, column in DEBIAN_TIMESTAMPS:
        metadata.tables[table].c[column].type = sa.DateTime(timezone=profile == "debian")
    for table, column in FROZEN_NAIVE:
        metadata.tables[table].c[column].type = sa.DateTime(timezone=False)
    metadata.tables["instance_status_history"].c.changed_at.type = sa.DateTime(timezone=True)
    metadata.tables["instances"].c.updated_at.nullable = profile == "fresh"
    metadata.tables["plans"].c.description.type = sa.Text() if profile == "debian" else sa.String(255)
    for (table, column), action in DEBIAN_FKS.items():
        for fk in metadata.tables[table].c[column].foreign_keys:
            fk.ondelete = action if profile == "debian" else None
            fk.constraint.ondelete = fk.ondelete
    # Same uniqueness, different physical representation in the reported schema.
    if profile == "debian":
        for table_name, column_name in (("users", "email"), ("instances", "uuid")):
            table = metadata.tables[table_name]
            for index in list(table.indexes):
                if index.unique and tuple(c.name for c in index.columns) == (column_name,):
                    table.indexes.remove(index)  # metadata only; never emits removal DDL
            if not any(isinstance(c, sa.UniqueConstraint) and tuple(x.name for x in c.columns) == (column_name,)
                       for c in table.constraints):
                table.append_constraint(sa.UniqueConstraint(column_name, name=f"{table_name}_{column_name}_key"))
    return metadata


def metadata_for_profile(source, profile):
    metadata = sa.MetaData()
    for table in source.sorted_tables:
        table.to_metadata(metadata)
    return apply_profile(metadata, profile)


def fk_matches(actual, expected):
    """Compare exact FK semantics, normalizing PostgreSQL's omitted defaults."""
    options = actual.get("options", {})
    return (
        actual["constrained_columns"] == [expected.parent.name]
        and actual["referred_table"] == expected.column.table.name
        and actual["referred_columns"] == [expected.column.name]
        and actual.get("referred_schema") in (None, "public")
        and (options.get("ondelete") or "NO ACTION") == (expected.ondelete or "NO ACTION")
        and (options.get("onupdate") or "NO ACTION") == (expected.onupdate or "NO ACTION")
        and bool(options.get("deferrable")) == bool(expected.deferrable)
        and (options.get("initially") or "IMMEDIATE") == (expected.initially or "IMMEDIATE")
    )
