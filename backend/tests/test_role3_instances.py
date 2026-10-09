import importlib
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import docker
from docker.errors import DockerException
from fastapi import HTTPException


# DockerService creates and pings its client at module import time.  Install the
# guard before importing (or reloading) either production module so this test
# module can never contact a real Docker daemon, regardless of import order.
with patch.object(
    docker,
    "from_env",
    side_effect=DockerException("Docker disabled by role 3 unit tests"),
) as _blocked_from_env:
    _docker_module_name = "app.services.docker_service"
    if _docker_module_name in sys.modules:
        importlib.reload(sys.modules[_docker_module_name])
    else:
        importlib.import_module(_docker_module_name)

    _instances_module_name = "app.api.v1.instances"
    if _instances_module_name in sys.modules:
        instances = importlib.reload(sys.modules[_instances_module_name])
    else:
        instances = importlib.import_module(_instances_module_name)

if _blocked_from_env.call_count < 1:
    raise RuntimeError("Docker import guard was not exercised")


InstanceStatus = instances.InstanceStatus
UserRole = instances.UserRole


def make_user(user_id=7):
    return SimpleNamespace(id=user_id, role=UserRole.CLIENT)


def make_instance(status=InstanceStatus.RUNNING):
    return SimpleNamespace(
        id=31,
        user_id=7,
        container_id="container-31",
        assigned_port=30031,
        storage_path="/srv/hosting/instancias/7_31",
        status=status,
    )


def make_db(*first_results):
    db = MagicMock(name="db_session")
    db.query.return_value.filter.return_value.first.side_effect = first_results
    return db


class Role3MetricsAndLogsTests(unittest.TestCase):
    def test_metrics_for_existing_authorized_instance_maps_docker_stats(self):
        instance = make_instance()
        subscription = SimpleNamespace(plan=SimpleNamespace(max_ram_mb=256))
        db = make_db(instance, subscription)
        stats = {
            "status": "running",
            "cpu_percent": 12.5,
            "memory_usage_mb": 64.25,
            "memory_limit_mb": 256.0,
            "memory_percent": 25.1,
        }

        with patch.object(
            instances.docker_service, "get_container_stats", return_value=stats
        ) as get_stats:
            response = instances.get_instance_metrics(31, make_user(), db)

        get_stats.assert_called_once_with("container-31", ram_limit_mb=256.0)
        self.assertEqual(response.instance_id, 31)
        self.assertEqual(response.status, InstanceStatus.RUNNING)
        self.assertEqual(response.cpu_percent, 12.5)
        self.assertEqual(response.memory_usage_mb, 64.25)
        self.assertEqual(response.memory_limit_mb, 256.0)
        self.assertEqual(response.memory_percent, 25.1)
        db.commit.assert_not_called()

    def test_logs_for_existing_authorized_instance_forwards_tail_exactly(self):
        instance = make_instance()
        db = make_db(instance)
        expected_lines = ["first", "second"]

        with patch.object(
            instances.docker_service,
            "get_container_logs",
            return_value=expected_lines,
        ) as get_logs:
            response = instances.get_instance_logs(31, 237, make_user(), db)

        get_logs.assert_called_once_with("container-31", tail=237)
        self.assertEqual(response.instance_id, 31)
        self.assertEqual(response.container_id, "container-31")
        self.assertEqual(response.total_lines, 2)
        self.assertEqual(response.lines, expected_lines)
        db.commit.assert_not_called()


