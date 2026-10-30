# Alembic y PostgreSQL — Rol 3, hitos 30–80 %

> Actualización: para el esquema Debian con columnas adicionales y pagos
> incompletos, usar [RECONCILIACION_DEBIAN.md](RECONCILIACION_DEBIAN.md).
> Debian no equivale a `0001`; no usar stamp para su adopción.
> El mapeo y los perfiles físicos están en [ADAPTACION_ORM_DEBIAN.md](ADAPTACION_ORM_DEBIAN.md).

## Estado y alcance

La configuración usa SQLAlchemy y Alembic ya declarados en `backend/requirements.txt`.
No agrega credenciales a `alembic.ini`. Importa `app.models` completo sin importar
la API ni iniciar Docker. Gestiona las diez tablas actuales en `public`.

Revisiones congeladas, independientes de futuras modificaciones de los modelos:

| Revisión | Contenido |
| --- | --- |
| `0001_existing_core` | Crea `users`, `plans`, `subscriptions`, `instances`, `port_allocations`, `instance_status_history`, `payment_transactions` en una instalación vacía. |
| `0002_billing_admin_recovery` | Añade solamente `invoices`, `admin_audit_logs`, `password_reset_tokens`, sus PK, FK, restricciones únicas e índices. |
| `0003_admin_audit_set_null` | Reemplaza únicamente la FK de `admin_audit_logs.target_instance_id` por `ON DELETE SET NULL`. |
| `0004_subscription_period` | Añade periodicidad/actividad de planes, fechas de suscripción faltantes en fresh, períodos actuales y `invoices.pdf_metadata`. |
| `0005_financial_history` | Añade el snapshot del nombre de plan, restringe el borrado de usuarios con registros financieros e instala triggers de inmutabilidad. |

`upgrade head` desde una base vacía aplica las cinco revisiones. La primera rechaza
una base `public` con tablas previas sin versionar: **no es una migración de adopción**.
No hay `IF NOT EXISTS` que oculte diferencias de estructura. La segunda tampoco
silencia tablas inesperadamente existentes. Los downgrades están bloqueados:
no se prepararon operaciones que eliminen tablas o datos.

Las revisiones iniciales conservan el contrato físico original, separado del ORM
actual mediante el perfil fresh. La revisión `0004` agrega `plans.billing_period`,
`plans.is_active`, `plans.created_at`, `subscriptions.start_date`, `end_date`,
`auto_renew`, los períodos `current_period_*` e `invoices.pdf_metadata`, sin
eliminar tablas ni registros. En fresh, `billing_period`, `is_active` y
`auto_renew` usan defaults compatibles. `plans.created_at` y
`subscriptions.start_date` son nullable, porque el historial fresh no contiene
fechas históricas fiables que deban copiarse o inventarse. Los períodos actuales,
`end_date` y `pdf_metadata` también son nullable. En el historial Debian, V3 conserva intactos los
campos ya existentes `billing_period`, `is_active`, `created_at`, `start_date`,
`end_date` y `auto_renew`; agrega solo los períodos actuales y `pdf_metadata`.
No se copian ni recalculan fechas históricas. La FK de auditoría original sin
`SET NULL` se corrige explícitamente en `0003`.
La revisión `0005` añade `payment_transactions.plan_name_snapshot` nullable sin
rellenar filas anteriores, sustituye las FKs de usuario por `ON DELETE RESTRICT`
y bloquea `UPDATE`, `DELETE` y `TRUNCATE` sobre transacciones y facturas. Para
registros anteriores sin snapshot, el historial informa que el nombre del plan
no fue registrado. Su downgrade está bloqueado porque retiraría protecciones o
datos históricos.

