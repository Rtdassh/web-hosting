# Adopción de Debian: ruta distinta de una instalación nueva

> Estado actualizado: [REVISION_BLOQUEOS_D0001.md](REVISION_BLOQUEOS_D0001.md)
> analiza las 433 filas reales y la adaptación local de los 19 bloqueos. Ver
> [ADAPTACION_ORM_DEBIAN.md](ADAPTACION_ORM_DEBIAN.md) para el contrato V1.
> Las instrucciones siguientes son para una copia aislada; no autorizan cambios en Debian.

## Decisión

La estructura comunicada NO equivale a `0001_existing_core`: tiene ocho columnas
adicionales y un `payment_transactions` incompleto. No se modifica ni se marca
esa revisión como aplicada. `0001_existing_core` y `0002_billing_admin_recovery`
permanecen congeladas y siguen siendo la ruta de instalaciones vacías.

Se incorpora `backend/alembic-debian.ini` con historial independiente:
`base → d0001_adopt_debian → d0002_admin_audit_set_null`. `d0001` se ejecuta
normalmente, no usa stamp. `d0002` sustituye únicamente la FK nueva de auditoría
por `ON DELETE SET NULL`.
La configuración bloquea stamp y las adopciones offline. Una base adoptada debe
seguir usando esta configuración; no intercambiar los dos archivos ini ni marcar
la base como head del historial de instalaciones nuevas. Las futuras revisiones
deberán planificarse para ambos historiales o converger tras acreditar equivalencia;
esta entrega no fabrica una convergencia ni oculta las columnas heredadas.
Los módulos de `alembic_debian` forman parte del contrato de esta revisión:
una vez adoptada, no cambiar su comportamiento; añadir revisiones posteriores.
La verificación `--verify-after` reconoce tanto la adopción V1 como el head V2,
manteniendo intacta la verificación histórica de `d0001`.

## Comparación y conservación

| Diferencia confirmada | Tratamiento preparado |
| --- | --- |
| `plans.billing_period/is_active/created_at` | Conservar definición y valores. No inventar tipos, periodicidad ni defaults. |
| `subscriptions.start_date/end_date/auto_renew` | Conservar. No sustituir por nuevos períodos ni recalcular fechas. |
| `instances.template_id → templates.id`, SET NULL | Conservar columna, FK, tabla destino y valores NULL. No incorporar un nuevo catálogo ORM. |
| `users.updated_at` | Conservar sin inventar una política de actualización. |
| `payment_transactions` con cinco columnas y cero filas | Completar únicamente tras verificar tipos, restricciones, defaults y estado vacío. |
| Faltan tres tablas del 80 % | Crear usando la definición congelada de `0002_billing_admin_recovery`. |
| Secuencias y enums existentes | Verificar y conservar; no reiniciar ni avanzar secuencias existentes durante la adopción. |

No es necesario mapear inmediatamente las columnas adicionales para conservarlas:
el ORM puede leer/escribir sus campos conocidos si las columnas omitidas permiten
NULL, tienen default SQL o son generadas. Si una columna heredada exige un valor
sin default, el preflight bloquea la adopción. Entonces habrá que revisar su
semántica real antes de mapearla o preparar un default aprobado. No se adivina.
Conservar `plans.is_active` no implica que el servicio actual lo filtre: esa
integración funcional sigue pendiente y no se cambia aquí.

La autogeneración protege estas columnas, sus FK e índices confirmados para no
proponer eliminarlos al compararlas con modelos que aún no las declaran. Esto no
es una declaración de equivalencia total ni una revisión de tablas antiguas.

## Completar pagos sin inventar datos

La ruta soporta un estado concreto, comprobado antes de DDL:

- `id/user_id/amount/created_at` coinciden con el perfil Debian V1: created_at es
  TIMESTAMPTZ. FLOAT sin precisión equivale a DOUBLE PRECISION; NUMERIC
  no se convierte automáticamente porque podría perder exactitud.
- `status` es VARCHAR(50) NOT NULL sin default, sin CHECK no revisado y sin triggers
  de pago. El preflight vuelve a comprobar el estado comunicado.
