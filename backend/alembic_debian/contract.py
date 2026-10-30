"""Read frozen revisions, not evolving ORM models, to build the adoption contract."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import sqlalchemy as sa

VERSIONS = Path(__file__).resolve().parents[1] / "alembic" / "versions"
CORE = {"users", "plans", "subscriptions", "instances", "port_allocations",
        "instance_status_history", "payment_transactions"}
NEW = {"invoices", "admin_audit_logs", "password_reset_tokens"}
LEGACY = {"asignacion_puertos", "audit_logs", "bitacora_auditoria", "comprobantes_factura",
          "email_verifications", "historial_estados_instancia", "invoice_receipts", "password_resets",
          "plantillas", "recuperaciones_contrasena", "roles", "templates", "transacciones_pago",
          "verificaciones_correo"}
EXTRAS = {
    "plans": {"billing_period", "is_active", "created_at"},
    "subscriptions": {"start_date", "end_date", "auto_renew"},
    "instances": {"template_id"}, "users": {"updated_at"},
}
COUNTS = {"users": 7, "plans": 3, "subscriptions": 7, "instances": 3,
          "port_allocations": 100, "asignacion_puertos": 100, "payment_transactions": 0}
ASSIGNMENTS = [(14, 30002), (19, 30001), (22, 30003)]
PAYMENT_OLD = {"id", "user_id", "amount", "status", "created_at"}
LEGACY_PHYSICAL = {
    ("plans", "billing_period"): ("VARCHAR(20)", False, {"'monthly'::character varying", "'monthly'::text", "'monthly'"}),
    ("plans", "is_active"): ("BOOLEAN", False, {"true"}),
    ("plans", "created_at"): ("TIMESTAMP WITH TIME ZONE", False, {"CURRENT_TIMESTAMP", "now()"}),
    ("subscriptions", "start_date"): ("TIMESTAMP WITH TIME ZONE", False, {"CURRENT_TIMESTAMP", "now()"}),
    ("subscriptions", "end_date"): ("TIMESTAMP WITH TIME ZONE", True, {None}),
    ("subscriptions", "auto_renew"): ("BOOLEAN", False, {"false"}),
    ("instances", "template_id"): ("INTEGER", True, {None}),
    ("users", "updated_at"): ("TIMESTAMP WITH TIME ZONE", False, {"CURRENT_TIMESTAMP", "now()"}),
}


def load_revision(filename):
    spec = importlib.util.spec_from_file_location("frozen_" + filename[:-3], VERSIONS / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def expected_metadata(profile="fresh"):
    metadata = sa.MetaData()
    class Recorder:
        def create_table(self, name, *columns, **kwargs):
            return sa.Table(name, metadata, *columns, **kwargs)
        def create_index(self, name, table, columns, **kwargs):
            sa.Index(name, *(metadata.tables[table].c[c] for c in columns), **kwargs)
    for filename in ("0001_existing_core.py", "0002_billing_admin_recovery.py"):
        module = load_revision(filename)
        module.op = Recorder()
        module.context = SimpleNamespace(is_offline_mode=lambda: True)
        module.upgrade()
    from app.core.schema_profiles_v1 import apply_profile
    return apply_profile(metadata, profile)
