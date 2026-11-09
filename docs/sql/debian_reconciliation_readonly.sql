-- Supplement to alembic_preflight_readonly.sql. Only SELECT statements.
-- Run in a read-only DataGrip connection. No password hashes, tokens or full rows.
SELECT current_database(), current_schema(), current_setting('search_path');

SELECT table_name, column_name, data_type, udt_schema, udt_name,
       character_maximum_length, numeric_precision, numeric_scale,
       datetime_precision, is_nullable, column_default, is_identity,
       identity_generation, is_generated, generation_expression
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('users','plans','subscriptions','instances','payment_transactions','templates')
ORDER BY table_name, ordinal_position;

SELECT c.relname AS table_name, k.conname, k.contype, k.convalidated,
       pg_get_constraintdef(k.oid, true) AS definition
FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
ORDER BY c.relname, k.conname;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname;

SELECT n.nspname, t.typname, e.enumsortorder, e.enumlabel
FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
JOIN pg_enum e ON e.enumtypid=t.oid
WHERE n.nspname='public' ORDER BY t.typname, e.enumsortorder;

-- A NULL pg_sequences.last_value does not distinguish an unused sequence from
-- lack of privileges. Generate SELECTs of last_value/is_called without advancing it.
SELECT format('SELECT %L AS sequence_name, last_value, is_called FROM %I.%I;',
              schemaname || '.' || sequencename, schemaname, sequencename) AS readonly_query
FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename;

SELECT v.table_name, pg_get_serial_sequence('public.' || v.table_name, 'id') AS owned_id_sequence
FROM (VALUES ('users'),('plans'),('subscriptions'),('instances'),('payment_transactions')) v(table_name);

SELECT n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname;

SELECT evtname, evtevent, evtenabled FROM pg_event_trigger ORDER BY evtname;

SELECT c.relname, t.tgname, t.tgenabled, pg_get_triggerdef(t.oid, true)
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname, t.tgname;

-- Include incoming dependencies, especially views/functions/constraints involving
-- payment_transactions.status. Dynamic SQL and external consumers need manual review.
SELECT DISTINCT c.relname AS referenced_table, a.attname AS referenced_column,
       pg_describe_object(d.classid, d.objid, d.objsubid) AS dependent_object, d.deptype
FROM pg_depend d
JOIN pg_class c ON d.refclassid='pg_class'::regclass AND d.refobjid=c.oid
JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=d.refobjsubid
WHERE n.nspname='public' ORDER BY c.relname, a.attname, dependent_object;

SELECT count(*) AS payment_rows FROM public.payment_transactions;
SELECT i.id, i.assigned_port, i.template_id, p.is_allocated, p.instance_id
FROM public.instances i LEFT JOIN public.port_allocations p ON p.port_number=i.assigned_port
ORDER BY i.id;

SELECT user_id, count(*) AS active_subscriptions
FROM public.subscriptions WHERE status='active'
GROUP BY user_id HAVING count(*)>1;
