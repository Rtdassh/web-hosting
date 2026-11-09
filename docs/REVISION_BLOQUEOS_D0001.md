# Auditoría y adaptación de los 19 bloqueos originales de d0001

## Evidencia

Se revisaron los 433 registros de `auditorias/diagnostico_codrop.txt`, conservado
sin modificaciones. SHA256:
`eee13d01ba6c37db54599bbc19e5a3634836facc3428a54f70d4e221a9f790ed`.

El resultado original contiene 105 OK, 47 PREVISTO_D0001, 33 CONSERVAR,
19 BLOQUEO_D0001, 12 REVISAR, 2 NO_VERIFICADO, 214 INFORMACION y
1 NO_AUTORIZA_MIGRACION. El servidor es PostgreSQL 17.11.

Confirmación posterior del responsable: `users.role=CLIENT` en los siete usuarios
y `instances.status=RUNNING` en las tres instancias. Esta confirmación es evidencia
adicional del usuario; no se presenta como una nueva consulta ejecutada por Codex
ni modifica el archivo original. El preflight vuelve a verificar etiquetas.

Los 19 bloqueos corresponden a 18 objetos: ocho columnas, cinco índices y cinco FK.
La FK de pagos a usuarios aparece dos veces por dos comprobaciones diferentes.

## Resolución individual

Los cambios siguientes son de mapeo/contrato local. No se transformaron filas ni
se alteraron tipos, FK o índices en Debian. La implementación y sus dos perfiles
se explican en [ADAPTACION_ORM_DEBIAN.md](ADAPTACION_ORM_DEBIAN.md).

| ID | Bloqueo original | Evidencia real | Resolución local |
| --- | --- | --- | --- |
| I1 | instances.ix_instances_id | instances_pkey válido, único y listo sobre id | PK exacta cubre el secundario no único. No crear duplicado. |
| I2 | plans.ix_plans_id | plans_pkey válido, único y listo sobre id | Mismo criterio, sin eliminar índices existentes. |
| I3 | port_allocations.ix_port_allocations_port_number | PK válida sobre port_number | La PK cubre acceso y unicidad del puerto. |
| I4 | subscriptions.ix_subscriptions_id | subscriptions_pkey válido sobre id | Aceptar la PK sin exigir otro índice. |
| I5 | users.ix_users_id | users_pkey válido sobre id | Aceptar la PK; conservar unicidad de email. |
| C1 | instances.created_at | TIMESTAMPTZ NOT NULL, CURRENT_TIMESTAMP | UTCDateTime en ORM y TIMESTAMPTZ en perfil Debian; sin conversión SQL. |
| C2 | instances.status | VARCHAR(50) NOT NULL, valores RUNNING | Enum Python con native_enum=False/length=50; nombres preservados, JSON sigue running. |
| C3 | instances.updated_at | TIMESTAMPTZ NOT NULL, CURRENT_TIMESTAMP | Mapeo UTC y nullable=False; el perfil fresh conserva su nulabilidad original. |
| C4 | payment_transactions.created_at | TIMESTAMPTZ NOT NULL | Preflight y postcheck exigen el tipo confirmado y conservan la columna completa. |
| C5 | plans.description | TEXT nullable | Modelo Text y perfil Debian TEXT; sin truncar. Perfil fresh mantiene VARCHAR(255) original. |
| C6 | subscriptions.created_at | TIMESTAMPTZ NOT NULL | Mapeo UTC consciente de zona y perfil explícito. No recalcular fechas. |
| C7 | users.created_at | TIMESTAMPTZ NOT NULL | Mismo criterio, comprobado al leer perfil y login. |
| C8 | users.role | VARCHAR(50) NOT NULL, valores CLIENT | Enum Python sobre VARCHAR; nombres preservados y respuesta JSON client. |
| F1 | instances.{user_id} | CASCADE hacia users.id, validada y no diferible | Acción explícita en modelo/perfil Debian. No reemplazar por NO ACTION. |
| F2 | payment_transactions.user_id, opciones | CASCADE hacia users.id | Comparación exacta de opciones confirmadas; conservar FK, sin ALTER. |
| F3 | payment_transactions.{user_id}, relación | La misma FK de F2 | Preflight y postcheck usan el mismo contrato; no contar una segunda FK física. |
| F4 | port_allocations.{instance_id} | SET NULL hacia instances.id | Mantener acción y nulabilidad; no sustituir por CASCADE. El servicio sigue liberando is_allocated. |
| F5 | subscriptions.{plan_id} | CASCADE hacia plans.id | Mantener explícitamente; no habilitar bajas de planes. |
| F6 | subscriptions.{user_id} | CASCADE hacia users.id | Mantener explícitamente, sin confundir cascada SQL con la del ORM. |

