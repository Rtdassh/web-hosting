"""Only the empty payment table is changed; existing legacy definitions are retained."""
import sqlalchemy as sa
from .contract import load_revision, expected_metadata
from .verify import require, validate_before, validate_preserved, primary_index_covers
from .evidence import capture, fingerprint, type_name
from app.core.schema_profiles_v1 import fk_matches


def verify_after(connection, before):
    after = capture(connection)
    validate_preserved(before, after)
    wanted = expected_metadata("debian")
    inspector = sa.inspect(connection)
    for name in ("payment_transactions", "invoices", "admin_audit_logs", "password_reset_tokens"):
        table = wanted.tables[name]
        cols = {c["name"]: c for c in after["tables"][name]["columns"]}
        require(set(cols) == set(table.c.keys()), f"Postcheck column mismatch: {name}.")
        require(after["tables"][name]["pk"]["constrained_columns"] == [c.name for c in table.primary_key], f"Postcheck PK: {name}.")
        for col in table.c:
            require(cols[col.name]["type"] == type_name(col.type)
                    and cols[col.name]["nullable"] == col.nullable, f"Postcheck type/nullability: {name}.{col.name}.")
            if isinstance(col.type, sa.Enum) and col.type.native_enum:
                require(cols[col.name]["enum"] == list(col.type.enums), "Postcheck enum mismatch.")
        for fk in table.foreign_keys:
            actual = [f for f in after["tables"][name]["fk"] if f["constrained_columns"] == [fk.parent.name]]
            require(len(actual) == 1 and fk_matches(actual[0], fk), f"Postcheck FK: {name}.{fk.parent.name}.")
        unique = {tuple(k["column_names"]) for k in inspector.get_unique_constraints(name, schema="public")}
        unique |= {tuple(i["column_names"]) for i in inspector.get_indexes(name, schema="public") if i["unique"]}
        for constraint in table.constraints:
            if isinstance(constraint, sa.UniqueConstraint):
                require(tuple(c.name for c in constraint.columns) in unique, f"Postcheck UNIQUE: {name}.")
        for index in table.indexes:
            found = any(i["name"] == index.name and tuple(i["column_names"]) == tuple(c.name for c in index.columns)
                        and bool(i["unique"]) == bool(index.unique)
                        for i in inspector.get_indexes(name, schema="public"))
            pk_covered = not index.unique and tuple(c.name for c in index.columns) == tuple(c.name for c in table.primary_key) and primary_index_covers(connection, name, [c.name for c in index.columns])
            require(found or pk_covered, f"Postcheck index: {name}.{index.name}.")
    return after


def upgrade(connection, operations, evidence, approved_digest):
    require(fingerprint(evidence) == approved_digest, "Evidence digest does not match reviewed manifest.")
    quote = connection.dialect.identifier_preparer.quote
    # The manifest's names are also compared to the fixed inventory before DDL.
    actual = set(sa.inspect(connection).get_table_names(schema="public")) - {"alembic_version"}
    require(actual == set(evidence["tables"]), "Table inventory changed since capture.")
    names = ', '.join('public.' + quote(n) for n in sorted(actual))
    connection.execute(sa.text("SELECT set_config('lock_timeout', '5s', true)"))
    connection.execute(sa.text("SELECT set_config('statement_timeout', '60s', true)"))
    connection.execute(sa.text(f"LOCK TABLE {names} IN SHARE ROW EXCLUSIVE MODE"))
    before = capture(connection)
    require(before == evidence, "Schema, data or sequence drift since evidence capture; review again.")
    validate_before(connection, before)
    require(connection.execute(sa.text("SELECT count(*) FROM public.payment_transactions")).scalar_one() == 0,
            "Payment table is no longer empty; no automatic backfill is permitted.")
    # Preserve all five existing payment columns, including VARCHAR status and
    # TIMESTAMPTZ created_at. The ORM maps member names without a SQL conversion.
    for name, typ in (("plan_id", sa.Integer()), ("card_last_four", sa.String(4)),
                      ("card_brand", sa.String(20)), ("auth_code", sa.String(32))):
        operations.add_column("payment_transactions", sa.Column(name, typ, nullable=False), schema="public")
    operations.create_foreign_key("fk_payment_transactions_plan_id", "payment_transactions", "plans",
                                  ["plan_id"], ["id"], source_schema="public", referent_schema="public")
    operations.create_unique_constraint("uq_payment_transactions_auth_code", "payment_transactions", ["auth_code"], schema="public")
    require(primary_index_covers(connection, "payment_transactions", ["id"]), "Payment PK index is not usable.")
    # Reuse the immutable definition of the three missing tables, not live ORM metadata.
    module = load_revision("0002_billing_admin_recovery.py")
    module.op = operations
    module.upgrade()
    verify_after(connection, before)  # failure aborts the enclosing DDL transaction
