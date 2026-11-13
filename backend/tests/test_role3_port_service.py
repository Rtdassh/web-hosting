import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.services import port_service as port_service_module


class Role3PortServiceTests(unittest.TestCase):
    def test_release_port_without_commit_only_clears_allocation(self):
        allocation = SimpleNamespace(is_allocated=True, instance_id=31)
        db = MagicMock(name="db_session")
        db.query.return_value.filter.return_value.first.return_value = allocation

        with patch.object(port_service_module.socket, "socket") as socket:
            port_service_module.port_service.release_port(
                db, 30031, commit=False
            )

        self.assertFalse(allocation.is_allocated)
        self.assertIsNone(allocation.instance_id)
        db.query.assert_called_once_with(port_service_module.PortAllocation)
        db.query.return_value.filter.return_value.first.assert_called_once_with()
        db.commit.assert_not_called()
        db.add.assert_not_called()
        socket.assert_not_called()

    def test_get_and_reserve_port_skips_ports_already_in_instances(self):
        """Verifica que no se asigne un puerto si ya existe en la tabla instances (UniqueViolation prevention)."""
        db = MagicMock(name="db_session")

        # Supongamos que la tabla instances ya tiene el puerto 30002
        instance_ports_query = MagicMock()
        instance_ports_query.all.return_value = [(30002,)]

        # Supongamos que port_allocations tiene registros para 30002 y 30003
        rec30002 = SimpleNamespace(port_number=30002, is_allocated=False, instance_id=None)
        rec30003 = SimpleNamespace(port_number=30003, is_allocated=False, instance_id=None)
        alloc_query = MagicMock()
        alloc_query.filter.return_value.order_by.return_value.with_for_update.return_value.all.return_value = [
            rec30002, rec30003
        ]

        def query_side_effect(model):
            from app.models.instance import Instance
            if model is Instance.assigned_port:
                return instance_ports_query
            return alloc_query

        db.query.side_effect = query_side_effect

        with patch.object(port_service_module.PortService, "_is_port_free_on_host", return_value=True):
            assigned = port_service_module.port_service.get_and_reserve_available_port(db, instance_id=99)

        # Debe omitir 30002 y asignar 30003
        self.assertEqual(assigned, 30003)
        self.assertFalse(rec30002.is_allocated)
        self.assertTrue(rec30003.is_allocated)
        self.assertEqual(rec30003.instance_id, 99)
        db.commit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
