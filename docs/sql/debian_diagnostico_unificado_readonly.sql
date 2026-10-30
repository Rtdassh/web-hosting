-- Codrop / PostgreSQL 16 y 17 / diagnóstico ANTERIOR a d0001_adopt_debian.
-- Ejecutar TODO el archivo como una sentencia en DataGrip, preferiblemente con
-- conexión/transacción de solo lectura. Exportar el único resultado a CSV.
-- No contiene DDL/DML, no crea objetos, no llama nextval/setval y no autoriza migrar.
-- Solo consulta catálogos y agregados de columnas técnicas permitidas.
-- No lee valores de email, nombres, contraseñas, hashes, tarjetas ni tokens.
-- Los defaults de campos sensibles/desconocidos y las expresiones de índices,
-- CHECK y cuerpos de funciones se omiten deliberadamente.
-- query_to_xml ejecuta únicamente SELECTs fijos de agregados o estado de secuencias;
-- permite informar NO_VERIFICADO si faltan tablas/columnas/permisos, sin abortar.
-- No sustituye el manifiesto de evidencia, el respaldo ni un ensayo sobre una copia.
WITH
expected_tables(table_name, policy, expected_rows, expected_max_id) AS (
    VALUES
      ('users','BASE',7::bigint,7::bigint), ('plans','BASE',3,3),
      ('subscriptions','BASE',7,7), ('instances','BASE',3,22),
      ('port_allocations','BASE',100,NULL), ('instance_status_history','BASE',NULL,NULL),
      ('payment_transactions','BASE',0,NULL),
      ('asignacion_puertos','HEREDADA',100,NULL), ('audit_logs','HEREDADA',NULL,NULL),
      ('bitacora_auditoria','HEREDADA',NULL,NULL), ('comprobantes_factura','HEREDADA',NULL,NULL),
      ('email_verifications','HEREDADA',NULL,NULL), ('historial_estados_instancia','HEREDADA',NULL,NULL),
      ('invoice_receipts','HEREDADA',NULL,NULL), ('password_resets','HEREDADA',NULL,NULL),
      ('plantillas','HEREDADA',NULL,NULL), ('recuperaciones_contrasena','HEREDADA',NULL,NULL),
      ('roles','HEREDADA',NULL,NULL), ('templates','HEREDADA',NULL,NULL),
      ('transacciones_pago','HEREDADA',NULL,NULL), ('verificaciones_correo','HEREDADA',NULL,NULL),
      ('invoices','FUTURA',NULL,NULL), ('admin_audit_logs','FUTURA',NULL,NULL),
      ('password_reset_tokens','FUTURA',NULL,NULL), ('alembic_version','VERSION',NULL,NULL)
),
-- Contrato fisico Debian confirmado. La representacion Python (Enum/UTC) se
-- mantiene separada de los tipos fisicos de los dos historiales Alembic.
expected_columns(table_name, column_name, expected_type, expected_not_null, policy) AS (
    VALUES
      ('plans','id','integer',true,'BASE'),
      ('plans','name','character varying(50)',true,'BASE'),
      ('plans','description','text',false,'BASE'),
      ('plans','price','double precision',true,'BASE'),
      ('plans','max_instances','integer',true,'BASE'),
      ('plans','max_ram_mb','integer',true,'BASE'),
      ('plans','cpu_quota','double precision',true,'BASE'),
      ('users','id','integer',true,'BASE'),
      ('users','email','character varying(255)',true,'BASE'),
      ('users','hashed_password','character varying(255)',true,'BASE'),
      ('users','full_name','character varying(255)',true,'BASE'),
      ('users','role','character varying(50)',true,'BASE'),
      ('users','is_active','boolean',true,'BASE'),
      ('users','is_verified','boolean',true,'BASE'),
      ('users','created_at','timestamp with time zone',true,'BASE'),
      ('instances','id','integer',true,'BASE'),
      ('instances','uuid','character varying(36)',true,'BASE'),
      ('instances','name','character varying(100)',true,'BASE'),
      ('instances','user_id','integer',true,'BASE'),
      ('instances','container_id','character varying(64)',false,'BASE'),
      ('instances','assigned_port','integer',true,'BASE'),
      ('instances','public_url','character varying(255)',true,'BASE'),
      ('instances','status','character varying(50)',true,'BASE'),
      ('instances','storage_path','character varying(255)',true,'BASE'),
      ('instances','created_at','timestamp with time zone',true,'BASE'),
      ('instances','updated_at','timestamp with time zone',true,'BASE'),
      ('password_reset_tokens','id','integer',true,'FUTURA'),
      ('password_reset_tokens','user_id','integer',true,'FUTURA'),
      ('password_reset_tokens','token_hash','character varying(255)',true,'FUTURA'),
      ('password_reset_tokens','expires_at','timestamp without time zone',true,'FUTURA'),
      ('password_reset_tokens','used','boolean',true,'FUTURA'),
      ('password_reset_tokens','created_at','timestamp without time zone',true,'FUTURA'),
      ('payment_transactions','id','integer',true,'BASE'),
      ('payment_transactions','user_id','integer',true,'BASE'),
      ('payment_transactions','plan_id','integer',true,'FUTURA'),
      ('payment_transactions','amount','double precision',true,'BASE'),
      ('payment_transactions','card_last_four','character varying(4)',true,'FUTURA'),
      ('payment_transactions','card_brand','character varying(20)',true,'FUTURA'),
      ('payment_transactions','auth_code','character varying(32)',true,'FUTURA'),
      ('payment_transactions','status','character varying(50)',true,'BASE'),
      ('payment_transactions','created_at','timestamp with time zone',true,'BASE'),
      ('subscriptions','id','integer',true,'BASE'),
      ('subscriptions','user_id','integer',true,'BASE'),
      ('subscriptions','plan_id','integer',true,'BASE'),
      ('subscriptions','status','character varying(50)',true,'BASE'),
      ('subscriptions','created_at','timestamp with time zone',true,'BASE'),
      ('admin_audit_logs','id','integer',true,'FUTURA'),
      ('admin_audit_logs','admin_user_id','integer',true,'FUTURA'),
      ('admin_audit_logs','target_instance_id','integer',false,'FUTURA'),
      ('admin_audit_logs','action','character varying(50)',true,'FUTURA'),
      ('admin_audit_logs','details','text',false,'FUTURA'),
      ('admin_audit_logs','timestamp','timestamp without time zone',true,'FUTURA'),
      ('instance_status_history','id','integer',true,'BASE'),
      ('instance_status_history','instance_id','integer',true,'BASE'),
      ('instance_status_history','previous_status','character varying(50)',false,'BASE'),
      ('instance_status_history','new_status','character varying(50)',true,'BASE'),
      ('instance_status_history','reason','text',false,'BASE'),
      ('instance_status_history','changed_at','timestamp with time zone',true,'BASE'),
      ('invoices','id','integer',true,'FUTURA'),
      ('invoices','transaction_id','integer',true,'FUTURA'),
      ('invoices','user_id','integer',true,'FUTURA'),
      ('invoices','invoice_number','character varying(50)',true,'FUTURA'),
      ('invoices','amount','double precision',true,'FUTURA'),
      ('invoices','tax','double precision',true,'FUTURA'),
      ('invoices','status','character varying(20)',true,'FUTURA'),
      ('invoices','created_at','timestamp without time zone',true,'FUTURA'),
      ('port_allocations','port_number','integer',true,'BASE'),
      ('port_allocations','is_allocated','boolean',true,'BASE'),
      ('port_allocations','instance_id','integer',false,'BASE'),
      ('instances','template_id','integer',false,'HEREDADA'),
      ('plans','billing_period','character varying(20)',true,'HEREDADA'),
      ('plans','created_at','timestamp with time zone',true,'HEREDADA'),
      ('plans','is_active','boolean',true,'HEREDADA'),
      ('subscriptions','auto_renew','boolean',true,'HEREDADA'),
      ('subscriptions','end_date','timestamp with time zone',false,'HEREDADA'),
      ('subscriptions','start_date','timestamp with time zone',true,'HEREDADA'),
      ('users','updated_at','timestamp with time zone',true,'HEREDADA')
),
expected_keys(table_name, check_name, columns, kind, policy) AS (
    VALUES
      ('plans','PK',ARRAY['id']::text[],'PRIMARY KEY','BASE'),
      ('plans','UNIQUE:name',ARRAY['name']::text[],'UNIQUE','BASE'),
      ('plans','ix_plans_id',ARRAY['id']::text[],'INDEX','BASE'),
      ('users','PK',ARRAY['id']::text[],'PRIMARY KEY','BASE'),
      ('users','UNIQUE:email',ARRAY['email']::text[],'UNIQUE','BASE'),
      ('users','ix_users_id',ARRAY['id']::text[],'INDEX','BASE'),
      ('instances','PK',ARRAY['id']::text[],'PRIMARY KEY','BASE'),
      ('instances','UNIQUE:assigned_port',ARRAY['assigned_port']::text[],'UNIQUE','BASE'),
      ('instances','UNIQUE:container_id',ARRAY['container_id']::text[],'UNIQUE','BASE'),
      ('instances','UNIQUE:uuid',ARRAY['uuid']::text[],'UNIQUE','BASE'),
      ('instances','ix_instances_id',ARRAY['id']::text[],'INDEX','BASE'),
      ('password_reset_tokens','PK',ARRAY['id']::text[],'PRIMARY KEY','FUTURA'),
      ('password_reset_tokens','ix_password_reset_tokens_id',ARRAY['id']::text[],'INDEX','FUTURA'),
      ('password_reset_tokens','ix_password_reset_tokens_token_hash',ARRAY['token_hash']::text[],'UNIQUE','FUTURA'),
      ('payment_transactions','PK',ARRAY['id']::text[],'PRIMARY KEY','BASE'),
      ('payment_transactions','UNIQUE:auth_code',ARRAY['auth_code']::text[],'UNIQUE','FUTURA'),
      ('payment_transactions','ix_payment_transactions_id',ARRAY['id']::text[],'INDEX','FUTURA'),
      ('subscriptions','PK',ARRAY['id']::text[],'PRIMARY KEY','BASE'),
      ('subscriptions','ix_subscriptions_id',ARRAY['id']::text[],'INDEX','BASE'),
      ('admin_audit_logs','PK',ARRAY['id']::text[],'PRIMARY KEY','FUTURA'),
      ('admin_audit_logs','ix_admin_audit_logs_id',ARRAY['id']::text[],'INDEX','FUTURA'),
      ('instance_status_history','PK',ARRAY['id']::text[],'PRIMARY KEY','BASE'),
      ('invoices','PK',ARRAY['id']::text[],'PRIMARY KEY','FUTURA'),
      ('invoices','UNIQUE:invoice_number',ARRAY['invoice_number']::text[],'UNIQUE','FUTURA'),
      ('invoices','UNIQUE:transaction_id',ARRAY['transaction_id']::text[],'UNIQUE','FUTURA'),
      ('invoices','ix_invoices_id',ARRAY['id']::text[],'INDEX','FUTURA'),
      ('port_allocations','PK',ARRAY['port_number']::text[],'PRIMARY KEY','BASE'),
      ('port_allocations','ix_port_allocations_port_number',ARRAY['port_number']::text[],'INDEX','BASE')
),
expected_fks(table_name, columns, target_table, target_columns, delete_action, policy) AS (
    VALUES
      ('instances',ARRAY['user_id']::text[],'users',ARRAY['id']::text[],'c','BASE'),
      ('password_reset_tokens',ARRAY['user_id']::text[],'users',ARRAY['id']::text[],'a','FUTURA'),
      ('payment_transactions',ARRAY['plan_id']::text[],'plans',ARRAY['id']::text[],'a','FUTURA'),
      ('payment_transactions',ARRAY['user_id']::text[],'users',ARRAY['id']::text[],'c','BASE'),
      ('subscriptions',ARRAY['plan_id']::text[],'plans',ARRAY['id']::text[],'c','BASE'),
      ('subscriptions',ARRAY['user_id']::text[],'users',ARRAY['id']::text[],'c','BASE'),
      ('admin_audit_logs',ARRAY['admin_user_id']::text[],'users',ARRAY['id']::text[],'a','FUTURA'),
      ('admin_audit_logs',ARRAY['target_instance_id']::text[],'instances',ARRAY['id']::text[],'a','FUTURA'),
      ('instance_status_history',ARRAY['instance_id']::text[],'instances',ARRAY['id']::text[],'c','BASE'),
      ('invoices',ARRAY['transaction_id']::text[],'payment_transactions',ARRAY['id']::text[],'a','FUTURA'),
      ('invoices',ARRAY['user_id']::text[],'users',ARRAY['id']::text[],'a','FUTURA'),
      ('port_allocations',ARRAY['instance_id']::text[],'instances',ARRAY['id']::text[],'n','BASE'),
      ('instances',ARRAY['template_id']::text[],'templates',ARRAY['id']::text[],'n','HEREDADA')
),
relations AS MATERIALIZED (
    SELECT c.oid, c.relname::text AS table_name, c.relkind, c.relrowsecurity,
           c.relforcerowsecurity, pg_catalog.has_table_privilege(c.oid,'SELECT') AS readable
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')
),
columns AS MATERIALIZED (
    SELECT r.table_name, r.oid, a.attnum, a.attname::text AS column_name,
           CASE WHEN t.typtype='e' AND tn.nspname='public' THEN t.typname::text
                ELSE pg_catalog.format_type(a.atttypid,a.atttypmod) END AS actual_type,
           a.attnotnull, a.attidentity, a.attgenerated, d.oid IS NOT NULL AS has_default,
           CASE WHEN d.oid IS NULL THEN NULL
                WHEN a.attname = ANY(ARRAY['id','port_number','assigned_port','role','status',
                   'is_active','is_verified','is_allocated','created_at','updated_at','start_date',
                   'end_date','auto_renew','billing_period','price','amount','tax','cpu_quota',
                   'max_instances','max_ram_mb']) AND r.table_name IN
                   ('users','plans','subscriptions','instances','port_allocations',
                    'instance_status_history','payment_transactions','invoices','admin_audit_logs')
                THEN pg_catalog.pg_get_expr(d.adbin,d.adrelid)
                ELSE '[expresion omitida por privacidad]' END AS safe_default
    FROM relations r JOIN pg_catalog.pg_attribute a ON a.attrelid=r.oid
    JOIN pg_catalog.pg_type t ON t.oid=a.atttypid
    JOIN pg_catalog.pg_namespace tn ON tn.oid=t.typnamespace
    LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attnum>0 AND NOT a.attisdropped
),
constraints AS MATERIALIZED (
    SELECT r.table_name, k.oid, k.conname::text AS constraint_name, k.contype,
           k.convalidated, k.condeferrable, k.condeferred, k.confdeltype, k.confupdtype,
           rn.nspname::text AS target_schema, rc.relname::text AS target_table,
           ARRAY(SELECT a.attname::text FROM unnest(k.conkey) WITH ORDINALITY x(num,pos)
                 JOIN pg_catalog.pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=x.num
                 ORDER BY x.pos) AS columns,
           ARRAY(SELECT a.attname::text FROM unnest(k.confkey) WITH ORDINALITY x(num,pos)
                 JOIN pg_catalog.pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=x.num
                 ORDER BY x.pos) AS target_columns
    FROM relations r JOIN pg_catalog.pg_constraint k ON k.conrelid=r.oid
    LEFT JOIN pg_catalog.pg_class rc ON rc.oid=k.confrelid
    LEFT JOIN pg_catalog.pg_namespace rn ON rn.oid=rc.relnamespace
),
indexes AS MATERIALIZED (
    SELECT r.table_name, ic.relname::text AS index_name, i.indisunique, i.indisprimary,
           i.indisvalid, i.indisready, i.indnullsnotdistinct,
           i.indpred IS NOT NULL AS partial, i.indexprs IS NOT NULL AS expressions,
           ARRAY(SELECT a.attname::text FROM unnest(i.indkey::smallint[]) WITH ORDINALITY x(num,pos)
                 LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=x.num
                 WHERE x.pos<=i.indnkeyatts ORDER BY x.pos) AS columns
    FROM relations r JOIN pg_catalog.pg_index i ON i.indrelid=r.oid
    JOIN pg_catalog.pg_class ic ON ic.oid=i.indexrelid
),
table_counts_xml AS MATERIALIZED (
    SELECT e.*, r.relkind, r.readable, r.relrowsecurity, r.relforcerowsecurity,
           CASE WHEN r.relkind IN ('r','p') AND r.readable
                     AND NOT r.relrowsecurity AND NOT r.relforcerowsecurity
                THEN pg_catalog.query_to_xml(pg_catalog.format(
                     'SELECT count(*) AS n FROM %I.%I','public',e.table_name),false,false,'')
           END AS payload
    FROM expected_tables e LEFT JOIN relations r USING(table_name)
    WHERE e.expected_rows IS NOT NULL
),
table_counts AS (
    SELECT *, ((pg_catalog.xpath('/table/row/n/text()',payload))[1]::text)::bigint AS actual_rows
    FROM table_counts_xml
),
data_queries(element, verification, required_columns, expected_value, failure_result, query) AS (
    VALUES
    ('users','IDs maximos confirmados',ARRAY['users.id'],7::bigint,'REVISAR',
     'SELECT coalesce(max(id),0) AS n FROM public.users'),
    ('plans','IDs maximos confirmados',ARRAY['plans.id'],3,'REVISAR',
     'SELECT coalesce(max(id),0) AS n FROM public.plans'),
    ('plans','Planes base ausentes del catalogo',ARRAY['plans.name'],0,'REVISAR',
     $$SELECT count(*) AS n FROM (VALUES ('Free'),('Developer'),('Pro')) e(name)
       WHERE NOT EXISTS (SELECT 1 FROM public.plans p WHERE p.name::text=e.name)$$),
    ('subscriptions','IDs maximos confirmados',ARRAY['subscriptions.id'],7,'REVISAR',
     'SELECT coalesce(max(id),0) AS n FROM public.subscriptions'),
    ('instances','IDs maximos confirmados',ARRAY['instances.id'],22,'REVISAR',
     'SELECT coalesce(max(id),0) AS n FROM public.instances'),
    ('users','Roles fuera del enum del ORM',ARRAY['users.role'],0,'BLOQUEO_D0001',
     $$SELECT count(*) AS n FROM public.users WHERE role IS NULL OR role::text NOT IN ('ADMIN','CLIENT')$$),
    ('subscriptions','Usuarios con mas de una suscripcion activa',ARRAY['subscriptions.user_id','subscriptions.status'],0,'BLOQUEO_D0001',
     $$SELECT count(*) AS n FROM (SELECT user_id FROM public.subscriptions WHERE status::text='active' GROUP BY user_id HAVING count(*)>1) s$$),
    ('subscriptions','Referencias huerfanas a usuario o plan',ARRAY['subscriptions.user_id','subscriptions.plan_id','users.id','plans.id'],0,'REVISAR',
     'SELECT count(*) AS n FROM public.subscriptions s LEFT JOIN public.users u ON u.id::text=s.user_id::text LEFT JOIN public.plans p ON p.id::text=s.plan_id::text WHERE u.id IS NULL OR p.id IS NULL'),
    ('instances','Referencias huerfanas a propietario',ARRAY['instances.user_id','users.id'],0,'REVISAR',
     'SELECT count(*) AS n FROM public.instances i LEFT JOIN public.users u ON u.id::text=i.user_id::text WHERE u.id IS NULL'),
    ('instances','Estados fuera del enum del ORM',ARRAY['instances.status'],0,'BLOQUEO_D0001',
     $$SELECT count(*) AS n FROM public.instances WHERE status IS NULL OR status::text NOT IN ('PENDING','RUNNING','STOPPED','FAILED')$$),
    ('instances/port_allocations','Los tres enlaces confirmados y template_id NULL',
     ARRAY['instances.id','instances.assigned_port','instances.template_id','port_allocations.port_number','port_allocations.instance_id','port_allocations.is_allocated'],0,'BLOQUEO_D0001',
     $$SELECT count(*) AS n FROM (VALUES ('14','30002'),('19','30001'),('22','30003')) e(id,port)
       LEFT JOIN public.instances i ON i.id::text=e.id
       LEFT JOIN public.port_allocations p ON p.port_number::text=e.port
       WHERE i.id IS NULL OR i.assigned_port::text IS DISTINCT FROM e.port OR i.template_id IS NOT NULL
          OR p.port_number IS NULL OR p.instance_id::text IS DISTINCT FROM e.id
          OR p.is_allocated::text IS DISTINCT FROM 'true'$$),
    ('port_allocations','Puertos fuera del rango 30001-30100',ARRAY['port_allocations.port_number'],0,'REVISAR',
     $$SELECT count(*) AS n FROM public.port_allocations WHERE char_length(port_number::text)<>5 OR port_number::text<'30001' OR port_number::text>'30100'$$),
    ('port_allocations','Instancias asociadas a mas de un puerto',ARRAY['port_allocations.instance_id'],0,'REVISAR',
     'SELECT count(*) AS n FROM (SELECT instance_id FROM public.port_allocations WHERE instance_id IS NOT NULL GROUP BY instance_id HAVING count(*)>1) s'),
    ('port_allocations','Reservas sin instancia o asociaciones marcadas libres',ARRAY['port_allocations.instance_id','port_allocations.is_allocated'],0,'REVISAR',
     $$SELECT count(*) AS n FROM public.port_allocations WHERE (is_allocated::text='true' AND instance_id IS NULL) OR (is_allocated::text='false' AND instance_id IS NOT NULL)$$),
    ('port_allocations','Enlaces huerfanos o puerto distinto al de la instancia',ARRAY['port_allocations.port_number','port_allocations.instance_id','instances.id','instances.assigned_port'],0,'REVISAR',
     'SELECT count(*) AS n FROM public.port_allocations p LEFT JOIN public.instances i ON i.id::text=p.instance_id::text WHERE p.instance_id IS NOT NULL AND (i.id IS NULL OR i.assigned_port::text IS DISTINCT FROM p.port_number::text)'),
    ('plans','Limites no positivos o importes negativos',ARRAY['plans.max_instances','plans.max_ram_mb','plans.cpu_quota','plans.price'],0,'REVISAR',
     'SELECT count(*) AS n FROM public.plans WHERE max_instances<=0 OR max_ram_mb<=0 OR cpu_quota<=0 OR price<0')
),
data_ready AS (
    SELECT q.*, NOT EXISTS (
        SELECT 1 FROM unnest(q.required_columns) ref
        LEFT JOIN columns c ON c.table_name||'.'||c.column_name=ref
        LEFT JOIN relations r ON r.table_name=c.table_name
        LEFT JOIN expected_columns e ON e.table_name=c.table_name AND e.column_name=c.column_name
        WHERE c.column_name IS NULL OR r.relkind NOT IN ('r','p') OR NOT r.readable
           OR r.relrowsecurity OR r.relforcerowsecurity
           OR (e.expected_type IS NOT NULL AND c.actual_type<>e.expected_type
               -- These two checks compare technical labels using ::text. Reading
               -- VARCHAR is safe; it does NOT waive the schema mismatch elsewhere.
               AND NOT ((c.table_name,c.column_name) IN (('users','role'),('instances','status'))
                        AND (c.actual_type='text' OR c.actual_type LIKE 'character varying%'))
               AND NOT(c.table_name='payment_transactions' AND c.column_name='status'))
    ) AS can_read
    FROM data_queries q
),
data_xml AS MATERIALIZED (
    SELECT *, CASE WHEN can_read THEN pg_catalog.query_to_xml(query,false,false,'') END AS payload
    FROM data_ready
),
data_values AS (
    SELECT *, ((pg_catalog.xpath('/table/row/n/text()',payload))[1]::text)::bigint AS actual_value
    FROM data_xml
),
owned_sequences AS MATERIALIZED (
    SELECT e.table_name, e.expected_max_id,
           CASE WHEN r.relkind IN ('r','p') AND c.column_name IS NOT NULL
                THEN pg_catalog.pg_get_serial_sequence(pg_catalog.format('%I.%I','public',e.table_name),'id')
           END AS sequence_name
    FROM expected_tables e LEFT JOIN relations r USING(table_name)
    LEFT JOIN columns c ON c.table_name=e.table_name AND c.column_name='id'
    WHERE e.expected_max_id IS NOT NULL OR e.table_name='payment_transactions'
),
sequence_xml AS MATERIALIZED (
    SELECT s.*, n.nspname::text AS schema_name, cl.relname::text AS sequence_basename,
           seq.seqstart, seq.seqincrement, seq.seqcycle,
           CASE WHEN cl.relkind='S' AND pg_catalog.has_sequence_privilege(cl.oid,'SELECT')
                THEN pg_catalog.query_to_xml(pg_catalog.format(
                  'SELECT last_value AS value, is_called AS called FROM %I.%I',n.nspname,cl.relname),false,false,'') END AS payload
    FROM owned_sequences s LEFT JOIN pg_catalog.pg_class cl ON cl.oid=pg_catalog.to_regclass(s.sequence_name)
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid=cl.relnamespace
    LEFT JOIN pg_catalog.pg_sequence seq ON seq.seqrelid=cl.oid
),
sequence_values AS (
    SELECT *, ((pg_catalog.xpath('/table/row/value/text()',payload))[1]::text)::bigint AS last_value,
           ((pg_catalog.xpath('/table/row/called/text()',payload))[1]::text)::boolean AS is_called
    FROM sequence_xml
),
other_sequence_xml AS MATERIALIZED (
    SELECT c.oid, n.nspname::text AS schema_name, c.relname::text AS sequence_name,
           s.seqstart, s.seqincrement, s.seqmin, s.seqmax, s.seqcache, s.seqcycle,
           CASE WHEN pg_catalog.has_sequence_privilege(c.oid,'SELECT')
                THEN pg_catalog.query_to_xml(pg_catalog.format(
                  'SELECT last_value AS value, is_called AS called FROM %I.%I',n.nspname,c.relname),false,false,'') END AS payload
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_catalog.pg_sequence s ON s.seqrelid=c.oid
    WHERE n.nspname='public'
      AND NOT EXISTS(SELECT 1 FROM owned_sequences o WHERE pg_catalog.to_regclass(o.sequence_name)=c.oid)
),
expected_enums(type_name, labels, policy) AS (
    VALUES ('userrole',ARRAY['ADMIN','CLIENT'],'HEREDADA'),
           ('instancestatus',ARRAY['PENDING','RUNNING','STOPPED','FAILED'],'HEREDADA'),
           ('transactionstatus',ARRAY['APPROVED','REJECTED','PENDING'],'OPCIONAL')
),
actual_enums AS (
    SELECT t.typname::text AS type_name, array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
    FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
    JOIN pg_catalog.pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' GROUP BY t.typname
),
report(categoria,elemento,verificacion,resultado,detalle) AS (
    SELECT 'contexto','servidor','Version PostgreSQL',
           CASE WHEN current_setting('server_version_num')::integer BETWEEN 160000 AND 179999 THEN 'OK' ELSE 'REVISAR' END,
           current_setting('server_version')
    UNION ALL SELECT 'contexto','sesion','Modo de la conexion','INFORMACION',
           'transaction_read_only='||current_setting('transaction_read_only')||'; search_path='||current_setting('search_path')
    UNION ALL SELECT 'contexto','alcance','Interpretacion','INFORMACION',
           'BLOQUEO_D0001 significa incumplir una precondicion de esa ruta, no autoriza borrar ni modificar. Sin aprobacion para migrar.'
    UNION ALL SELECT 'tablas','public.'||e.table_name,'Inventario previo a d0001',
           CASE WHEN e.policy IN ('FUTURA','VERSION') AND r.oid IS NULL THEN 'PREVISTO_D0001'
                WHEN r.oid IS NULL OR r.relkind NOT IN ('r','p') THEN 'BLOQUEO_D0001'
                WHEN e.policy IN ('FUTURA','VERSION') THEN 'BLOQUEO_D0001'
                WHEN e.policy='HEREDADA' THEN 'CONSERVAR' ELSE 'OK' END,
           pg_catalog.format('politica=%s; objeto=%s; no se evalua necesidad por idioma o cantidad de filas',e.policy,coalesce(r.relkind::text,'ausente'))
    FROM expected_tables e LEFT JOIN relations r USING(table_name)
    UNION ALL SELECT 'tablas','public.'||r.table_name,'Objeto fuera del inventario','REVISAR',
           'No esta en las 21 tablas comunicadas; revisar antes de d0001 y conservar mientras tanto.'
    FROM relations r WHERE NOT EXISTS(SELECT 1 FROM expected_tables e WHERE e.table_name=r.table_name)
    UNION ALL SELECT 'columnas',e.table_name||'.'||e.column_name,'Tipo y nulabilidad',
           CASE WHEN c.column_name IS NULL AND e.policy='FUTURA' THEN 'PREVISTO_D0001'
                WHEN c.column_name IS NULL THEN 'BLOQUEO_D0001'
                WHEN e.policy='HEREDADA' AND (c.actual_type<>e.expected_type OR c.attnotnull<>e.expected_not_null) THEN 'BLOQUEO_D0001'
                WHEN e.policy='HEREDADA' AND e.table_name='instances' AND e.column_name='template_id' AND c.attnotnull THEN 'BLOQUEO_D0001'
                WHEN e.policy='HEREDADA' AND c.attnotnull AND NOT c.has_default AND c.attidentity='' AND c.attgenerated='' THEN 'BLOQUEO_D0001'
                WHEN e.policy='HEREDADA' THEN 'CONSERVAR'
                WHEN e.policy='FUTURA' AND e.table_name='payment_transactions' THEN 'BLOQUEO_D0001'
                WHEN e.policy='FUTURA' THEN 'REVISAR'
                WHEN c.actual_type<>e.expected_type OR c.attnotnull<>e.expected_not_null THEN 'BLOQUEO_D0001' ELSE 'OK' END,
           pg_catalog.format('real=%s; NOT NULL=%s; contrato fisico Debian=%s; NOT NULL esperado=%s; politica=%s',
              coalesce(c.actual_type,'ausente'),c.attnotnull,coalesce(e.expected_type,'sin tipo remoto confirmado'),e.expected_not_null,e.policy)
    FROM expected_columns e LEFT JOIN columns c USING(table_name,column_name)
    UNION ALL SELECT 'columnas',c.table_name||'.'||c.column_name,'Columna adicional no inventariada','REVISAR',
           'tipo='||c.actual_type||'; conservar. d0001 exige revisar columnas adicionales desconocidas.'
    FROM columns c WHERE c.table_name IN (SELECT table_name FROM expected_tables WHERE policy='BASE')
      AND NOT EXISTS(SELECT 1 FROM expected_columns e WHERE e.table_name=c.table_name AND e.column_name=c.column_name)
    UNION ALL SELECT 'defaults',c.table_name||'.'||c.column_name,'Default SQL y generacion',
           CASE WHEN c.table_name='payment_transactions' AND c.column_name='status' AND c.has_default THEN 'BLOQUEO_D0001'
                WHEN e.policy='HEREDADA' THEN 'CONSERVAR' ELSE 'INFORMACION' END,
           pg_catalog.format('default=%s; identidad=%s; generada=%s; los defaults Python no equivalen a defaults SQL',
              coalesce(c.safe_default,'ninguno'),coalesce(nullif(c.attidentity,''),'no'),coalesce(nullif(c.attgenerated,''),'no'))
    FROM columns c LEFT JOIN expected_columns e USING(table_name,column_name)
    UNION ALL SELECT 'claves',k.table_name||'.'||k.check_name,k.kind,
           CASE WHEN EXISTS (
                  SELECT 1 FROM indexes i WHERE i.table_name=k.table_name AND i.columns=k.columns
                    AND i.indisvalid AND i.indisready AND NOT i.partial AND NOT i.expressions
                    AND CASE k.kind WHEN 'PRIMARY KEY' THEN i.indisprimary
                          WHEN 'UNIQUE' THEN i.indisunique ELSE true END
                ) THEN 'OK'
                WHEN k.policy='FUTURA' THEN 'PREVISTO_D0001' ELSE 'BLOQUEO_D0001' END,
           'columnas='||k.columns::text||'; se compara significado; un indice de PK valido cubre el INDEX no unico de las mismas columnas; no se propone borrar indices'
    FROM expected_keys k
    UNION ALL SELECT 'indices',i.table_name||'.'||i.index_name,'Indice real',
           CASE WHEN NOT i.indisvalid OR NOT i.indisready OR i.indnullsnotdistinct THEN 'REVISAR' ELSE 'INFORMACION' END,
           pg_catalog.format('columnas=%s; unico=%s; PK=%s; parcial=%s; expresiones=%s; NULLS NOT DISTINCT=%s; valid=%s; ready=%s; no se exportan expresiones',
             i.columns,i.indisunique,i.indisprimary,i.partial,i.expressions,i.indnullsnotdistinct,i.indisvalid,i.indisready)
    FROM indexes i
    UNION ALL SELECT 'fk',f.table_name||'.'||f.columns::text,'Relacion esperada',
           CASE WHEN EXISTS(SELECT 1 FROM constraints c WHERE c.contype='f' AND c.table_name=f.table_name
                    AND c.columns=f.columns AND c.target_schema='public' AND c.target_table=f.target_table
                    AND c.target_columns=f.target_columns AND c.confdeltype::text=f.delete_action AND c.convalidated)
                  THEN CASE WHEN f.policy='HEREDADA' THEN 'CONSERVAR' ELSE 'OK' END
                WHEN EXISTS(SELECT 1 FROM constraints c WHERE c.contype='f' AND c.table_name=f.table_name AND c.columns=f.columns)
                  THEN 'BLOQUEO_D0001'
                WHEN f.policy='FUTURA' THEN 'PREVISTO_D0001' ELSE 'BLOQUEO_D0001' END,
           pg_catalog.format('destino=public.%s%s; ON DELETE codigo=%s (a=NO ACTION,c=CASCADE,n=SET NULL)',f.target_table,f.target_columns,f.delete_action)
    FROM expected_fks f
    UNION ALL SELECT 'restricciones',c.table_name||'.'||c.constraint_name,'Restriccion real',
           CASE WHEN NOT c.convalidated THEN 'BLOQUEO_D0001'
                WHEN c.table_name='payment_transactions' AND c.contype='c' THEN 'BLOQUEO_D0001'
                WHEN c.table_name='instances' AND c.columns=ARRAY['template_id']::text[] THEN 'CONSERVAR' ELSE 'INFORMACION' END,
           pg_catalog.format('tipo=%s; columnas=%s; destino=%s.%s%s; delete=%s; update=%s; validada=%s; diferible=%s; diferida=%s; expresiones CHECK omitidas',
             c.contype,c.columns,c.target_schema,c.target_table,c.target_columns,c.confdeltype,c.confupdtype,c.convalidated,c.condeferrable,c.condeferred)
    FROM constraints c
    UNION ALL SELECT 'fk','payment_transactions.user_id','Opciones admitidas por d0001',
           CASE WHEN c.confdeltype='c' AND c.confupdtype='a' AND NOT c.condeferrable AND NOT c.condeferred
                     AND c.target_schema='public' AND c.target_table='users' AND c.target_columns=ARRAY['id']::text[]
                THEN 'OK' ELSE 'BLOQUEO_D0001' END,
           'La ruta conserva una FK existente solo si sus opciones son las revisadas; no la reemplaza automaticamente.'
    FROM constraints c WHERE c.table_name='payment_transactions' AND c.contype='f' AND c.columns=ARRAY['user_id']::text[]
    UNION ALL SELECT 'enums',e.type_name,'Etiquetas y orden',
           CASE WHEN a.type_name IS NULL AND e.policy='OPCIONAL' THEN 'INFORMACION'
                WHEN a.labels IS DISTINCT FROM e.labels THEN 'BLOQUEO_D0001' ELSE 'CONSERVAR' END,
           pg_catalog.format('real=%s; esperado si existe=%s; tipos nativos heredados se conservan; columnas de roles/estados/pagos usan VARCHAR; no se crea transactionstatus',a.labels,e.labels)
    FROM expected_enums e LEFT JOIN actual_enums a USING(type_name)
    UNION ALL SELECT 'datos',table_name,'Conteo exacto',
           CASE WHEN actual_rows IS NULL THEN 'NO_VERIFICADO' WHEN actual_rows<>expected_rows THEN 'BLOQUEO_D0001' ELSE 'OK' END,
           pg_catalog.format('real=%s; confirmado=%s; permisos SELECT=%s; RLS=%s; si falta acceso no se interpreta como cero',actual_rows,expected_rows,readable,relrowsecurity)
    FROM table_counts
    UNION ALL SELECT 'datos',element,verification,
           CASE WHEN NOT can_read OR actual_value IS NULL THEN 'NO_VERIFICADO'
                WHEN actual_value=expected_value THEN 'OK' ELSE failure_result END,
           pg_catalog.format('agregado=%s; esperado=%s; sin identificadores personales ni valores individuales; reservas transitorias requieren contexto',actual_value,expected_value)
    FROM data_values
    UNION ALL SELECT 'secuencias',table_name||'.id','Estado sin avanzar la secuencia',
           CASE WHEN sequence_name IS NULL THEN 'BLOQUEO_D0001' WHEN payload IS NULL THEN 'NO_VERIFICADO'
                WHEN seqincrement<=0 OR seqcycle THEN 'BLOQUEO_D0001'
                WHEN table_name='payment_transactions' AND NOT is_called THEN 'OK'
                WHEN table_name<>'payment_transactions' AND is_called AND last_value=expected_max_id THEN 'OK'
                ELSE 'BLOQUEO_D0001' END,
           pg_catalog.format('secuencia=%s; last_value=%s; is_called=%s; inicio=%s; incremento=%s; ciclo=%s; max ID confirmado=%s; cache/concurrencia requieren revision',
             coalesce(sequence_name,'sin generador asociado'),last_value,is_called,seqstart,seqincrement,seqcycle,expected_max_id)
    FROM sequence_values
    UNION ALL SELECT 'secuencias_adicionales',schema_name||'.'||sequence_name,'Inventario sin avanzar la secuencia',
           CASE WHEN payload IS NULL THEN 'NO_VERIFICADO' ELSE 'INFORMACION' END,
           pg_catalog.format('last_value=%s; is_called=%s; inicio=%s; incremento=%s; min=%s; max=%s; cache=%s; ciclo=%s; sin suponer equivalencia con un ID',
             (pg_catalog.xpath('/table/row/value/text()',payload))[1]::text,
             (pg_catalog.xpath('/table/row/called/text()',payload))[1]::text,
             seqstart,seqincrement,seqmin,seqmax,seqcache,seqcycle)
    FROM other_sequence_xml
    UNION ALL SELECT 'seguridad',r.table_name,'RLS',
           CASE WHEN r.relrowsecurity OR r.relforcerowsecurity THEN 'BLOQUEO_D0001' ELSE 'OK' END,
           pg_catalog.format('RLS=%s; FORCE RLS=%s; agregados omitidos si existe RLS',r.relrowsecurity,r.relforcerowsecurity)
    FROM relations r WHERE r.relkind IN ('r','p')
    UNION ALL SELECT 'triggers',r.table_name||'.'||t.tgname,'Trigger de usuario',
           CASE WHEN r.table_name='payment_transactions' THEN 'BLOQUEO_D0001' ELSE 'REVISAR' END,
           'habilitacion='||t.tgenabled::text||'; no se consulta el cuerpo de la funcion'
    FROM relations r JOIN pg_catalog.pg_trigger t ON t.tgrelid=r.oid WHERE NOT t.tgisinternal
    UNION ALL SELECT 'triggers',t.evtname::text,'Event trigger DDL',
           CASE WHEN t.evtenabled='D' THEN 'INFORMACION' ELSE 'BLOQUEO_D0001' END,
           'evento='||t.evtevent::text||'; habilitacion='||t.evtenabled::text
    FROM pg_catalog.pg_event_trigger t
    UNION ALL SELECT DISTINCT 'dependencias',r.table_name||coalesce('.'||a.attname,''),'Objeto dependiente',
           CASE WHEN r.table_name='templates' OR a.attname='template_id' THEN 'CONSERVAR' ELSE 'REVISAR' END,
           pg_catalog.pg_describe_object(d.classid,d.objid,d.objsubid)||'; tipo dependencia='||d.deptype::text
    FROM relations r JOIN pg_catalog.pg_depend d ON d.refclassid='pg_catalog.pg_class'::regclass AND d.refobjid=r.oid
    LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=r.oid AND a.attnum=d.refobjsubid
    WHERE d.deptype='n' AND d.classid IN ('pg_catalog.pg_constraint'::regclass,'pg_catalog.pg_rewrite'::regclass,
          'pg_catalog.pg_trigger'::regclass,'pg_catalog.pg_proc'::regclass,'pg_catalog.pg_attrdef'::regclass,'pg_catalog.pg_class'::regclass)
    UNION ALL SELECT 'limites','diagnostico','Alcance de la evidencia','NO_AUTORIZA_MIGRACION',
           'No detecta todos los consumidores externos ni SQL dinamico de funciones. Revisar resultados, obtener respaldo y ensayar en copia aislada. Ninguna tabla se considera prescindible por estar vacia.'
)
SELECT categoria, elemento, verificacion, resultado, detalle
FROM report
ORDER BY categoria, elemento, verificacion, resultado, detalle;
