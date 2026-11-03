#!/usr/bin/env python3
"""Confirm target BEFORE connection; PostgreSQL enforces read-only transactions.
Run from backend with its venv: python tools/diagnose_debian_readonly.py --help
No DDL/DML, stamp, seed, nextval, restore or migration command is executed.
"""
import argparse
import getpass
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import sqlalchemy as sa
from sqlalchemy.engine import URL
from app.core.database import Base
import app.models  # register metadata only; no startup
from app.core.schema_profiles import metadata_for_profile
from alembic_debian.evidence import capture, session_settings, fingerprint, type_name
from alembic_debian.verify import validate_before, ReconciliationBlocked
from alembic_financial_history import ROW_TRIGGERS, TRUNCATE_TRIGGERS


def compare(snapshot, metadata):
    tables = snapshot['tables']
    missing_tables, missing_columns, different_columns, different_fks = [], {}, {}, {}
    for table in metadata.sorted_tables:
        if table.name not in tables:
            missing_tables.append(table.name)
            continue
        actual = {c['name']: c for c in tables[table.name]['columns']}
        missing = sorted(set(table.c.keys()) - set(actual))
        if missing: missing_columns[table.name] = missing
        differences = []
        for column in table.c:
            if column.name not in actual: continue
            found = actual[column.name]
            wanted = dict(type=type_name(column.type), nullable=column.nullable)
            observed = dict(type=found['type'], nullable=found['nullable'])
            if wanted != observed:
                differences.append(dict(column=column.name, expected=wanted, observed=observed))
        if differences: different_columns[table.name] = differences
        for fk in table.foreign_keys:
            matching = [f for f in tables[table.name]['fk'] if f['constrained_columns'] == [fk.parent.name]]
            if not any(f['referred_table'] == fk.column.table.name
                       and f['referred_columns'] == [fk.column.name]
                       and (f.get('options', {}).get('ondelete') or 'NO ACTION') == (fk.ondelete or 'NO ACTION') for f in matching):
                different_fks.setdefault(table.name, []).append(dict(column=fk.parent.name,
                    expected_target=f'{fk.column.table.name}.{fk.column.name}',
                    expected_ondelete=fk.ondelete or 'NO ACTION', observed=matching))
    return dict(missing_tables=missing_tables, missing_columns=missing_columns,
                different_columns=different_columns, missing_or_different_fks=different_fks)


