from types import SimpleNamespace
from unittest.mock import MagicMock
import pytest
from app.seed import update_plan_prices


def test_repricing_changes_only_catalog_prices():
    plans = [SimpleNamespace(name=n, price=p, max_instances=q) for n, p, q in [('Free', 0, 1), ('Developer', 9.99, 3), ('Pro', 24.99, 10)]]
    db = MagicMock()
    db.execute.return_value.scalars.return_value.all.return_value = plans
    assert update_plan_prices(db) == {'Free': 0.0, 'Developer': 4.99, 'Pro': 9.99}
    assert [p.price for p in plans] == [0, 4.99, 9.99]
    assert [p.max_instances for p in plans] == [1, 3, 10]
    db.commit.assert_not_called()


def test_incomplete_catalog_is_not_modified():
    plan = SimpleNamespace(name='Pro', price=24.99)
    db = MagicMock()
    db.execute.return_value.scalars.return_value.all.return_value = [plan]
    with pytest.raises(RuntimeError):
        update_plan_prices(db)
    assert plan.price == 24.99
    db.flush.assert_not_called()
