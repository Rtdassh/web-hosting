"""Reviewed historical sequence advance, without setval or a database connection."""
import copy
from unittest.mock import Mock, patch
import pytest

from alembic_debian.contract import NEW, REVIEWED_INVENTORIES
from alembic_debian.evidence import fingerprint
from alembic_debian.verify import validate_before, validate_preserved, ReconciliationBlocked
from alembic_debian.reconcile import upgrade
from tests.test_debian_reviewed_inventories import Connection, Result, fixture


@pytest.mark.parametrize('profile,value,called,increment,cycle,accepted', [
    (0,7,True,1,False,True),
    (0,11,True,1,False,False),  # no change to original three-instance contract
    (1,7,True,1,False,True),
    (1,11,True,1,False,True),
    (1,6,True,1,False,False),
    (1,8,True,1,False,False),
    (1,10,True,1,False,False),
    (1,12,True,1,False,False),
    (1,7,False,1,False,False),
    (1,11,False,1,False,False),
    (1,11,True,0,False,False),
    (1,11,True,-1,False,False),
    (1,11,True,2,False,False),
    (1,11,True,1,True,False),
])
def test_exact_sequence_values_and_states(profile,value,called,increment,cycle,accepted):
    inventory=REVIEWED_INVENTORIES[profile]; snapshot=fixture(inventory)
    snapshot['sequences']['users_id_seq'].update(last_value=value,is_called=called,
        increment_by=increment,cycle=cycle)
    if accepted: validate_before(Connection(inventory),snapshot)
    else:
        with pytest.raises(ReconciliationBlocked): validate_before(Connection(inventory),snapshot)


@pytest.mark.parametrize('failure',['missing_sequence','users_count','users_maximum','plans_sequence','subscriptions_sequence','instances_sequence','payment_called'])
def test_user_advance_does_not_waive_other_guards(failure):
    inventory=REVIEWED_INVENTORIES[1]; snapshot=fixture(inventory); connection=Connection(inventory)
    snapshot['sequences']['users_id_seq']['last_value']=11
    if failure=='missing_sequence': del snapshot['sequences']['users_id_seq']
    elif failure=='users_count': snapshot['tables']['users']['rows']=8
    elif failure=='users_maximum':
        execute=connection.execute
        connection.execute=lambda statement,params=None: Result(8) if 'SELECT max(id) FROM public.users' in str(statement) else execute(statement,params)
    elif failure=='payment_called': snapshot['sequences']['payment_transactions_id_seq']['is_called']=True
    else: snapshot['sequences'][failure.replace('_sequence','_id_seq')]['last_value']+=1
    with pytest.raises(ReconciliationBlocked): validate_before(connection,snapshot)


@pytest.mark.parametrize('failure',[None,'wrong_sha','live_sequence_drift'])
def test_manifest_guards_with_reviewed_users_11(failure):
    inventory=REVIEWED_INVENTORIES[1]; evidence=fixture(inventory)
    evidence['sequences']['users_id_seq']['last_value']=11
    current=copy.deepcopy(evidence); digest=fingerprint(evidence)
    if failure=='wrong_sha': digest='0'*64
    if failure=='live_sequence_drift': current['sequences']['users_id_seq']['last_value']=12
    operations=Mock(); inspector=Mock(); inspector.get_table_names.return_value=list(evidence['tables'])
    with patch('alembic_debian.reconcile.sa.inspect',return_value=inspector), \
         patch('alembic_debian.reconcile.capture',return_value=current), \
         patch('alembic_debian.reconcile.verify_after') as postcheck:
        if failure:
            with pytest.raises(ReconciliationBlocked): upgrade(Connection(inventory),operations,evidence,digest)
            assert not operations.mock_calls
        else:
            upgrade(Connection(inventory),operations,evidence,digest)
            assert operations.add_column.call_count==4
            postcheck.assert_called_once()


@pytest.mark.parametrize('failure',[None,'reset_to_7','advanced_to_12','called_changed','user_data_changed'])
def test_preservation_requires_the_original_users_11_after_adoption(failure):
    before=fixture(REVIEWED_INVENTORIES[1]); before['sequences']['users_id_seq']['last_value']=11
    after=copy.deepcopy(before); after['tables'].update({name:{} for name in NEW})
    if failure=='reset_to_7': after['sequences']['users_id_seq']['last_value']=7
    elif failure=='advanced_to_12': after['sequences']['users_id_seq']['last_value']=12
    elif failure=='called_changed': after['sequences']['users_id_seq']['is_called']=False
    elif failure=='user_data_changed': after['tables']['users']['digest']='modified'
    if failure:
        with pytest.raises(ReconciliationBlocked): validate_preserved(before,after)
    else: validate_preserved(before,after)