def integrity(connection, snapshot):
    tables=snapshot['tables']; results={}
    def available(table, *columns):
        return table in tables and set(columns) <= {c['name'] for c in tables[table]['columns']}
    def count(name, sql): results[name]=connection.execute(sa.text(sql)).scalar_one()
    if available('subscriptions','user_id','status'):
        count('users_with_multiple_active_subscriptions', "SELECT count(*) FROM (SELECT user_id FROM public.subscriptions WHERE status='active' GROUP BY user_id HAVING count(*)>1) x")
    for child, column, parent in [('subscriptions','user_id','users'),('subscriptions','plan_id','plans'),('instances','user_id','users'),('payment_transactions','user_id','users'),('payment_transactions','plan_id','plans'),('invoices','user_id','users'),('invoices','transaction_id','payment_transactions')]:
        if available(child,column) and available(parent,'id'):
            count(f'orphan_{child}_{column}',f'SELECT count(*) FROM public.{child} c LEFT JOIN public.{parent} p ON p.id=c.{column} WHERE p.id IS NULL')
    if available('instances','id','assigned_port') and available('port_allocations','port_number','instance_id','is_allocated'):
        count('instances_without_matching_port', 'SELECT count(*) FROM public.instances i LEFT JOIN public.port_allocations p ON p.port_number=i.assigned_port AND p.instance_id=i.id AND p.is_allocated=true WHERE p.port_number IS NULL')
        count('allocated_ports_without_instance', 'SELECT count(*) FROM public.port_allocations p LEFT JOIN public.instances i ON i.id=p.instance_id WHERE p.is_allocated=true AND i.id IS NULL')
        count('unallocated_ports_with_instance', 'SELECT count(*) FROM public.port_allocations WHERE is_allocated=false AND instance_id IS NOT NULL')
    if available('plans','name','is_active'):
        count('active_free_plans', "SELECT count(*) FROM public.plans WHERE name='Free' AND is_active=true")
    if available('subscriptions','plan_id','status') and available('plans','id','name'):
        cols={c['name'] for c in tables['subscriptions']['columns']}
        dates=[f's.{c}' for c in ('current_period_end','end_date') if c in cols]
        if dates:
            expr=dates[0] if len(dates)==1 else 'COALESCE('+','.join(dates)+')'
            count('active_paid_subscriptions_without_end_date', f"SELECT count(*) FROM public.subscriptions s JOIN public.plans p ON p.id=s.plan_id WHERE s.status='active' AND lower(p.name)<>'free' AND {expr} IS NULL")
            count('expired_active_paid_subscriptions', f"SELECT count(*) FROM public.subscriptions s JOIN public.plans p ON p.id=s.plan_id WHERE s.status='active' AND lower(p.name)<>'free' AND {expr}<=CURRENT_TIMESTAMP")
    return results


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', required=True)
    parser.add_argument('--port', type=int, default=5432)
    parser.add_argument('--database', required=True)
    parser.add_argument('--user', required=True)
    parser.add_argument('--output', default='codrop-debian-'+datetime.now().strftime('%Y%m%d_%H%M%S')+'.json')
    args=parser.parse_args()
    print(f'Servidor solicitado: {args.host}:{args.port}\nBase: {args.database}\nUsuario: {args.user}\nModo: SOLO LECTURA')
    if input('Confirma estos tres datos escribiendo LEER (no se ha conectado aún): ').strip() != 'LEER':
        raise SystemExit('Cancelado sin conexión.')
    password=os.environ.get('PGPASSWORD') or getpass.getpass('Contraseña PostgreSQL (no se mostrará): ')
    engine=sa.create_engine(URL.create('postgresql+psycopg2',host=args.host,port=args.port,
        database=args.database,username=args.user,password=password), hide_parameters=True,
        connect_args={'connect_timeout':10, 'options':'-c default_transaction_read_only=on -c timezone=UTC -c statement_timeout=60000 -c lock_timeout=3000'})
    try:
        with engine.connect().execution_options(isolation_level='REPEATABLE READ') as connection:
            with connection.begin():
                identity=dict(connection.execute(sa.text("SELECT current_database() AS database, current_user AS username, inet_server_addr()::text AS server_address, inet_server_port() AS server_port, current_setting('server_version') AS postgres_version, current_setting('transaction_read_only') AS readonly")).mappings().one())
                if identity['database'] != args.database or identity['username'] != args.user or identity['readonly'] != 'on':
                    raise RuntimeError('La identidad o el modo de lectura no coincide; diagnóstico cancelado.')
                print('Identidad efectiva:',json.dumps(identity))
                session_settings(connection)
                snapshot=capture(connection)
                inspector=sa.inspect(connection)
                version=connection.execute(sa.text('SELECT version_num FROM public.alembic_version')).scalars().all() if inspector.has_table('alembic_version',schema='public') else []
                # SAVEPOINT isolates a failed validation from the remaining read-only report.
                try:
                    with connection.begin_nested(): validate_before(connection,snapshot)
                    adoption=dict(applicable=True, reason='Precheck oficial d0001 satisfecho; no se ejecutó migración.')
                except Exception as error:
                    adoption=dict(applicable=False, reason=str(error)[:1500])
                financial=[dict(table=t,name=n,present=any(x['table_name']==t and x['tgname']==n and x['tgenabled']=='O' for x in snapshot['triggers'])) for t,n in [*ROW_TRIGGERS.items(),*TRUNCATE_TRIGGERS.items()]]
                report=dict(captured_at=datetime.now(timezone.utc).isoformat(), identity=identity,
                    requested_target=dict(host=args.host,port=args.port,database=args.database,user=args.user),
                    alembic_versions=version, official_target='d0004_financial_history',
                    official_debian_diff=compare(snapshot,metadata_for_profile(Base.metadata,'debian')),
                    orm_diff=compare(snapshot,Base.metadata), d0001_precheck=adoption,
                    financial_triggers=financial, integrity=integrity(connection,snapshot),
                    evidence_sha256=fingerprint(snapshot), evidence=snapshot)
                # Transaction contains SELECTs and session settings only, PostgreSQL enforces it.
        with open(args.output,'x',encoding='utf-8') as output:
            json.dump(report,output,indent=2,ensure_ascii=False)
        print(f'Diagnóstico guardado: {args.output}; no contiene contraseñas ni filas de usuarios.')
    finally: engine.dispose()

if __name__=='__main__': main()
