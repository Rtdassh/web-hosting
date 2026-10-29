"""Read-only catalog and row fingerprints. Never exports passwords or row values."""
import hashlib
import json
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def fingerprint(value):
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def type_name(typ):
    # PostgreSQL FLOAT without precision and reflected DOUBLE PRECISION are identical.
    if isinstance(typ, sa.Float):
        return "REAL" if typ.precision is not None and typ.precision <= 24 else "DOUBLE PRECISION"
    sql_type = typ.compile(dialect=postgresql.dialect())
    if isinstance(typ, sa.Enum):
        sql_type = sql_type.removeprefix("public.")
    return sql_type


def column_shape(column):
    typ = column["type"]
    return dict(name=column["name"], type=type_name(typ),
                enum=list(typ.enums) if isinstance(typ, sa.Enum) else None,
                nullable=column["nullable"], default=column.get("default"),
                identity=column.get("identity"), computed=column.get("computed"))


def capture(connection):
    """Caller must set UTC/ISO and use a stable transaction; excludes alembic_version."""
    inspector = sa.inspect(connection)
    quote = connection.dialect.identifier_preparer.quote
    tables = {}
    for name in sorted(set(inspector.get_table_names(schema="public")) - {"alembic_version"}):
        qualified = 'public.' + quote(name)
        data = connection.execute(sa.text(
            f"SELECT count(*) AS rows, md5(coalesce(string_agg(h, '' ORDER BY h), '')) AS digest "
            f"FROM (SELECT md5(to_jsonb(t)::text) AS h FROM {qualified} t) s"
        )).mappings().one()
        tables[name] = dict(
            columns=[column_shape(c) for c in inspector.get_columns(name, schema="public")],
            pk=inspector.get_pk_constraint(name, schema="public"),
            fk=inspector.get_foreign_keys(name, schema="public"),
            unique=inspector.get_unique_constraints(name, schema="public"),
            indexes=inspector.get_indexes(name, schema="public"),
            checks=inspector.get_check_constraints(name, schema="public"),
            rows=data["rows"], digest=data["digest"],
        )
    enums = inspector.get_enums(schema="public")
    triggers = [dict(r) for r in connection.execute(sa.text("""
        SELECT c.relname AS table_name, t.tgname, t.tgenabled,
               pg_get_triggerdef(t.oid, true) AS definition
        FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND NOT t.tgisinternal
        ORDER BY c.relname, t.tgname
    """)).mappings()]
    sequences = {}
    rows = connection.execute(sa.text("""
        SELECT sequencename, data_type, start_value, min_value, max_value, increment_by, cycle
        FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename
    """)).mappings().all()
    for row in rows:
        name = row["sequencename"]
        if name == "alembic_version":
            continue
        state = connection.execute(sa.text(f"SELECT last_value, is_called FROM public.{quote(name)}")).mappings().one()
        sequences[name] = dict(row, **state)
    row_security = [dict(r) for r in connection.execute(sa.text("""
        SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname <> 'alembic_version'
        ORDER BY c.relname
    """)).mappings()]
    events = [dict(r) for r in connection.execute(sa.text(
        "SELECT evtname, evtevent, evtenabled FROM pg_event_trigger ORDER BY evtname"
    )).mappings()]
    return json.loads(canonical(dict(format=1, tables=tables, enums=enums, triggers=triggers,
                                    sequences=sequences, row_security=row_security, event_triggers=events)))


def session_settings(connection):
    connection.execute(sa.text("SELECT set_config('search_path', 'public', true)"))
    connection.execute(sa.text("SELECT set_config('TimeZone', 'UTC', true)"))
    connection.execute(sa.text("SELECT set_config('DateStyle', 'ISO, YMD', true)"))
    connection.execute(sa.text("SELECT set_config('extra_float_digits', '3', true)"))
