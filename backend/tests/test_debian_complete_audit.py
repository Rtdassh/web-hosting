"""Cumulative CLI regression: pre-d0001 evidence -> final d0004 snapshot.
Synthetic catalogs/SQL doubles only; no connection or migration is executed.
"""
import copy
import json
from contextlib import nullcontext
from unittest.mock import Mock, patch
import pytest
import sqlalchemy as sa
from alembic_debian import audit
from alembic_debian.contract import NEW, REVIEWED_INVENTORIES, expected_metadata
from alembic_debian.verify import ReconciliationBlocked
from alembic_debian.evidence import type_name
from tests.test_debian_reviewed_inventories import fixture
import tests.test_debian_reconciliation as history_tests

EMPTY='d41d8cd98f00b204e9800998ecf8427e'


def table_snapshot(table):
    return dict(columns=[dict(name=c.name,type=type_name(c.type),
        nullable=c.nullable,enum=None,default=None,identity=None,computed=None) for c in table.c],
        pk={'constrained_columns':[c.name for c in table.primary_key]},
        fk=[dict(name=f'{table.name}_{fk.parent.name}_fkey',constrained_columns=[fk.parent.name],
            referred_table=fk.column.table.name,referred_columns=[fk.column.name],referred_schema='public',
            options={'ondelete':fk.ondelete} if fk.ondelete else {}) for fk in table.foreign_keys],
        unique=[dict(column_names=[c.name for c in k.columns]) for k in table.constraints if isinstance(k,sa.UniqueConstraint)],
        indexes=[dict(name=i.name,column_names=[c.name for c in i.columns],unique=bool(i.unique)) for i in table.indexes],
        checks=[],rows=0,digest=EMPTY)


def snapshots(stage=4,inventory_index=1):
    original=fixture(REVIEWED_INVENTORIES[inventory_index])
    original['sequences']['users_id_seq']['last_value']=11 if inventory_index==1 else 7
    # Names exist in reflected catalogs, including the original payment FK.
    for name,table in original['tables'].items():
        for fk in table['fk']: fk['name']=f'{name}_{fk["constrained_columns"][0]}_fkey'
        for index in table['indexes']: index['name']='ix_'+name+'_'+'_'.join(index['column_names'])
    after=copy.deepcopy(original); frozen=expected_metadata('debian')
    for name in NEW | {'payment_transactions'}:
        shaped=table_snapshot(frozen.tables[name])
        for c in shaped['columns']: c['type']=type_name(frozen.tables[name].c[c['name']].type)
        if name=='payment_transactions':
            old_names={c['name'] for c in original['tables'][name]['columns']}
            shaped['columns']=[*copy.deepcopy(original['tables'][name]['columns']),*[c for c in shaped['columns'] if c['name'] not in old_names]]
            shaped['digest']=original['tables'][name]['digest']
            old_fk=copy.deepcopy(original['tables'][name]['fk'][0])
            shaped['fk']=[old_fk,*[f for f in shaped['fk'] if f['constrained_columns']!=['user_id']]]
        if name in NEW:
            next(c for c in shaped['columns'] if c['name']=='id')['default']=f"nextval('{name}_id_seq'::regclass)"
        after['tables'][name]=shaped
    for name in NEW:
        after['sequences'][name+'_id_seq']=dict(sequencename=name+'_id_seq',data_type='integer',
            start_value=1,min_value=1,max_value=2147483647,increment_by=1,cycle=False,last_value=1,is_called=False)
    if stage>=2:
        fk=next(f for f in after['tables']['admin_audit_logs']['fk'] if f['constrained_columns']==['target_instance_id'])
        fk.update(name='fk_admin_audit_logs_target_instance_id_instances',options={'ondelete':'SET NULL'})
    if stage>=3:
        for table,name,typ in [('subscriptions','current_period_start','TIMESTAMP WITH TIME ZONE'),('subscriptions','current_period_end','TIMESTAMP WITH TIME ZONE'),('invoices','pdf_metadata','JSONB')]:
            after['tables'][table]['columns'].append(dict(name=name,type=typ,nullable=True,default=None,identity=None,computed=None,enum=None))
        after['tables']['subscriptions']['digest']='digest-with-new-null-fields'
    if stage>=4:
        for name in ('invoices','payment_transactions'):
            fk=next(f for f in after['tables'][name]['fk'] if f['constrained_columns']==['user_id'])
            fk.update(name=audit.USER_FK_NAMES[name],options={'ondelete':'RESTRICT'})
        after['tables']['payment_transactions']['columns'].append(dict(name='plan_name_snapshot',type='VARCHAR(50)',nullable=True,default=None,identity=None,computed=None,enum=None))
        _,v4=history_tests.DebianOfflineTests._v4_preservation_snapshots()
        after['triggers']=v4['triggers']
    return original,after