**Los 19 hallazgos tienen resolución local.** Eso no equivale a haber aplicado o
validado una migración contra Debian. El diagnóstico actualizado compara el
perfil físico confirmado, no supone que todo VARCHAR/TIMESTAMPTZ sea equivalente.

## Cambios coordinados

- Modelos: roles/estados sobre VARCHAR conservando enums Python, fechas UTC,
  descripción Text y acciones reales de cinco FK.
- `model_types.py`: lecturas UTC conscientes de zona y rechazo de escrituras
  ambiguas sin zona. Conexiones del backend configuradas en UTC.
- `schema_profiles_v1.py`: contrato físico versionado fresh/debian, usado sobre
  copias de metadata. No se ignoran diferencias desconocidas.
- `schema_profiles.py`: API del perfil actual; futuras revisiones no deben cambiar V1.
- Entornos Alembic: cada ini selecciona su contrato. Las revisiones 0001/0002
  permanecen intactas y el ORM funciona con su esquema original.
- Preflight: tipos, nulabilidad, defaults heredados conocidos, datos y FK exactas.
- Adopción: solo incorpora lo faltante; no convierte ni modifica las columnas
  existentes de pagos. La tabla permanece vacía durante la incorporación de campos.
- Postcheck: comprueba el perfil Debian y la conservación de todas las columnas
  anteriores, incluidas status y created_at, además de datos, secuencias y relaciones.
- Autogeneración: preserva las ocho columnas heredadas, reconoce las UNIQUE de
  email/UUID y evita secundarios redundantes sobre PK, sin cambios destructivos.

Se mantienen invoices, admin_audit_logs y password_reset_tokens como tablas nuevas
del 80 %. También se conservan invoice_receipts, audit_logs, password_resets,
templates, asignacion_puertos y las demás tablas heredadas.

## Otras comprobaciones de las 433 filas

Se revisaron todas las categorías: 28 claves, 77 columnas, 3 contexto, 23 datos,
137 defaults, 12 dependencias, 3 enums, 14 FK, 30 índices, 1 límites,
42 restricciones, 5 secuencias principales, 12 adicionales, 21 seguridad y 25 tablas.

Los conteos e IDs máximos coinciden con lo comunicado. Los puertos 14→30002,
19→30001 y 22→30003 están reservados y vinculados correctamente. No se detectaron
los huérfanos, duplicidades de suscripción o inconsistencias de puertos consultados.
La secuencia de pagos tiene last_value=1 e is_called=false, con cero pagos.

Las 21 verificaciones RLS son OK y no aparecen filas de triggers/event triggers.
Se conservan los enums nativos heredados userrole e instancestatus aunque las
columnas sean VARCHAR; no se crea transactionstatus para un pago que sigue siendo VARCHAR.

Las 12 dependencias siguen vigentes y no justifican retirar tablas. Destacan
invoice_receipts→payment_transactions, comprobantes_factura→transacciones_pago,
audit_logs/email_verifications/password_resets→users y template_id→templates.
Un conteo desconocido o cero no demuestra independencia.

