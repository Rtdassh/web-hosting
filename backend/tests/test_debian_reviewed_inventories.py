"""Full preflight on synthetic catalogs; no PostgreSQL or Docker contacted."""
import copy
from unittest.mock import Mock, patch
import pytest
import sqlalchemy as sa
from alembic_debian.contract import (CORE, LEGACY, NEW, COUNTS, ASSIGNMENTS, EXTRAS,
    LEGACY_PHYSICAL, PAYMENT_OLD, REVIEWED_INVENTORIES, expected_metadata)
from alembic_debian.evidence import fingerprint, type_name
from alembic_debian.verify import validate_before, validate_preserved, ReconciliationBlocked
from alembic_debian.reconcile import upgrade


class Result:
    def __init__(self,value=0): self.value=value
    def scalar_one(self): return self.value
    def first(self): return None
    def __iter__(self): return iter(self.value)


class Connection:
    dialect=sa.dialects.postgresql.dialect()
    dialect.server_version_info=(17,11)
    def __init__(self,inventory):
        self.assignments=list(inventory.assignments)
        self.invalid_running=0
    def execute(self,statement,params=None):
        sql=str(statement)
        if 'SELECT i.id, i.assigned_port' in sql: return Result(self.assignments)
        if "status::text <> 'RUNNING'" in sql: return Result(self.invalid_running)
        if 'pg_get_serial_sequence' in sql:
            return Result((params or {}).get('table','public.payment_transactions')+'_id_seq')
        if 'SELECT max(id)' in sql:
            return Result({'users':7,'plans':3,'subscriptions':7,'instances':22}[sql.split('public.')[1]])
        if 'SELECT EXISTS' in sql: return Result(True)
        return Result(0)


def fixture(inventory):
    wanted=expected_metadata('debian'); tables={}
    for name in CORE | LEGACY:
        table=wanted.tables.get(name)
        cols=[] if table is None else [dict(name=c.name,type=type_name(c.type),enum=None,
            nullable=c.nullable,default=None,identity=None,computed=None)
            for c in table.c if name!='payment_transactions' or c.name in PAYMENT_OLD]
        fks=[] if table is None else [dict(constrained_columns=[fk.parent.name],
            referred_table=fk.column.table.name,referred_columns=[fk.column.name],
            referred_schema=None,options={'ondelete':fk.ondelete})
            for fk in table.foreign_keys if name!='payment_transactions' or fk.parent.name in PAYMENT_OLD]
        for extra in EXTRAS.get(name,set()):
            typ,nullable,defaults=LEGACY_PHYSICAL[name,extra]
            cols.append(dict(name=extra,type=typ,enum=None,nullable=nullable,
                default=sorted(defaults,key=repr)[0],identity=None,computed=None))
        if name=='instances':
            fks.append(dict(constrained_columns=['template_id'],referred_table='templates',
                referred_columns=['id'],referred_schema=None,options={'ondelete':'SET NULL'}))
        tables[name]=dict(columns=cols,pk={'constrained_columns':[] if table is None else [c.name for c in table.primary_key]},
            fk=fks,unique=[] if table is None else [dict(column_names=[c.name for c in k.columns]) for k in table.constraints if isinstance(k,sa.UniqueConstraint)],
            indexes=[] if table is None else [dict(column_names=[c.name for c in idx.columns],unique=idx.unique) for idx in table.indexes],
            checks=[],rows=COUNTS.get(name,0),digest='synthetic-history-'+name)
    tables['instances']['rows']=inventory.instance_count
    seqs={t+'_id_seq':dict(last_value=m,is_called=True,increment_by=1,cycle=False)
        for t,m in [('users',7),('plans',3),('subscriptions',7),('instances',22)]}
    seqs['payment_transactions_id_seq']=dict(last_value=1,is_called=False,increment_by=1,cycle=False)
    return dict(tables=tables,sequences=seqs,triggers=[],row_security=[],event_triggers=[],enums=[
        dict(name='userrole',labels=['ADMIN','CLIENT']),
        dict(name='instancestatus',labels=['PENDING','RUNNING','STOPPED','FAILED'])])


@pytest.mark.parametrize('inventory',REVIEWED_INVENTORIES,ids=lambda x:x.name)
def test_accepts_complete_reviewed_inventory(inventory):
    validate_before(Connection(inventory),fixture(inventory))
    assert COUNTS['instances']==3
    assert ASSIGNMENTS==[(14,30002),(19,30001),(22,30003)]


