"""Read-only tool target confirmation and schema comparison, without a DB."""
import importlib.util
from pathlib import Path
from unittest.mock import Mock
import pytest
import sqlalchemy as sa

TOOLS=Path(__file__).resolve().parents[1]/'tools'/'diagnose_debian_readonly.py'

def load_tool():
    spec=importlib.util.spec_from_file_location('codrop_readonly_tool',TOOLS)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def test_refused_confirmation_never_connects(monkeypatch):
    module=load_tool()
    monkeypatch.setattr('sys.argv',['diagnose','--host','synthetic.invalid','--database','synthetic','--user','synthetic'])
    monkeypatch.setattr('builtins.input',lambda _: 'NO')
    connect=Mock(); monkeypatch.setattr(module.sa,'create_engine',connect)
    with pytest.raises(SystemExit): module.main()
    connect.assert_not_called()


def test_schema_comparison_lists_missing_tables_columns_and_fk():
    module=load_tool()
    metadata=sa.MetaData()
    sa.Table('users',metadata,sa.Column('id',sa.Integer,primary_key=True))
    sa.Table('invoices',metadata,sa.Column('id',sa.Integer,primary_key=True),sa.Column('user_id',sa.Integer,sa.ForeignKey('users.id',ondelete='RESTRICT')))
    snapshot={'tables':{'invoices':{'columns':[{'name':'id','type':'INTEGER','nullable':False}], 'fk':[]}}}
    result=module.compare(snapshot,metadata)
    assert result['missing_tables']==['users']
    assert result['missing_columns']['invoices']==['user_id']
    assert result['missing_or_different_fks']['invoices'][0]['expected_ondelete']=='RESTRICT'


def test_docker_diagnostic_never_exports_environment_or_backend_logs(tmp_path,monkeypatch):
    import json
    from types import SimpleNamespace
    path=TOOLS.parents[2]/'infra/scripts/diagnose_docker_readonly.py'
    spec=importlib.util.spec_from_file_location('codrop_docker_tool',path)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    output=tmp_path/'docker.json'
    monkeypatch.setattr('sys.argv',['diagnose','--output',str(output)])
    calls=[]
    def run(command,**kwargs):
        calls.append(command)
        args=command[1:]
        if args==['context','show']: return SimpleNamespace(stdout='default\n')
        if args==['ps','-aq']: return SimpleNamespace(stdout='site\nbackend\n')
        if args[0]=='inspect':
            is_site=args[1]=='site'
            data={'Name':'/paas_web_test' if is_site else '/paas_backend_custom',
                'Config':{'Image':'nginx' if is_site else 'custom-backend','Labels':{},'Env':['SECRET_KEY=DO_NOT_EXPORT']},
                'State':{'Status':'exited','ExitCode':1},'HostConfig':{}}
            return SimpleNamespace(stdout=json.dumps([data]))
        if args[0]=='logs':
            assert args[-1]=='site'
            return SimpleNamespace(stdout='nginx: permission denied\n',stderr='token=REDACT_THIS')
        raise AssertionError(command)
    monkeypatch.setattr(module.subprocess,'run',run)
    module.main()
    content=output.read_text()
    assert 'DO_NOT_EXPORT' not in content
    assert 'REDACT_THIS' not in content
    assert 'permission denied' in content
    assert not any(x in command for command in calls for x in ('restart','rm','exec','stop'))
