# Avance histórico de users_id_seq a 11

Base: `c140244`. Rama local: `fix/debian-80-users-secuencia-11`.

## Contratos aceptados

| Inventario | Usuarios / MAX(id) | users_id_seq | Otros controles |
| --- | --- | --- | --- |
| Histórico: 3 instancias | 7 / 7 | 7, is_called=true | Sin cambios |
| Revisado: 2 instancias | 7 / 7 | 7, is_called=true | Se conserva el escenario de c140244 |
| Revisado: 2 instancias, avance confirmado | 7 / 7 | **11, is_called=true, incremento 1, sin ciclo** | Mismas tablas, asignaciones, integridad y secuencias restantes |

No se acepta una regla genérica `last_value >= MAX(id)`. Solo se añade el valor confirmado 11 al contrato del inventario de dos instancias; no se amplía el histórico de tres. Un hueco en IDs no exige reiniciar la secuencia. Con 11/true e incremento 1, el próximo valor sería 12; no se invoca `nextval` para comprobarlo.

`COUNTS` y `ASSIGNMENTS` históricos, MAX(users.id)=7, SHA256 y comparación del manifiesto bajo bloqueo se mantienen. La preservación posterior compara el estado completo capturado de cada secuencia: tanto bajarla a 7 como subirla a 12 o cambiar is_called durante la migración causa rechazo. No cambia el DDL de d0001–d0004. No hay setval, ALTER SEQUENCE, escrituras en usuarios ni omisión de comprobaciones.

## Importar el bundle incremental

En el repositorio local que ya contiene c140244, sustituir la ruta del archivo descargado. Estos comandos preparan otro worktree sin alterar la carpeta de trabajo actual:

```powershell
git fetch "RUTA_COMPLETA\Codrop_Users_Secuencia_11.bundle" fix/debian-80-users-secuencia-11
git worktree add -b revision/users-secuencia-11 ..\codrop-users11 FETCH_HEAD
```

Elegir nombres nuevos si la carpeta o rama ya existen; no borrarlas. El nuevo worktree no hereda `.env` ni el entorno virtual: activar un entorno compatible y configurar explícitamente la conexión de copia al ejecutar herramientas.

## Volver a capturar exclusivamente en la copia

Destino confirmado por el usuario: **paas_restore_test, localhost:55433, PostgreSQL 17.11**. Usar el usuario de copia ya confirmado, sin mostrar su contraseña. No usar la conexión Debian compartida ni `--use-project-database`.

Con `CODROP_MIGRATION_DATABASE_URL` apuntando explícitamente a **esa copia**, desde backend y con el entorno virtual activo:

```powershell
python -B -m alembic_debian.audit --capture .env.copy-users11-before.json
python -B -m alembic_debian.audit --verify-before .env.copy-users11-before.json
```

Ejecutar cada comando por separado y detenerse ante cualquier bloqueo. El archivo debe ser nuevo. Revisar que finalice en `Read-only verification OK` y conservar el **Evidence SHA256** impreso. No editar un manifiesto viejo ni sustituir solo su valor de secuencia.

Si se continúa el ensayo autorizado únicamente sobre esa copia y sin escrituras concurrentes, usar su nuevo manifiesto y SHA:

```powershell
python -B -m alembic -c alembic-debian.ini -x manifest=.env.copy-users11-before.json -x evidence_sha256=SHA_REVISADO_DE_LA_COPIA upgrade head
python -B -m alembic_debian.audit --verify-after .env.copy-users11-before.json
```

Sustituir el marcador SHA por el valor revisado. El destino final esperado sigue siendo `d0004_financial_history`, con datos históricos y estado de secuencias conservados, incluido users_id_seq=11/true. Si surge otro bloqueo, revisar su evidencia; no reducir controles para forzar el resultado.

Esta entrega no ejecuta esos comandos, no conecta con la copia ni modifica Debian, Docker o GitHub.

## Pruebas

Se añaden 29 casos: aceptación de estados revisados, rechazo de valores no autorizados, is_called=false, incremento incorrecto, ciclo, secuencia ausente, cambio del conteo/MAX de usuarios, alteración de otras secuencias, SHA incorrecto, deriva de secuencia antes del DDL y cambios de usuarios/secuencia en el postcheck. Se reutilizan fixtures sintéticos del preflight completo; no son un ensayo PostgreSQL real.

Desde backend:

```powershell
python -m pytest -q tests/test_debian_user_sequence.py
python -m pytest -q
```

Resultado ejecutado: **29 casos nuevos aprobados; suite completa: 289 passed, 4 skipped y 36 subtests passed**. Las cuatro omisiones requieren PostgreSQL opt-in. No se repitió frontend porque no hay cambios en él.
