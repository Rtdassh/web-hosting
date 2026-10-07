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


if __name__ == "__main__":
    unittest.main()