Debian sintético mantiene su historial independiente: `d0004_financial_history`
aplica la misma política después de `d0003_subscription_period`. La revisión
verifica las FKs esperadas de su perfil (`CASCADE` heredada para pagos y `NO
ACTION` para facturas) antes de reemplazarlas. Los dos historiales comprueban
conteos y fingerprints de filas, verifican las nuevas restricciones/triggers y
se niegan a completar snapshots históricos desconocidos.
Los enums almacenan etiquetas `ADMIN/CLIENT`, `PENDING/RUNNING/STOPPED/FAILED`
y `APPROVED/REJECTED/PENDING`, conforme a los modelos actuales.

## Selección explícita de conexión

Desde la raíz del repositorio se usa `python -m alembic -c backend/alembic.ini`.
Desde `backend`, se usa `python -m alembic -c alembic.ini`.

Para cualquier operación online hay dos opciones:

1. Definir `CODROP_MIGRATION_DATABASE_URL` en el entorno privado de la sesión.
   No guardarla en archivos versionados ni mostrarla en consola o capturas.
2. Usar explícitamente `-x use_project_database=true` para tomar los campos
   `POSTGRES_*` de Settings y sus archivos `.env` locales. La URL se construye
   con `URL.create`, admitiendo caracteres especiales en contraseñas.

La variable de migraciones tiene prioridad si ambas opciones están presentes.
No hay fallback automático a la conexión del proyecto. Tanto Alembic como la
semilla CLI comparten este selector. Nunca activar la opción del proyecto sin
haber comprobado primero cuál es su servidor/base de destino.

Las operaciones online se ejecutan dentro de una transacción PostgreSQL y con
`search_path=public` local a esa transacción. Los errores online de la CLI se
resumen sin imprimir la conexión ni parámetros. La API conserva su configuración
normal de conexión: configurar una URL para Alembic no reconfigura el backend.

## Inspección offline: no conecta a ninguna base

```powershell
python -B -m alembic -c backend/alembic.ini history
python -B -m alembic -c backend/alembic.ini heads
python -B -m alembic -c backend/alembic.ini upgrade head --sql
python -B -m alembic -c backend/alembic.ini upgrade 0001_existing_core:head --sql
```

El último comando muestra solamente el incremento del 80 %. Generar SQL no
demuestra que una base real sea compatible, ni sustituye el control de esquema.
No ejecutar ese SQL manualmente en Debian: el versionado también debe quedar coherente.

## Instalación nueva, posteriormente

Una vez seleccionada explícitamente una base nueva y vacía:

```powershell
python -B -m alembic -c backend/alembic.ini current
python -B -m alembic -c backend/alembic.ini upgrade head
python -B -m alembic -c backend/alembic.ini check
```

Si se elige Settings en lugar de la variable privada, agregar
`-x use_project_database=true` **antes del subcomando** en cada operación online:

```powershell
python -B -m alembic -c backend/alembic.ini -x use_project_database=true upgrade head
```

Después, si se desean los tres planes y el pool inicial, ejecutar explícitamente
desde `backend`:

```powershell
python -B -m app.seed
```

Este comando requiere la variable privada seleccionada. Si se optó por Settings,
usar `python -B -m app.seed --use-project-database`.

La revisión `0003_admin_audit_set_null` conserva las filas de auditoría y todas las
columnas; solo cambia la acción de borrado de esa FK. Antes de reemplazarla, la
migración verifica en línea que exista exactamente una FK nullable desde
`admin_audit_logs.target_instance_id` a `instances.id`, con la acción histórica
`NO ACTION`. Rechaza esquemas no coincidentes. El SQL offline usa el nombre por
defecto generado por PostgreSQL en las revisiones congeladas y es solo una vista
previa, no una comprobación del catálogo. El nuevo constraint se llama
`fk_admin_audit_logs_target_instance_id_instances`. El downgrade está bloqueado
porque no puede reconstruir las referencias que ya hayan quedado en `NULL`.

La semilla usa un solo commit y `ON CONFLICT DO NOTHING`: añade planes por nombre y
puertos por PK sin sobrescribir cuotas, precios ni asignaciones existentes.
Un puerto faltante asociado a una instancia se inserta ocupado y vinculado a ella.
No repara inconsistencias de filas ya existentes ni modifica `asignacion_puertos`.
No crea usuarios de demostración ni contraseñas predeterminadas. Usar una sesión
dedicada; el parámetro `db` de `seed_db` no debe recibir cambios de negocio pendientes.

