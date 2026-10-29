"""Version guard and safe diagnostic reads of VARCHAR labels. No Debian connection."""
import os
from pathlib import Path
from types import SimpleNamespace
import unittest

import sqlalchemy as sa
from sqlalchemy.engine import URL
from alembic_debian.verify import validate_server, ReconciliationBlocked

SQL = Path(__file__).resolve().parents[2] / "docs/sql/debian_diagnostico_unificado_readonly.sql"


class VersionGuardTests(unittest.TestCase):
    def test_accepts_16_and_17_without_accepting_unknown_versions(self):
        for version in ((16, 0), (17, 11)):
            validate_server(SimpleNamespace(dialect=SimpleNamespace(name="postgresql", server_version_info=version)))
        for name, version in (("postgresql", (18, 0)), ("postgresql", None), ("sqlite", (17, 0))):
            with self.assertRaises(ReconciliationBlocked):
                validate_server(SimpleNamespace(dialect=SimpleNamespace(name=name, server_version_info=version)))


@unittest.skipUnless(os.environ.get("CODROP_RUN_MIGRATION_TESTS") == "1", "Requires isolated PostgreSQL fixture")
class TextDiagnosticTests(unittest.TestCase):
    def test_varchar_checks_run_and_still_reject_invalid_labels(self):
        password = os.environ.get("CODROP_TEST_POSTGRES_PASSWORD")
        self.assertTrue(password)
        engine = sa.create_engine(URL.create("postgresql+psycopg2", username="codrop_migration_test", password=password,
                                             host="127.0.0.1", port=55432, database="codrop_diagnostic_text"), hide_parameters=True)
        self.addCleanup(engine.dispose)
        with engine.connect() as connection:
            self.assertEqual(sa.inspect(connection).get_table_names(schema="public"), [])
            connection.rollback()
            metadata = sa.MetaData()
            users = sa.Table("users", metadata, sa.Column("id", sa.Integer(), primary_key=True),
                             sa.Column("role", sa.String(20), nullable=False))
            instances = sa.Table("instances", metadata, sa.Column("id", sa.Integer(), primary_key=True),
                                 sa.Column("status", sa.String(20), nullable=False))
            # Deliberately minimal synthetic schema, not a reconstruction of Debian.
            metadata.create_all(connection)
            connection.execute(users.insert(), [{"role": "ADMIN"}, {"role": "CLIENT"}])
            connection.execute(instances.insert(), [{"status": s} for s in ("PENDING", "RUNNING", "STOPPED", "FAILED")])
            connection.commit()
            query = sa.text(SQL.read_text(encoding="utf-8"))
            def report():
                with connection.begin():
                    connection.execute(sa.text("SET TRANSACTION READ ONLY"))
                    return [dict(row) for row in connection.execute(query).mappings()]
            def label_checks(rows):
                return [r for r in rows if r["categoria"] == "datos" and r["verificacion"] in
                        {"Roles fuera del enum del ORM", "Estados fuera del enum del ORM"}]
            rows = report()
            self.assertEqual(len(label_checks(rows)), 2)
            self.assertTrue(all(r["resultado"] == "OK" for r in label_checks(rows)))
            self.assertTrue(any(r["categoria"] == "columnas" and r["elemento"] == "users.role"
                                and r["resultado"] == "BLOQUEO_D0001" for r in rows))
            # Readability must not be confused with ORM enum compatibility.
            connection.execute(users.insert().values(role="client"))
            connection.execute(instances.insert().values(status="unrecognized"))
            connection.commit()
            self.assertTrue(all(r["resultado"] == "BLOQUEO_D0001" for r in label_checks(report())))
            version_row = next(r for r in rows if r["categoria"] == "contexto" and r["verificacion"] == "Version PostgreSQL")
            self.assertEqual(version_row["resultado"], "OK")
            print("Diagnostic tested on PostgreSQL", connection.dialect.server_version_info)


if __name__ == "__main__":
    unittest.main()