@pytest.mark.parametrize('inventory',REVIEWED_INVENTORIES,ids=lambda x:x.name)
@pytest.mark.parametrize('failure',['assignment','orphan_port','users_count','instance_count','sequence_value','sequence_called','payment_rows','template_fk','enum'])
def test_rejects_drift_in_either_inventory(inventory,failure):
    snapshot=fixture(inventory); connection=Connection(inventory)
    if failure=='assignment': connection.assignments[0]=(14,30001)
    elif failure=='orphan_port': connection.assignments.pop()
    elif failure=='users_count': snapshot['tables']['users']['rows']=8
    elif failure=='instance_count': snapshot['tables']['instances']['rows']=1
    elif failure=='sequence_value': snapshot['sequences']['instances_id_seq']['last_value']=21
    elif failure=='sequence_called': snapshot['sequences']['instances_id_seq']['is_called']=False
    elif failure=='payment_rows': snapshot['tables']['payment_transactions']['rows']=1
    elif failure=='template_fk': snapshot['tables']['instances']['fk']=[f for f in snapshot['tables']['instances']['fk'] if f['constrained_columns']!=['template_id']]
    else: snapshot['enums'][0]['labels']=['client']
    with pytest.raises(ReconciliationBlocked): validate_before(connection,snapshot)


def test_two_instance_profile_rejects_mixed_assignments_and_non_running():
    inventory=REVIEWED_INVENTORIES[1]
    for assignments,bad_states in [([(14,30002),(19,30001)],0),(ASSIGNMENTS,0),(list(inventory.assignments),1)]:
        connection=Connection(inventory); connection.assignments=assignments; connection.invalid_running=bad_states
        with pytest.raises(ReconciliationBlocked): validate_before(connection,fixture(inventory))


@pytest.mark.parametrize('inventory',REVIEWED_INVENTORIES,ids=lambda x:x.name)
@pytest.mark.parametrize('failure',['sha','data','sequence'])
def test_upgrade_rejects_wrong_sha_or_manifest_drift_before_ddl(inventory,failure):
    evidence=fixture(inventory); current=copy.deepcopy(evidence); digest=fingerprint(evidence)
    if failure=='sha': digest='0'*64
    elif failure=='data': current['tables']['instances']['digest']='changed'
    else: current['sequences']['instances_id_seq']['last_value']=23
    operations=Mock(); inspector=Mock(); inspector.get_table_names.return_value=list(evidence['tables'])
    with patch('alembic_debian.reconcile.sa.inspect',return_value=inspector), patch('alembic_debian.reconcile.capture',return_value=current):
        with pytest.raises(ReconciliationBlocked): upgrade(Connection(inventory),operations,evidence,digest)
    assert not operations.mock_calls


@pytest.mark.parametrize('inventory',REVIEWED_INVENTORIES,ids=lambda x:x.name)
@pytest.mark.parametrize('failure',[None,'rows','sequence','legacy_table'])
def test_postcheck_preserves_history_for_both_inventories(inventory,failure):
    before=fixture(inventory); after=copy.deepcopy(before)
    after['tables'].update({name:{} for name in NEW})
    if failure=='rows': after['tables']['instances']['digest']='changed'
    elif failure=='sequence': after['sequences']['instances_id_seq']['last_value']=23
    elif failure=='legacy_table': del after['tables']['asignacion_puertos']
    if failure:
        with pytest.raises(ReconciliationBlocked): validate_preserved(before,after)
    else: validate_preserved(before,after)


@pytest.mark.parametrize('inventory',REVIEWED_INVENTORIES,ids=lambda x:x.name)
def test_upgrade_accepts_matching_sha_and_live_snapshot(inventory):
    evidence=fixture(inventory); operations=Mock(); inspector=Mock()
    inspector.get_table_names.return_value=list(evidence['tables'])
    with patch('alembic_debian.reconcile.sa.inspect',return_value=inspector), \
         patch('alembic_debian.reconcile.capture',return_value=copy.deepcopy(evidence)), \
         patch('alembic_debian.reconcile.verify_after') as postcheck:
        upgrade(Connection(inventory),operations,evidence,fingerprint(evidence))
    assert operations.add_column.call_count==4
    assert operations.create_table.call_count==3
    postcheck.assert_called_once()
    assert postcheck.call_args.args[1]==evidence


def test_historical_scenario_keeps_its_original_state_policy():
    inventory=REVIEWED_INVENTORIES[0]
    connection=Connection(inventory); connection.invalid_running=1
    validate_before(connection,fixture(inventory))
