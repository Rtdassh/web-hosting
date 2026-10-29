"""Fail-closed structural checks. Missing evidence is a blocker, not a guessed DDL."""
import sqlalchemy as sa
from .evidence import type_name
from .contract import CORE, NEW, LEGACY, EXTRAS, COUNTS, ASSIGNMENTS, PAYMENT_OLD, LEGACY_PHYSICAL, expected_metadata
from app.core.schema_profiles_v1 import fk_matches


class ReconciliationBlocked(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise ReconciliationBlocked(message)


def validate_server(connection):
    version = connection.dialect.server_version_info
    require(connection.dialect.name == "postgresql" and bool(version) and version[0] in (16, 17),
            "Debian adoption is tested only on PostgreSQL 16 and 17; other versions need review.")


def primary_index_covers(connection, table_name, columns):
    """An exact, usable PK index covers a redundant non-unique index request.

    Does not accept a prefix, partial/expression index or a merely similarly named
    index. Does not create/drop indexes or waive unique/FK checks.
    """
    return connection.execute(sa.text("""
        SELECT EXISTS (
            SELECT 1 FROM pg_catalog.pg_index i
            JOIN pg_catalog.pg_class c ON c.oid=i.indrelid
            JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relname=:table_name
              AND i.indisprimary AND i.indisunique AND i.indisvalid AND i.indisready
              AND i.indpred IS NULL AND i.indexprs IS NULL
              AND ARRAY(
                  SELECT a.attname::text
                  FROM unnest(i.indkey::smallint[]) WITH ORDINALITY x(num,pos)
                  JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum=x.num
                  WHERE x.pos<=i.indnkeyatts ORDER BY x.pos
              )=CAST(:columns AS text[])
        )
    """), {"table_name": table_name, "columns": list(columns)}).scalar_one()


def validate_before(connection, snapshot):
    validate_server(connection)
    tables = snapshot["tables"]
    require(not any(r["relrowsecurity"] or r["relforcerowsecurity"] for r in snapshot.get("row_security", [])), "RLS needs a separately reviewed preservation strategy.")
    require(not any(e["evtenabled"] != "D" for e in snapshot.get("event_triggers", [])), "Enabled DDL event triggers need explicit review.")
    require(set(tables) == CORE | LEGACY, "Expected the reviewed 21-table inventory; obtain fresh evidence.")
    require(not NEW & set(tables), "New tables already present; adoption route is not applicable.")
    for table, count in COUNTS.items():
        require(tables[table]["rows"] == count, f"Row count changed for {table}; review again.")
    expected = expected_metadata("debian")
    for name in CORE:
        actual = {c["name"]: c for c in tables[name]["columns"]}
        wanted = expected.tables[name]
        columns = PAYMENT_OLD if name == "payment_transactions" else set(wanted.c.keys()) | EXTRAS.get(name, set())
        require(set(actual) == columns, f"Unexpected/missing columns in {name}.")
        require(tables[name]["pk"]["constrained_columns"] == [c.name for c in wanted.primary_key], f"Primary key mismatch: {name}.")
        for column in wanted.c:
            if name == "payment_transactions" and column.name not in PAYMENT_OLD:
                continue
            current = actual[column.name]
            if name == "payment_transactions" and column.name == "status":
                require(current["default"] is None, "Unreviewed payment status default.")
                require(not tables[name]["checks"], "Unreviewed payment CHECK constraints.")
            require(current["type"] == type_name(column.type), f"Type mismatch: {name}.{column.name}.")
            require(current["nullable"] == column.nullable, f"Nullability mismatch: {name}.{column.name}.")
            if isinstance(column.type, sa.Enum) and column.type.native_enum:
                require(current["enum"] == list(column.type.enums), f"Enum mismatch: {name}.{column.name}.")
            elif isinstance(column.type, sa.Enum):
                require(current["enum"] is None, f"Expected physical VARCHAR, not native enum: {name}.{column.name}.")
        for extra in EXTRAS.get(name, set()):
            col = actual[extra]
            require(col["nullable"] or col["default"] is not None or col["identity"] or col["computed"],
                    f"ORM inserts omit required legacy column {name}.{extra}; default/semantics need evidence.")
            typ, nullable, defaults = LEGACY_PHYSICAL[name, extra]
            require(col["type"] == typ and col["nullable"] == nullable,
                    f"Legacy column type/nullability changed: {name}.{extra}.")
            require(col["default"] in defaults and not col["identity"] and not col["computed"],
                    f"Legacy column generator/default needs review: {name}.{extra}.")
        for fk in wanted.foreign_keys:
            if name == "payment_transactions" and fk.parent.name not in PAYMENT_OLD:
                continue  # plan_id is added by adoption; existing user_id FK is retained
            actual_fks = [f for f in tables[name]["fk"] if f["constrained_columns"] == [fk.parent.name]]
            require(len(actual_fks) == 1 and fk_matches(actual_fks[0], fk),
                    f"Foreign key mismatch: {name}.{fk.parent.name}.")
        if name != "payment_transactions":
            unique_sets = {tuple(k["column_names"]) for k in tables[name]["unique"]}
            unique_sets |= {tuple(i["column_names"]) for i in tables[name]["indexes"] if i["unique"] and not i.get("dialect_options", {}).get("postgresql_where")}
            for constraint in wanted.constraints:
                if isinstance(constraint, sa.UniqueConstraint):
                    require(tuple(c.name for c in constraint.columns) in unique_sets, f"Missing uniqueness: {name}.")
            for index in wanted.indexes:
                key = tuple(c.name for c in index.columns)
                if index.unique:
                    require(key in unique_sets, f"Missing unique index: {name}.{index.name}.")
                else:
                    secondary_exists = any(tuple(i["column_names"]) == key for i in tables[name]["indexes"])
                    primary_columns = tuple(tables[name]["pk"]["constrained_columns"])
                    covered = secondary_exists or (key == primary_columns and primary_index_covers(connection, name, key))
                    require(covered, f"Missing usable index: {name}.{index.name}.")
    template_fks = [f for f in tables["instances"]["fk"] if f["constrained_columns"] == ["template_id"]]
    require(len(template_fks) == 1 and template_fks[0]["referred_table"] == "templates"
            and template_fks[0]["referred_columns"] == ["id"]
            and template_fks[0].get("referred_schema") in (None, "public")
            and template_fks[0].get("options", {}).get("ondelete") == "SET NULL", "Unconfirmed template_id FK.")
    require(next(c for c in tables["instances"]["columns"] if c["name"] == "template_id")["nullable"], "template_id must permit NULL.")
    actual = [tuple(r) for r in connection.execute(sa.text("""
        SELECT i.id, i.assigned_port FROM public.instances i
        JOIN public.port_allocations p ON p.port_number=i.assigned_port
          AND p.instance_id=i.id AND p.is_allocated=true
        WHERE i.template_id IS NULL ORDER BY i.id
    """))]
    require(actual == ASSIGNMENTS, "Instance/port/template assignments do not match reviewed evidence.")
    duplicates = connection.execute(sa.text("SELECT user_id FROM public.subscriptions WHERE status='active' GROUP BY user_id HAVING count(*)>1")).first()
    require(duplicates is None, "Multiple active subscriptions found.")
    invalid = connection.execute(sa.text("SELECT count(*) FROM pg_constraint k JOIN pg_namespace n ON n.oid=k.connamespace WHERE n.nspname='public' AND NOT k.convalidated")).scalar_one()
    require(invalid == 0, "Unvalidated constraints require review.")
    triggers = [t for t in snapshot["triggers"] if t["table_name"] == "payment_transactions"]
    require(not triggers, "Payment triggers need explicit review before adding columns.")
    for table, column, labels in (("users", "role", ("ADMIN", "CLIENT")),
                                   ("instances", "status", ("PENDING", "RUNNING", "STOPPED", "FAILED"))):
        invalid_labels = connection.execute(sa.text(
            f"SELECT count(*) FROM public.{table} WHERE {column} IS NULL OR {column}::text NOT IN :labels"
        ).bindparams(sa.bindparam("labels", expanding=True)), {"labels": labels}).scalar_one()
        require(invalid_labels == 0, f"Invalid stored enum member names: {table}.{column}.")
    for table, maximum in (("users", 7), ("plans", 3), ("subscriptions", 7), ("instances", 22)):
        seq = connection.execute(sa.text("SELECT pg_get_serial_sequence(:table, 'id')"), {"table": "public." + table}).scalar_one()
        require(seq is not None, f"Missing ID generator: {table}.")
        value = connection.execute(sa.text(f"SELECT max(id) FROM public.{table}")).scalar_one()
        require(value == maximum, f"Unexpected ID maximum: {table}.")
        state = snapshot["sequences"].get(seq.split(".")[-1].strip('"'))
        require(state and state["last_value"] == maximum and state["is_called"] and state["increment_by"] > 0
                and not state["cycle"], f"Sequence mismatch: {table}.")
    seq = connection.execute(sa.text("SELECT pg_get_serial_sequence('public.payment_transactions', 'id')")).scalar_one()
    require(seq is not None, "Missing payment ID generator; do not guess a sequence.")
    state = snapshot["sequences"].get(seq.split(".")[-1].strip('"'))
    require(state and not state["is_called"] and state["increment_by"] > 0 and not state["cycle"], "Payment sequence state needs review.")
    for name, labels in (("userrole", ["ADMIN", "CLIENT"]),
                         ("instancestatus", ["PENDING", "RUNNING", "STOPPED", "FAILED"])):
        preserved = next((e for e in snapshot["enums"] if e["name"] == name), None)
        require(preserved is not None and preserved["labels"] == labels,
                f"Preserved legacy enum changed: {name}.")
    enum = next((e for e in snapshot["enums"] if e["name"] == "transactionstatus"), None)
    require(enum is None or enum["labels"] == ["APPROVED", "REJECTED", "PENDING"], "Conflicting transactionstatus enum.")


def validate_preserved(before, after):
    require(set(after["tables"]) == set(before["tables"]) | NEW, "Unexpected table inventory after adoption.")
    for name, original in before["tables"].items():
        current = after["tables"][name]
        require((original["rows"], original["digest"]) == (current["rows"], current["digest"]), f"Rows changed: {name}.")
        if name != "payment_transactions":
            require(original == current, f"Legacy definition changed: {name}.")
        else:
            cols = {c["name"]: c for c in current["columns"]}
            for old in original["columns"]:
                require(cols.get(old["name"]) == old, f"Original payment column changed: {old['name']}.")
            for category in ("pk", "checks"):
                require(original[category] == current[category], f"Original payment {category} changed.")
            for category in ("fk", "unique", "indexes"):
                require(all(item in current[category] for item in original[category]), f"Original payment {category} removed.")
    require(before["triggers"] == after["triggers"], "Triggers changed.")
    require(before.get("row_security") == [r for r in after.get("row_security", []) if r["relname"] in before["tables"]], "RLS definitions changed.")
    require(before.get("event_triggers") == after.get("event_triggers"), "DDL event triggers changed.")
    for name, sequence in before["sequences"].items():
        require(after["sequences"].get(name) == sequence, f"Sequence changed: {name}.")
    for enum in before["enums"]:
        require(enum in after["enums"], "Existing enum changed.")