El backend ya no ejecuta `create_all` ni semillas durante su arranque, en ningún
entorno. Migrar antes de iniciar o actualizar el servicio. La coordinación de ese
orden en el despliegue corresponde al responsable de integración/DevOps.

## Debian existente: utilizar la ruta de reconciliaci?n

Las diferencias confirmadas (columnas heredadas y pagos incompletos) impiden
adoptar Debian como equivalente de `0001_existing_core`. No usar stamp ni
el historial de instalaciones nuevas sobre esa base.

La configuraci?n separada `backend/alembic-debian.ini`, sus verificaciones,
las condiciones pendientes y los comandos para ensayar en una copia aislada
est?n documentados en [RECONCILIACION_DEBIAN.md](RECONCILIACION_DEBIAN.md).
La ruta nueva conserva las tablas/columnas heredadas y no crea datos ficticios.
Todav?a falta revisar los detalles SQL reales antes de autorizar Debian.

## Pruebas locales aisladas

Pruebas offline y regresión sin conexión a PostgreSQL:

```powershell
$env:PYTHONPATH = (Join-Path (Get-Location) 'backend')
$env:PYTHONDONTWRITEBYTECODE = '1'
python -B -m unittest backend.tests.test_migrations backend.tests.test_role3_instances backend.tests.test_role3_port_service -v
```

El flujo de recuperación de contraseña se prueba en una base SQLite temporal,
sin servicio externo ni token devuelto por la API:

```powershell
$env:PYTHONPATH = (Join-Path (Get-Location) 'backend')
python -B -m pytest backend/tests/test_password_recovery.py -q
```

La tabla existente ya permite guardar SHA-256 en `token_hash`, gestionar
`expires_at` y consumir con `used`; no se requiere una migración Alembic para
este endurecimiento. El endpoint devuelve una respuesta genérica. El servicio
acepta un proveedor `send_password_reset(email, token)` inyectable y existe un
adaptador SMTP configurable que construye y entrega el enlace de recuperación.
Las pruebas automatizadas con SMTP simulado pasaron sin enviar correo ni abrir
conexiones externas. Además, el 28 de octubre de 2026 se validó manualmente la
entrega local mediante el adaptador real `SMTPPasswordResetDelivery`: con
Docker Engine 29.8.2, Mailpit local recibió correctamente el mensaje enviado a
`prueba@codrop.test` desde `no-reply@codrop.test`, con asunto «Restablece tu
contraseña de Codrop», usando SMTP en `127.0.0.1:1025` sin TLS ni autenticación.
Se utilizó un token ficticio; no se enviaron correos externos reales. Por tanto,
la entrega SMTP local está validada, pero todavía no se ha probado el flujo
completo a través de los endpoints con un token real de prueba. La navegación
del enlace recibido queda pendiente de la integración del frontend del Rol 2.

Para pruebas PostgreSQL, el compose dedicado no carga la conexión del proyecto
ni usa sus volúmenes. Publica solo `127.0.0.1:55432`, usa PostgreSQL 16 y dos bases
fijas: `codrop_migration_new` y `codrop_migration_legacy`. Definir una contraseña
local exclusiva en `CODROP_TEST_POSTGRES_PASSWORD`, sin imprimirla.

```powershell
docker compose -p codrop-migrations-test -f docker-compose.migrations-test.yml up -d --wait
$env:CODROP_RUN_MIGRATION_TESTS = '1'
$env:PYTHONPATH = (Join-Path (Get-Location) 'backend')
python -B -m unittest backend.tests.test_migrations_postgres -v
docker compose -p codrop-migrations-test -f docker-compose.migrations-test.yml stop
```