- Cero filas en pagos. Se conserva VARCHAR y no se crea transactionstatus. Un tipo
  nativo de ese nombre ya existente solo se conserva si sus etiquetas son las revisadas.
  No se crean pagos históricos ficticios.
- La secuencia de pagos está asociada a su ID, no ha sido utilizada (`is_called=false`),
  no es cíclica y avanza positivamente. El NULL de `pg_sequences.last_value` no
  basta para acreditarlo: también puede responder a permisos insuficientes.

La revisión añade `plan_id INTEGER NOT NULL`, `card_last_four VARCHAR(4) NOT NULL`,
`card_brand VARCHAR(20) NOT NULL`, `auth_code VARCHAR(32) NOT NULL UNIQUE`, la FK
a planes. La FK a usuarios CASCADE ya existente se exige y se conserva; no se
reemplaza ni se añade una alternativa. La PK válida cubre el índice de ID.
No se modifica ninguna columna anterior, incluido status o created_at, ni se
cambian defaults, restricciones o índices existentes.

Si hay un default de status, CHECK, tipo diferente, dependencia incompatible o
pagos nuevos, esta ruta no intenta corregirlos a ciegas: se detiene. Se necesitará
ampliar la revisión a partir de la definición real y nuevas pruebas.

## Evidencia y controles automáticos

`python -m alembic_debian.audit` ejecuta una transacción REPEATABLE READ READ ONLY.
No imprime filas: genera un manifiesto con estructura, conteos, huellas de filas,
enums, triggers y estado de secuencias. Requiere SELECT sobre tablas y secuencias.
Guardar ese archivo localmente como información interna, aunque no contenga filas
en claro; no sustituye un respaldo. Usar un nombre ignorado por Git, por ejemplo
`.env.debian-before.json`. No se sobrescribe un manifiesto existente.

Antes de adoptar, se revisan las 21 tablas, las siete cantidades comunicadas,
los enlaces de puertos e IDs, PK/FK/índices, ausencia de suscripciones activas
duplicadas, generación de IDs y seguridad de las columnas omitidas por ORM.
RLS y event triggers DDL habilitados se bloquean hasta estudiar una estrategia
que permita acreditar conservación sin efectos ocultos.

El digest SHA256 del manifiesto debe pasarse explícitamente tras revisarlo.
El digest liga el archivo a la ejecución; no certifica por sí solo una aprobación
humana ni reemplaza revisar los resultados. Dentro de la migración se bloquean
escrituras en las tablas existentes (`SHARE ROW EXCLUSIVE`, timeout de 5 segundos),
se recaptura y se compara toda la evidencia antes de modificar el esquema.
La prueba se realiza con el backend detenido; los bloqueos de tabla no impiden
por sí solos llamadas directas de otros procesos a nextval. La ausencia de escritores
y consumidores de secuencias es una condición operativa de la adopción.

Después de DDL se verifican los modelos nuevos, unicidad/FK/índices y que todas
las tablas previas conservan conteos y huellas, definiciones heredadas, enums y
secuencias. Cualquier fallo revierte la transacción completa, incluido el versionado.
Estos checks no equivalen a un respaldo ni detectan consumidores externos/dynamic SQL.

El `--verify-after` debe ejecutarse inmediatamente después, antes de iniciar la
aplicación o insertar datos nuevos: compara la base con la instantánea original.
Después de eso se hacen las pruebas funcionales y se espera que aparezcan datos nuevos.

## Información todavía necesaria de DataGrip

Ejecutar con conexión de solo lectura:

1. `docs/sql/alembic_preflight_readonly.sql`.
2. `docs/sql/debian_reconciliation_readonly.sql`.

Se necesitan los resultados completos de tipos, longitudes, precisión, zona horaria,
nulabilidad, defaults, generación de IDs, PK/FK y opciones, índices, CHECK, triggers,
event triggers y dependencias. En particular: `payment_transactions.status` y sus
dependencias; tipos/defaults de las ocho columnas heredadas; tipo de `templates.id`;
FK de pagos a usuarios; índices reales de las siete tablas; `last_value/is_called`
y asociación de cada secuencia. No compartir contraseñas, hashes o tokens.

El resumen recibido confirma nombres/datos, pero no demuestra esos detalles. Por
eso aún no se afirma que Debian pase el preflight ni que su adopción esté autorizada.

