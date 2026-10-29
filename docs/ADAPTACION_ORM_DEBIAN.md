# ORM y contratos físicos de Codrop

## Decisión implementada

Los valores confirmados `CLIENT` (7 usuarios) y `RUNNING` (3 instancias) son los
nombres de miembros Python. Se mantienen exactamente: no se actualizan filas,
no se cambia su capitalización y no se convierten columnas de Debian a enums nativos.

El ORM usa `Enum(..., native_enum=False, length=50, validate_strings=True,
create_constraint=False)` para roles, estados de instancia y estados de pagos.
SQLAlchemy conserva la conversión a `UserRole`/`InstanceStatus`/`TransactionStatus`
y persiste nombres de miembros. Las respuestas JSON siguen usando sus valores
`client`, `running`, etc. Un texto desconocido no se acepta ni normaliza a ciegas.
El mismo ORM lee los enums nativos del historial nuevo, comprobado con psycopg2
en PostgreSQL 16 y 17. Esta compatibilidad no se presupone para otros drivers.

`UTCDateTime` representa instantes UTC conscientes de zona. Exige zona en las
escrituras, normaliza instantes en memoria y conserva TIMESTAMPTZ en el perfil
Debian. Las conexiones del backend fijan TimeZone=UTC. No hay UPDATE/ALTER para
transformar fechas guardadas.

El historial original crea algunas fechas sin zona. Solo en ese contrato conocido
se interpretan como UTC al leerlas y se escribe usando conexiones UTC; no es una
regla para reinterpretar fechas históricas desconocidas de otras bases. La nueva
configuración de conexión debe conservarse en servicios y pruebas. Los timestamps
sin zona de las tres tablas nuevas conservan su DDL congelado y reciben la misma
representación UTC en Python.

## Dos perfiles explícitos y versionados

`schema_profiles_v1.py` define el contrato físico V1. `schema_profiles_v2.py`
agrega el cambio de FK de auditoría sin alterar V1; `schema_profiles.py` expone
el contrato vigente. La revisión `d0001` y su reconciliación importan V1
directamente, sin depender de cambios futuros en modelos vivos.

| Aspecto | Perfil `fresh`, alembic.ini | Perfil `debian`, alembic-debian.ini |
| --- | --- | --- |
| Roles/estados/pagos | Enums nativos originales | VARCHAR(50), miembros Python validados |
| Cinco fechas existentes revisadas | TIMESTAMP sin zona del DDL original | TIMESTAMPTZ confirmado |
| instances.updated_at | Nullable en el DDL original | NOT NULL, default existente conservado |
| plans.description | VARCHAR(255) original | TEXT, sin truncar |
| Cinco FK revisadas | NO ACTION original | Cuatro CASCADE y un SET NULL confirmados |
| Email/UUID únicos | Índices únicos originales | UNIQUE existentes, sin reemplazarlos |
| Ocho columnas heredadas | No se agregan por esta adaptación | Se conservan con sus tipos, defaults y FK |
| PK e índices secundarios redundantes | Se conservan los ya creados | La PK válida basta; no se añade duplicado |
| `admin_audit_logs.target_instance_id` (V2) | `ON DELETE SET NULL` | `ON DELETE SET NULL` |

Los perfiles se aplican a **copias de metadata**. No cambian el esquema y no ocultan
globalmente diferencias de tipo, nulabilidad o FK. Alembic compara contra el perfil
seleccionado por su archivo ini; una diferencia no prevista sigue siendo un diff.
Los campos futuros no incluidos en la matriz siguen presentes en metadata y se
comparan normalmente. Las columnas heredadas sin uso de servicio permanecen sin
mapear y protegidas por `include_object`; no se inventan funcionalidades para ellas.

No se reescribieron `0001_existing_core` ni `0002_billing_admin_recovery`. Una vez
aplicada d0001, V1 y sus auxiliares quedan congelados: un cambio físico posterior
requiere V2 y revisiones explícitas para ambos historiales o una convergencia
documentada. No usar stamp cruzado ni modificar V1 para ocultar un cambio nuevo.

La revisión `0003_admin_audit_set_null` del historial fresh y `d0002_admin_audit_set_null`
del historial Debian implementan ese cambio posterior. Ambas verifican primero
que la FK previa sea exactamente la esperada (nullable, `target_instance_id` a
`instances.id`, acción `NO ACTION`) y luego reemplazan solo esa restricción con
el nombre explícito `fk_admin_audit_logs_target_instance_id_instances`. Las filas
administrativas y todas las demás columnas y restricciones quedan preservadas.
Las revisiones no se revierten: los valores que queden NULL no permiten recuperar
la instancia borrada.