Las pruebas solo aceptan ese host/puerto/usuario y esos nombres de base: nunca
toman la URL de producción ni `CODROP_MIGRATION_DATABASE_URL`. Se niegan a
ejecutarse sobre bases no vacías, no borran datos y no limpian volúmenes.
Para otra ejecución se necesita un entorno vacío separado; no reutilizar ni
limpiar automáticamente el volumen anterior. Se conserva para inspección.

El compose permite ejecutar la suite de integración primero en PostgreSQL 16 y
luego en PostgreSQL 17. Use dos nombres de proyecto distintos para conservar
volúmenes independientes; el segundo contenedor puede reutilizar el puerto local
solo después de detener el primero. No use `down -v` ni elimine los volúmenes:

```powershell
$env:CODROP_TEST_POSTGRES_PASSWORD = '<contraseña-local-de-pruebas>'
$env:CODROP_TEST_POSTGRES_VERSION = '16'
$env:CODROP_RUN_MIGRATION_TESTS = '1'
$env:PYTHONPATH = (Join-Path (Get-Location) 'backend')
docker compose -p codrop-migrations-pg16 -f docker-compose.migrations-test.yml up -d --wait
python -B -m unittest backend.tests.test_migrations_postgres backend.tests.test_debian_reconciliation -v
docker compose -p codrop-migrations-pg16 -f docker-compose.migrations-test.yml stop

$env:CODROP_TEST_POSTGRES_VERSION = '17'
docker compose -p codrop-migrations-pg17 -f docker-compose.migrations-test.yml up -d --wait
python -B -m unittest backend.tests.test_migrations_postgres backend.tests.test_debian_reconciliation -v
docker compose -p codrop-migrations-pg17 -f docker-compose.migrations-test.yml stop
```

Las pruebas verifican la versión mayor solicitada, aplican ambos historiales en
fixtures aisladas, borran una instancia mediante SQL y comprueban que su
`AdminAuditLog` permanece con `target_instance_id = NULL`. También ejecutan
`alembic check` contra el contrato vigente. La fixture Debian es sintética; esto
no autoriza ni demuestra una migración de la base Debian real.

Cobertura preparada:

- Migración vacía a head y comparación con los diez modelos; enums y FK.
- Semillas repetidas sin duplicados y sin usuarios demo.
- Registro/login/perfil, catálogo, checkout/facturas y recuperación por HTTP,
  con sesiones de pruebas y Docker bloqueado; persistencia de auditoría.
- Rechazo de una FK inválida.
- Base heredada **sintética** de siete tablas y `asignacion_puertos`, con los
  conteos e IDs de instancia comunicados: rechazo sin versionar, comparación
  estructural previa al stamp, incorporación de tres tablas y comparación de
  todas las filas anteriores, incluidas asignaciones.

La fixture sintética no representa una copia verificada de Debian. Sigue pendiente
ensayar con su esquema real cuando se reciban los resultados de DataGrip. Tampoco
se validan aquí los flujos Docker, plantillas o acciones forzosas, que tienen
problemas de integración previamente identificados y corresponden a Rol 4.

La autogeneración excluye las tablas no gestionadas para no proponer su eliminación.
Toda revisión futura debe revisarse manualmente antes de ejecutarla; `check` no
garantiza ausencia de dependencias externas ni reemplaza el inventario SQL.

## Validación de esta entrega

Las 20 pruebas pasaron: 8 de contratos offline, 10 de regresión del Rol 3 y 2
de integración en PostgreSQL 16 local aislado. Se comprobó la instalación nueva,
los flujos HTTP indicados y la conservación de todas las filas de la fixture
heredada sintética. El contenedor de pruebas se detuvo; su volumen se conservó.
No se estableció conexión con Debian. La adopción de su esquema real continúa
pendiente de los resultados SQL y de un ensayo sobre una copia verificada.

Referencias utilizadas: [tutorial oficial de Alembic](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
y [contexto transaccional](https://alembic.sqlalchemy.org/en/latest/api/runtime.html).