class Result:
    def __init__(self,value=0): self.value=value
    def scalar_one(self): return self.value
    def scalar_one_or_none(self): return self.value
    def scalars(self): return self
    def all(self): return self.value


class Connection:
    def __init__(self,stage=4): self.stage=stage; self.statements=[]; self.written_new_fields=0; self.bad_function=False
    def __enter__(self): return self
    def __exit__(self,*args): pass
    def begin(self): return nullcontext()
    def execute(self,sql,params=None):
        text=str(sql); self.statements.append(text)
        if 'version_num' in text: return Result([audit.DEBIAN_STAGES[self.stage-1]])
        if 'p.prosrc' in text: return Result('wrong' if self.bad_function else "RAISE EXCEPTION 'Financial history is immutable.'; 55000")
        if 'pg_get_serial_sequence' in text: return Result(params['table']+'_id_seq')
        if ' IS NOT NULL' in text: return Result(self.written_new_fields)
        return Result()


def inspector_for(after):
    inspector=Mock()
    inspector.get_indexes.side_effect=lambda name,**kw:after['tables'][name]['indexes']
    inspector.get_unique_constraints.side_effect=lambda name,**kw:after['tables'][name]['unique']
    return inspector


def verify(original,after,stage=4,connection=None,historical_hashes=None):
    connection=connection or Connection(stage)
    def hash_without_fields(conn,name):
        return (after['tables'][name]['rows'], (historical_hashes or {}).get(name,original['tables'][name]['digest'])) if name in original['tables'] else (after['tables'][name]['rows'],EMPTY)
    with patch.object(audit,'capture',return_value=after), \
         patch.object(audit,'row_fingerprint_without_new_columns',side_effect=hash_without_fields), \
         patch('alembic_debian.reconcile.sa.inspect',return_value=inspector_for(after)):
        audit.verify_complete_chain(connection,original,audit.DEBIAN_STAGES[stage-1])
    return connection


def test_reproduces_the_reported_21_table_manifest_v4_failure():
    original,after=snapshots()
    assert len(original['tables'])==21 and len(after['tables'])==24  # plus alembic_version = 25
    with patch.object(audit,'capture',return_value=after):
        with pytest.raises(ReconciliationBlocked,match='Table inventory changed during V4'):
            audit.verify_after_v4(Connection(),original)


@pytest.mark.parametrize('stage',[1,2,3,4])
@pytest.mark.parametrize('inventory_index',[0,1])
def test_cumulative_stages_accept_original_evidence_without_mutating_it(stage,inventory_index):
    original,after=snapshots(stage,inventory_index); before=copy.deepcopy(original); live=copy.deepcopy(after)
    verify(original,after,stage)
    assert original==before and after==live


