-- DataGrip: execute on the intended database using a read-only connection.
-- No application secrets, password hashes or tokens are selected.
SELECT current_database() AS database_name, current_schema() AS current_schema,
       current_setting('search_path') AS search_path, version() AS postgres_version;

SELECT n.nspname AS schema_name, c.relname AS relation_name, c.relkind
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
ORDER BY c.relname;

SELECT n.nspname AS schema_name, c.relname AS table_name, a.attnum,
       a.attname AS column_name, format_type(a.atttypid, a.atttypmod) AS data_type,
       a.attnotnull, a.attidentity, a.attgenerated,
       pg_get_expr(d.adbin, d.adrelid) AS default_expression
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;

SELECT n.nspname AS schema_name, c.relname AS table_name,
       k.conname, k.contype, k.convalidated,
       rn.nspname AS referenced_schema, rc.relname AS referenced_table,
       pg_get_constraintdef(k.oid, true) AS definition
FROM pg_constraint k
JOIN pg_class c ON c.oid = k.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_class rc ON rc.oid = k.confrelid
LEFT JOIN pg_namespace rn ON rn.oid = rc.relnamespace
WHERE n.nspname = 'public' OR rn.nspname = 'public'
ORDER BY n.nspname, c.relname, k.conname;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

SELECT n.nspname AS schema_name, t.typname, e.enumsortorder, e.enumlabel
FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname = 'public' ORDER BY t.typname, e.enumsortorder;

SELECT n.nspname AS schema_name, c.relname AS table_name, t.tgname,
       t.tgenabled, pg_get_triggerdef(t.oid, true) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal ORDER BY c.relname, t.tgname;

SELECT DISTINCT n.nspname AS referenced_schema, c.relname AS referenced_table,
       pg_describe_object(d.classid, d.objid, d.objsubid) AS dependent_object,
       d.deptype
FROM pg_depend d
JOIN pg_class c ON d.refclassid = 'pg_class'::regclass AND d.refobjid = c.oid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
ORDER BY referenced_table, dependent_object;

-- Read sequence state without calling nextval/setval.
SELECT schemaname, sequencename, data_type, start_value, min_value, max_value,
       increment_by, cycle, last_value
FROM pg_sequences WHERE schemaname = 'public' ORDER BY sequencename;

-- Generate exact count SELECTs for all public tables; execute generated SELECTs separately.
SELECT format('SELECT %L AS table_name, count(*) AS exact_rows FROM %I.%I;',
              n.nspname || '.' || c.relname, n.nspname, c.relname) AS count_query
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition
ORDER BY c.relname;

-- These columns are expected by the current models; run after checking their existence.
SELECT i.id AS instance_id, i.assigned_port, p.port_number,
       p.is_allocated, p.instance_id AS allocation_instance_id
FROM public.instances i LEFT JOIN public.port_allocations p
  ON p.port_number = i.assigned_port ORDER BY i.id;

SELECT port_number, is_allocated, instance_id
FROM public.port_allocations ORDER BY port_number;

SELECT user_id, count(*) AS active_subscriptions
FROM public.subscriptions WHERE status = 'active'
GROUP BY user_id HAVING count(*) > 1;

-- Compare these maxima with the sequence inventory; do not advance sequences.
SELECT 'users' AS table_name, max(id) AS max_id FROM public.users
UNION ALL SELECT 'plans', max(id) FROM public.plans
UNION ALL SELECT 'subscriptions', max(id) FROM public.subscriptions
UNION ALL SELECT 'instances', max(id) FROM public.instances;