El ORM representa las FK de Debian explícitamente: instances.user_id,
subscriptions.user_id/plan_id y payment_transactions.user_id con CASCADE;
port_allocations.instance_id con SET NULL. No se ejecuta ALTER sobre esas FK.
El perfil fresh conserva sus acciones originales. Esta conservación no autoriza
eliminar usuarios/planes ni resuelve por sí sola la retención financiera.

## Preflight, adopción y postcheck

El preflight ahora valida el perfil físico Debian exacto, incluidos los tipos,
nulabilidad y generadores conocidos de las ocho columnas adicionales. Comprueba
las etiquetas reales mediante conteos sin exponer filas y conserva los enums
nativos heredados que ya existen aunque las columnas sean VARCHAR.

d0001 añade las cuatro columnas de facturación, FK de plan, unicidad de auth_code
y las tres tablas faltantes. **Ya no convierte payment_transactions.status ni
modifica sus cinco columnas anteriores o su FK a usuarios.** Tampoco crea un enum
transactionstatus innecesario ni un índice secundario de ID cubierto por la PK.

El postcheck usa el mismo contrato V1 de Debian y compara todas las columnas
anteriores de pagos, incluido status. Se mantienen la verificación del manifiesto,
el bloqueo de escritores, la transacción DDL, las huellas de filas, el estado de
secuencias y los checks de constraints. Una falla revierte la adopción completa.

Se conserva un riesgo conocido: los defaults SQL heredados `client` y `pending`
son minúsculos. El ORM suministra miembros explícitos y guarda CLIENT/PENDING.
Un escritor externo que omita esos campos puede generar valores incompatibles;
no se modificaron esos defaults ni datos como parte de esta entrega. El preflight
detecta tales filas y deben coordinarse los demás escritores antes del ensayo.

## Validación y siguiente paso

Resultado: 32 pruebas aprobadas en PostgreSQL 16.15 y otras 32 en PostgreSQL 17.11.
Ambos historiales llegan a su head y `alembic check` no propone operaciones nuevas
en las fixtures correspondientes. El diagnóstico previo de la fixture Debian no
registra bloqueos ni verificaciones omitidas. Se conservaron los volúmenes y se
detuvieron los contenedores; Debian no fue accedido.

Ese resultado es la validación previa de V1 y no cubre `0003`/`d0002`. La regresión
V2 ahora prueba la retención de la auditoría y el borrado de instancia en ambas
rutas, así como `alembic check`; debe ejecutarse en PostgreSQL 16 y 17 con los
comandos de `MIGRACIONES_ALEMBIC.md`. No se ejecutó en esta sesión porque el
entorno de trabajo no dispone de PowerShell ni de un ejecutor de comandos.
La fixture Debian continúa siendo sintética; la base real no se conectó ni se
modificó.

Las pruebas cubren ambos perfiles físicos, los flujos HTTP de registro/login/me,
consulta de instancias, cambios de suscripción, protección de cuota, checkout,
facturas y recuperación. También conservación de datos/columnas/FK/secuencias,
texto de descripción >255 solo donde TEXT lo admite, fechas con zona y lectura
con otra TimeZone, además de casos negativos de esquema y etiquetas.

La fixture de adopción representa las diferencias confirmadas. Las tablas
heredadas no gestionadas siguen siendo placeholders: no es una copia completa
de Debian y no acredita compatibilidad de todos sus consumidores externos.

Para el ensayo real: restaurar un respaldo verificable en PostgreSQL 17.11 aislado,
detener escritores, seleccionar explícitamente esa copia, capturar evidencia nueva
y ejecutar los pasos de `RECONCILIACION_DEBIAN.md`. No reutilizar un manifiesto de
otra base ni ejecutar cambios sobre Debian. Revisar `alembic check` con el ini de
adopción después del upgrade y antes de iniciar las pruebas funcionales.

Referencias: [Enum de SQLAlchemy](https://docs.sqlalchemy.org/en/20/core/type_basics.html#sqlalchemy.types.Enum),
[TypeDecorator](https://docs.sqlalchemy.org/en/20/core/custom_types.html#sqlalchemy.types.TypeDecorator),
[fechas en PostgreSQL 17](https://www.postgresql.org/docs/17/datatype-datetime.html).