class Role3SyncTests(unittest.TestCase):
    def test_status_change_updates_instance_adds_history_and_commits(self):
        instance = make_instance(InstanceStatus.RUNNING)
        db = make_db(instance)

        with (
            patch.object(
                instances.docker_service,
                "get_container_status",
                return_value="stopped",
            ) as get_status,
            patch.object(instances, "audit_action") as audit,
        ):
            response = instances.sync_instance_status(31, make_user(), db)

        get_status.assert_called_once_with("container-31")
        self.assertEqual(instance.status, InstanceStatus.STOPPED)
        self.assertTrue(response.synced)
        self.assertEqual(response.previous_status, InstanceStatus.RUNNING)
        self.assertEqual(response.current_status, InstanceStatus.STOPPED)
        db.commit.assert_called_once_with()
        db.refresh.assert_called_once_with(instance)
        db.rollback.assert_not_called()
        db.add.assert_called_once()
        history = db.add.call_args.args[0]
        self.assertIsInstance(history, instances.InstanceStatusHistory)
        self.assertEqual(history.instance_id, 31)
        self.assertEqual(history.previous_status, "running")
        self.assertEqual(history.new_status, "stopped")
        self.assertEqual(history.reason, "Docker status sync")
        audit.assert_called_once_with(7, 31, "sync", "success")

    def test_unchanged_status_does_not_add_or_commit(self):
        instance = make_instance(InstanceStatus.RUNNING)
        db = make_db(instance)

        with (
            patch.object(
                instances.docker_service,
                "get_container_status",
                return_value="running",
            ),
            patch.object(instances, "audit_action") as audit,
        ):
            response = instances.sync_instance_status(31, make_user(), db)

        self.assertFalse(response.synced)
        self.assertEqual(instance.status, InstanceStatus.RUNNING)
        db.add.assert_not_called()
        db.commit.assert_not_called()
        db.refresh.assert_not_called()
        db.rollback.assert_not_called()
        audit.assert_called_once_with(7, 31, "sync", "success")

    def test_docker_error_rolls_back_and_returns_502_without_write(self):
        instance = make_instance()
        db = make_db(instance)

        with (
            patch.object(
                instances.docker_service,
                "get_container_status",
                return_value="error",
            ),
            patch.object(instances, "audit_action") as audit,
        ):
            with self.assertRaises(HTTPException) as raised:
                instances.sync_instance_status(31, make_user(), db)

        self.assertEqual(raised.exception.status_code, 502)
        db.rollback.assert_called_once_with()
        db.add.assert_not_called()
        db.commit.assert_not_called()
        db.refresh.assert_not_called()
        audit.assert_called_once_with(7, 31, "sync", "failed")

    def test_not_found_maps_to_confirmed_failed_enum(self):
        self.assertEqual(InstanceStatus.FAILED.value, "failed")
        instance = make_instance(InstanceStatus.RUNNING)
        db = make_db(instance)

        with (
            patch.object(
                instances.docker_service,
                "get_container_status",
                return_value="not_found",
            ),
            patch.object(instances, "audit_action"),
        ):
            response = instances.sync_instance_status(31, make_user(), db)

        self.assertEqual(instance.status, InstanceStatus.FAILED)
        self.assertEqual(response.current_status, InstanceStatus.FAILED)
        self.assertTrue(response.synced)
        history = db.add.call_args.args[0]
        self.assertEqual(history.new_status, "failed")
        db.commit.assert_called_once_with()

    def test_commit_failure_rolls_back_and_returns_500(self):
        instance = make_instance(InstanceStatus.RUNNING)
        db = make_db(instance)
        db.commit.side_effect = RuntimeError("database write failed")

        with (
            patch.object(
                instances.docker_service,
                "get_container_status",
                return_value="stopped",
            ),
            patch.object(instances, "audit_action") as audit,
        ):
            with self.assertRaises(HTTPException) as raised:
                instances.sync_instance_status(31, make_user(), db)

        self.assertEqual(raised.exception.status_code, 500)
        db.add.assert_called_once()
        db.commit.assert_called_once_with()
        db.rollback.assert_called_once_with()
        db.refresh.assert_not_called()
        audit.assert_called_once_with(7, 31, "sync", "failed")


class Role3FailedLifecycleTests(unittest.TestCase):
    def test_each_false_action_returns_502_without_status_or_commit(self):
        cases = (
            ("start", "start_instance", InstanceStatus.STOPPED),
            ("stop", "stop_instance", InstanceStatus.RUNNING),
            ("restart", "restart_instance", InstanceStatus.STOPPED),
        )
        for action, method_name, initial_status in cases:
            with self.subTest(action=action):
                instance = make_instance(initial_status)
                db = make_db(instance)
                request = instances.InstanceActionRequest(action=action)

                with (
                    patch.object(
                        instances.docker_service, method_name, return_value=False
                    ) as operation,
                    patch.object(instances, "audit_action") as audit,
                ):
                    with self.assertRaises(HTTPException) as raised:
                        instances.instance_action(31, request, make_user(), db)

                self.assertEqual(raised.exception.status_code, 502)
                operation.assert_called_once_with("container-31")
                self.assertEqual(instance.status, initial_status)
                db.rollback.assert_called_once_with()
                db.add.assert_not_called()
                db.commit.assert_not_called()
                db.refresh.assert_not_called()
                audit.assert_called_once_with(7, 31, action, "failed")

    def test_failed_destroy_has_no_port_database_or_filesystem_side_effects(self):
        instance = make_instance()
        db = make_db(instance)

        with (
            patch.object(
                instances.docker_service, "remove_instance", return_value=False
            ) as remove,
            patch.object(instances.port_service, "release_port") as release_port,
            patch.object(instances, "audit_action") as audit,
            patch.object(instances, "Path") as path,
            patch.object(instances.shutil, "rmtree") as rmtree,
        ):
            with self.assertRaises(HTTPException) as raised:
                instances.destroy_instance(31, make_user(), db)

        self.assertEqual(raised.exception.status_code, 502)
        remove.assert_called_once_with("container-31")
        db.rollback.assert_called_once_with()
        release_port.assert_not_called()
        db.delete.assert_not_called()
        db.add.assert_not_called()
        db.commit.assert_not_called()
        path.assert_not_called()
        rmtree.assert_not_called()
        audit.assert_called_once_with(7, 31, "destroy", "failed")


if __name__ == "__main__":
    unittest.main()
