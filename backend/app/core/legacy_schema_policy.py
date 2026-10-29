"""Preserve confirmed legacy columns without guessing their SQL types/defaults."""
LEGACY_COLUMNS = {
    "plans": {"billing_period", "is_active", "created_at"},
    "subscriptions": {"start_date", "end_date", "auto_renew"},
    "instances": {"template_id"},
    "users": {"updated_at"},
}


def include_object(obj, name, type_, reflected, compare_to):
    if type_ == "index" and not reflected and compare_to is None and not obj.unique:
        # A verified primary key already supplies this index. Avoid proposing a
        # redundant new secondary index; existing indexes are never removed here.
        table = obj.table
        if tuple(c.name for c in obj.columns) == tuple(c.name for c in table.primary_key.columns):
            return False
    if not reflected or compare_to is not None:
        return True
    table = getattr(obj, "table", None)
    protected = LEGACY_COLUMNS.get(getattr(table, "name", None), set())
    if type_ == "column":
        return name not in protected
    if type_ in {"foreign_key_constraint", "unique_constraint", "index"}:
        # Protect dependencies whose definition includes a preserved legacy column.
        return not any(c.name in protected for c in obj.columns)
    return True