@pytest.mark.parametrize('failure',[
    'extra_table','missing_table','historical_data','legacy_column','original_sequence',
    'new_sequence','extra_sequence','financial_fk','audit_fk','new_column','new_column_default',
    'missing_trigger','disabled_trigger','wrong_trigger_table','wrong_trigger_function',
    'extra_trigger','new_rows','extra_fk','extra_check','function','new_fields_data','enum','event_trigger',
])
def test_unexpected_changes_are_not_hidden_by_normalization(failure):
    original,after=snapshots(); connection=Connection()
    if failure=='extra_table': after['tables']['unexpected']=copy.deepcopy(after['tables']['invoices'])
    elif failure=='missing_table': del after['tables']['roles']
    elif failure=='historical_data': after['tables']['users']['digest']='changed'
    elif failure=='legacy_column': after['tables']['users']['columns'][0]['nullable']=True
    elif failure=='original_sequence': after['sequences']['users_id_seq']['last_value']=12
    elif failure=='new_sequence': after['sequences']['invoices_id_seq']['is_called']=True
    elif failure=='extra_sequence': after['sequences']['unexpected_seq']={}
    elif failure in ('financial_fk','audit_fk'):
        table='invoices' if failure=='financial_fk' else 'admin_audit_logs'
        column='user_id' if failure=='financial_fk' else 'target_instance_id'
        next(f for f in after['tables'][table]['fk'] if f['constrained_columns']==[column])['options']={'ondelete':'CASCADE'}
    elif failure.startswith('new_column'):
        c=after['tables']['subscriptions']['columns'][-1]
        c['type']='TEXT' if failure=='new_column' else c['type']
        if failure=='new_column_default': c['default']='now()'
    elif failure=='missing_trigger': after['triggers'].pop()
    elif failure=='disabled_trigger': after['triggers'][0]['tgenabled']='D'
    elif failure=='wrong_trigger_table': after['triggers'][0]['table_name']='users'
    elif failure=='wrong_trigger_function': after['triggers'][0]['definition']='EXECUTE FUNCTION wrong()'
    elif failure=='extra_trigger': after['triggers'].append(dict(table_name='users',tgname='surprise',tgenabled='O',definition='surprise'))
    elif failure=='new_rows': after['tables']['invoices']['rows']=1
    elif failure=='extra_fk': after['tables']['invoices']['fk'].append(copy.deepcopy(after['tables']['invoices']['fk'][0]))
    elif failure=='extra_check': after['tables']['invoices']['checks']=[{'name':'surprise'}]
    elif failure=='function': connection.bad_function=True
    elif failure=='new_fields_data': connection.written_new_fields=1
    elif failure=='enum': after['enums'].append({'name':'unexpected','labels':[]})
    elif failure=='event_trigger': after['event_triggers']=[{'evtname':'surprise'}]
    with pytest.raises(ReconciliationBlocked): verify(original,after,connection=connection)


def test_main_routes_original_manifest_through_cumulative_verifier(tmp_path,monkeypatch,capsys):
    original,after=snapshots(); manifest=tmp_path/'before.json'; manifest.write_text(json.dumps(original))
    monkeypatch.setattr('sys.argv',['audit','--verify-after',str(manifest)])
    connection=Connection(); engine=Mock(); engine.connect.return_value=connection
    def hashes(conn,name): return (original['tables'][name]['rows'],original['tables'][name]['digest']) if name in original['tables'] else (0,EMPTY)
    with patch.object(audit,'migration_url',return_value='unused'),patch.object(audit.sa,'create_engine',return_value=engine), \
         patch.object(audit,'capture',return_value=after),patch.object(audit,'row_fingerprint_without_new_columns',side_effect=hashes), \
         patch('alembic_debian.reconcile.sa.inspect',return_value=inspector_for(after)):
        assert audit.main()==0
    assert 'Read-only verification OK' in capsys.readouterr().out
    assert any('READ ONLY' in sql for sql in connection.statements)
    assert all(sql.lstrip().startswith(('SELECT','SET TRANSACTION')) for sql in connection.statements)


@pytest.mark.parametrize('failure',['subscription_count','subscription_old_value','legacy_fk',
    'new_table_missing_column','new_id_default','new_regular_default','new_rls','legacy_trigger'])
def test_additional_preservation_checks(failure):
    original,after=snapshots(); hashes={}
    if failure=='subscription_count': after['tables']['subscriptions']['rows']+=1
    elif failure=='subscription_old_value': hashes['subscriptions']='changed-old-value'
    elif failure=='legacy_fk': after['tables']['instances']['fk'][0]['referred_table']='unexpected'
    elif failure=='new_table_missing_column': after['tables']['invoices']['columns'].pop(0)
    elif failure=='new_id_default': after['tables']['invoices']['columns'][0]['default']='42'
    elif failure=='new_regular_default': next(c for c in after['tables']['invoices']['columns'] if c['name']=='amount')['default']='0'
    elif failure=='new_rls': after['row_security']=[dict(relname='invoices',relrowsecurity=True,relforcerowsecurity=False)]
    elif failure=='legacy_trigger':
        original['triggers']=[dict(table_name='users',tgname='existing',tgenabled='O',definition='existing')]
    with pytest.raises(ReconciliationBlocked): verify(original,after,historical_hashes=hashes)