## Ensayo posterior sobre una copia real aislada

No ejecutar estos comandos contra Debian todavía. Restaurar primero un respaldo
en una base de pruebas distinta, sin servicios de aplicación activos, y configurar
`CODROP_MIGRATION_DATABASE_URL` en el entorno privado apuntando EXCLUSIVAMENTE
a esa copia. Los comandos no imprimen esa URL. Desde `backend`:

```powershell
python -B -m alembic_debian.audit --capture .env.debian-before.json
python -B -m alembic_debian.audit --verify-before .env.debian-before.json
```

Un código de salida distinto de cero es un bloqueo. El archivo se conserva incluso
si el preflight falla, para permitir revisar la evidencia. Tras revisar y resolver
todos los bloqueos, usar el SHA256 mostrado, sin modificar el manifiesto:

```powershell
python -B -m alembic -c alembic-debian.ini -x manifest=.env.debian-before.json -x evidence_sha256=SHA256_REVISADO upgrade head
python -B -m alembic_debian.audit --verify-after .env.debian-before.json
python -B -m alembic -c alembic-debian.ini current
python -B -m alembic -c alembic-debian.ini check
```

No ejecutar stamp. No se ejecutan semillas durante la adopción. Verificar las
asignaciones originales antes de iniciar el backend. Probar registro, perfil,
facturación y recuperación en la copia aislada con usuarios sintéticos separados.
Una futura ejecución en Debian necesitará autorización y repetir evidencia,
respaldo y ventana sin escritores; el éxito en la fixture no es esa autorización.

## Pruebas preparadas y límite de la fixture

El compose de migraciones incorpora una tercera base fija, local y exclusiva:
`codrop_migration_debian`. No reutiliza ninguna conexión del proyecto. En un
volumen nuevo se ejecuta, desde la raíz y con la contraseña local exclusiva ya
definida en `CODROP_TEST_POSTGRES_PASSWORD`:

```powershell
docker compose -p codrop-debian-test -f docker-compose.migrations-test.yml up -d --wait
$env:CODROP_RUN_MIGRATION_TESTS = '1'
$env:PYTHONPATH = (Join-Path (Get-Location) 'backend')
python -B -m unittest backend.tests.test_debian_reconciliation -v
docker compose -p codrop-debian-test -f docker-compose.migrations-test.yml stop
```

El test exige una base vacía y no borra ni limpia volúmenes. Un volumen inicializado
antes de añadir la tercera base no la creará automáticamente: usar un proyecto y
volumen nuevos para esta prueba, sin limpiar el anterior.

La fixture reproduce los nombres adicionales, FK `template_id SET NULL`, enums,
conteos, IDs, puertos y la tabla de pagos incompleta comunicados. Los tipos/defaults
no comunicados se representan con elecciones de prueba explícitas y las otras
tablas heredadas con placeholders mínimos: **no es una copia real ni se presenta
como su DDL confirmado**. El ensayo sobre una copia real sigue pendiente.

Se prueban ausencia de evidencia, digest incorrecto, stamp rechazado, columna
heredada obligatoria sin default, rollback por fallo posterior al DDL, conservación
de las 21 tablas y sus datos/secuencias, protección de autogeneración, creación
de las tres tablas y compatibilidad de registro/checkout/facturas con el ORM.

Resultado anterior a V2: las 25 pruebas de migraciones, reconciliación y regresión del
Rol 3 pasaron en PostgreSQL 16 aislado. También pasaron los comandos reales de
auditoría READ ONLY antes/después y el rollback provocado tras ejecutar DDL.
El contenedor se detuvo y su volumen se conservó. No se conectó con Debian.

La revisión V2 `d0002_admin_audit_set_null` y su regresión en PG16/PG17 se
incorporaron después de ese resultado y aún deben ejecutarse en ambas versiones.
La verificación `--verify-after` admite ahora d0001 y d0002; la evidencia y los
ensayos siguen limitados a copias/fixtures locales aisladas.

Referencias: [autogeneración de Alembic](https://alembic.sqlalchemy.org/en/latest/autogenerate.html)
y [ALTER TABLE de PostgreSQL 16](https://www.postgresql.org/docs/16/sql-altertable.html).
