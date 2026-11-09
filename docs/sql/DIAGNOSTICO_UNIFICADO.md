# Diagnóstico previo de Debian en una sola tabla

Archivo: `debian_diagnostico_unificado_readonly.sql`, PostgreSQL 16 y 17.

1. Abrir el archivo en DataGrip y seleccionar la base correcta y su esquema `public`.
2. Preferir una conexión/transacción de solo lectura. El script contiene una sola
   consulta SELECT; no cambia automáticamente la configuración de la conexión.
3. Seleccionar **todo el archivo** y ejecutarlo como una sentencia. No ejecutar
   solamente fragmentos del WITH.
4. Exportar el único resultado a CSV con encabezados UTF-8, sin truncar `detalle`.
   Incluir todas las filas y las cinco columnas, no solamente errores.

Columnas: `categoria`, `elemento`, `verificacion`, `resultado`, `detalle`.

| Resultado | Interpretación |
| --- | --- |
| `OK` | La comprobación concreta coincide con el contrato consultado. |
| `CONSERVAR` | Diferencia heredada prevista; no implica borrado ni rediseño. |
| `PREVISTO_D0001` | Ausencia o cambio que la ruta de adopción está preparada para resolver si supera el resto de controles. |
| `BLOQUEO_D0001` | No cumple una precondición del código actual; no significa necesariamente que el esquema o los datos sean erróneos. |
| `REVISAR` | Requiere contexto o revisión; no recomienda modificar automáticamente. |
| `NO_VERIFICADO` | No se pudo comprobar por ausencia de objetos/columnas, tipos incompatibles, permisos o RLS. No equivale a cero ni a éxito. |
| `INFORMACION` | Evidencia de catálogo o contexto sin declarar un requisito nuevo. |
| `NO_AUTORIZA_MIGRACION` | El diagnóstico no es autorización para aplicar cambios. |

## Qué comprueba

- Las 21 tablas heredadas, las tres tablas pendientes y la ausencia esperada de
  `alembic_version` antes de adoptar. Conserva las tablas antiguas como política.
- El contrato físico Debian V1 (tipos, nulabilidad, PK, unicidad, índices y FK),
  contrastado con las condiciones de `d0001_adopt_debian` y separado del perfil fresh.
- Las ocho columnas heredadas confirmadas, sin inventar sus tipos o defaults.
  Informa si una columna omitida por el ORM exige un valor sin generador/default.
- Defaults SQL, identidad/generación y enums nativos con sus etiquetas y orden.
- Conteos exactos confirmados, máximos técnicos de ID, duplicidad de suscripción
  activa, referencias huérfanas, catálogo de planes, estados y coherencia del pool.
  Los chequeos de coherencia adicionales marcados REVISAR no añaden condiciones
  obligatorias a d0001 ni suponen que una reserva temporal sea un error.
- Los tres enlaces de instancia/puerto comunicados y `template_id IS NULL`.
- Secuencias principales y adicionales: lee estado, nunca llama nextval/setval.
- FK entrantes/dependencias registradas, triggers, RLS y event triggers.

Para admitir diferencias de nombres de índices/restricciones se compara su
significado. La ausencia de estructuras de facturación previstas no se presenta
como un error de datos: se distingue del esquema final que esperan los modelos.
Un INDEX no único sobre exactamente las columnas de una PK puede estar cubierto
por su índice de PK válido y listo. El informe ya reconoce esa cobertura; no
propone crear secundarios duplicados ni eliminar los existentes. La auditoría
de las 433 filas originales está en `../REVISION_BLOQUEOS_D0001.md`.
Si ya se aplicó la adopción, algunos bloqueos son esperables: este informe está
hecho para el estado **anterior** a d0001, no para validar una base ya migrada.

El contrato SQL se contrastó localmente con los modelos y las revisiones congeladas.
Si cambian esos archivos habrá que actualizar también el diagnóstico. No es un
sustituto de las verificaciones Python que ejecuta la revisión.

Los agregados de `users.role` e `instances.status` también se ejecutan cuando las
columnas son TEXT/VARCHAR: comparan etiquetas mediante `::text`. Esto permite
comprobar datos. El ORM usa ahora enums Python sobre VARCHAR(50), sin conversión SQL.
Para distinguir mayúsculas/minúsculas sin exportar valores libres, está disponible
`roles_estados_varchar_readonly.sql`.

## Privacidad y límites

No selecciona valores de email, nombres de personas, contraseñas, hashes de
contraseña, tarjetas o tokens. Los nombres de columnas sensibles aparecen solo
como metadatos de estructura. No exporta sus defaults, cuerpos de funciones,
expresiones de índices ni expresiones CHECK. Para campos no incluidos en una lista
de defaults técnicos seguros, informa la existencia de un default y omite su texto.

`query_to_xml` ejecuta exclusivamente SELECTs fijos de agregados técnicos o estado
de secuencias; no evalúa defaults ni ejecuta las funciones asociadas a triggers.
Evita consultas a tablas con RLS o sin permisos SELECT y reporta NO_VERIFICADO.
Requiere una compilación de PostgreSQL con soporte libxml.

Las secuencias pueden avanzar por otros procesos mientras se consulta. Un valor
distinto del ID máximo no demuestra por sí solo corrupción: puede deberse a caché,
operaciones revertidas o actividad concurrente, aunque no pase la precondición
estricta de d0001. Obtener el informe en un momento sin actividad de aplicación.
Las dependencias de SQL dinámico y consumidores externos necesitan revisión manual.
Un conteo cero tampoco acredita independencia ni permite eliminar una tabla.

## Qué compartir

Compartir el CSV completo, sin credenciales ni datos adicionales de usuarios.
Especialmente deben estar las filas de columnas/defaults, FK/índices, enums,
secuencias (`last_value` e `is_called`), conteos, puertos, triggers y dependencias.
Indicar si se obtuvo con la aplicación detenida y si faltaron permisos.
Si falla la ejecución, compartir el código SQLSTATE y mensaje de error sin incluir
la configuración de conexión. Un resultado incompleto no permite cerrar el diagnóstico.

Después se revisará esa evidencia antes de preparar una copia real aislada. Este
paso no ejecuta ni autoriza migraciones, stamp, cambios de defaults o limpieza.

## Validación local realizada

Se ejecutó la consulta completa en PostgreSQL 16 local ya existente, dentro de
transacciones READ ONLY terminadas con ROLLBACK: base vacía, fixture sintética
previa a adopción y fixture posterior. Las tres devolvieron una única tabla con
las cinco columnas esperadas, sin errores por ausencias. En la fixture previa
se verificaron los siete conteos y no aparecieron bloqueos de d0001. Los bloqueos
de la base ya adoptada son coherentes con el alcance previo a migración.
Se comprobó además que la salida no incluyera los datos sensibles conocidos de
las fixtures. No se ejecutaron migraciones ni conexiones con Debian. Los
contenedores de pruebas se detuvieron y sus datos quedaron intactos.

Referencias de PostgreSQL 16:
[XML y query_to_xml](https://www.postgresql.org/docs/16/functions-xml.html),
[catálogo de índices](https://www.postgresql.org/docs/16/catalog-pg-index.html),
[estado de secuencias](https://www.postgresql.org/docs/16/view-pg-sequences.html).