Los dos NO_VERIFICADO del informe antiguo procedían del filtro de tipo del SQL,
ya corregido para ejecutar los agregados con VARCHAR. La confirmación posterior
resuelve la incertidumbre de etiquetas; el preflight no deja de comprobarlas.
El REVISAR de versión se resuelve al ensayar PostgreSQL 17.11 y mantener regresión 16.

## Dos historiales sin divergencias ocultas

Se mantienen `base → 0001 → 0002` y `base → d0001`, con contratos físicos distintos
pero representación de aplicación común. El perfil fresh conserva sus enums nativos,
fechas sin zona, VARCHAR(255) y NO ACTION del DDL congelado. Debian conserva su
estructura confirmada. La diferencia está documentada y se prueba en ambas rutas.

No usar stamp cruzado, actualizar revisiones aplicadas ni alterar V1 después de
adoptar. Un cambio posterior requiere un nuevo contrato versionado y revisiones
explícitas en ambos historiales o una convergencia justificada. Un perfil no es
un filtro general que autoriza ignorar cualquier diferencia.

## Pruebas y preparación para la copia real

**32 pruebas aprobadas en PostgreSQL 16.15 y 32 en PostgreSQL 17.11**, sin omisiones.
Incluyen instalación nueva, adopción del perfil confirmado, rollback inducido,
conservación de filas/definiciones/secuencias, autogeneración sin diff en ambos
historiales, etiquetas, UTC, texto largo, registro/login/me, instancias, suscripciones,
cuota, checkout, facturas y recuperación. El diagnóstico completo sobre la fixture
previa a adopción devuelve cero BLOQUEO_D0001 y cero NO_VERIFICADO.
Los contenedores quedaron detenidos y sus volúmenes se conservaron. No se conectó
con Debian ni se ejecutaron migraciones sobre él.

La fixture representa las diferencias confirmadas del backend, pero las tablas
heredadas no gestionadas siguen siendo placeholders. No es un dump completo de
Debian. El éxito sintético permite preparar el ensayo, no declarar producción lista.

**Estamos preparados para probar d0001 sobre una copia real aislada**, después
de restaurarla y superar su preflight. El ensayo con esa copia aún no se ejecutó.

Pasos necesarios:

1. Obtener un respaldo verificable y restaurarlo en PostgreSQL 17.11 aislado,
   con acceso restringido a datos y sin escritores/aplicaciones activos.
2. Seleccionar explícitamente esa copia; no reutilizar una conexión ni un manifiesto
   de producción. Ejecutar auditoría READ ONLY y capturar un manifiesto nuevo.
3. Revisar el preflight y el perfil, defaults y dependencias. Los defaults SQL
   minúsculos client/pending se conservan: el ORM escribe miembros explícitos,
   pero deben coordinarse otros escritores que omitan esos campos.
4. Ensayar d0001 solo en la copia; comprobar conservación antes/después e incorporación
   de las tres tablas. No ejecutar semillas durante la adopción.
5. Revisar `alembic check` con el ini de adopción y ejecutar pruebas funcionales
   sobre cuentas sintéticas separadas. Confirmar UTC y ausencia de truncamiento.
6. Entregar el informe del ensayo. Debian continúa pendiente de autorización.

No se cambia la política financiera por conservar CASCADE: las bajas de usuarios
y planes siguen requiriendo revisión específica. No se probaron borrados de datos
existentes como parte de esta adaptación.

Referencias: [Enum de SQLAlchemy](https://docs.sqlalchemy.org/en/20/core/type_basics.html#sqlalchemy.types.Enum),
[TypeDecorator](https://docs.sqlalchemy.org/en/20/core/custom_types.html#sqlalchemy.types.TypeDecorator),
[fechas de PostgreSQL 17](https://www.postgresql.org/docs/17/datatype-datetime.html).
