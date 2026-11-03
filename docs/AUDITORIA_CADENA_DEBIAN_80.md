# Verificar d0001–d0004 desde el manifiesto original

Base: `5635f67`. Rama local: `fix/debian-80-auditoria-cadena`.

## Corrección

`--verify-after` distingue el manifiesto original de 21 tablas de una evidencia intermedia. Si recibe el original, usa una verificación acumulada para la revisión alcanzada (d0001, d0002, d0003 o d0004). La verificación V4 individual se conserva para evidencia realmente tomada antes de V4.

El resultado completo tiene **24 tablas de negocio más alembic_version = 25**. `capture()` excluye alembic_version por diseño: la comparación correcta es 21 originales + 3 tablas nuevas, no 21 contra 24.

La normalización solo modifica copias en memoria y revierte exclusivamente cambios ya validados:

- d0002: comprueba la FK de auditoría SET NULL antes de representar su estado anterior.
- d0003: comprueba tipos, nulabilidad y ausencia de default/generadores de períodos/JSONB; exige valores NULL y calcula hashes de datos anteriores excluyendo únicamente las columnas añadidas.
- d0004: comprueba FKs financieras RESTRICT, columna snapshot, cuatro triggers habilitados con sus tablas/eventos/función y fuente de la función de inmutabilidad. Después normaliza esas adiciones, sin ocultar triggers existentes alterados.
- Finalmente reutiliza el checker estructural congelado de d0001 y la comparación con el manifiesto original: datos/hashes, columnas, tablas heredadas, FKs, restricciones, índices y secuencias antiguas.

También verifica que las tres tablas nuevas sigan vacías, sus columnas/generadores sean los previstos, las tres secuencias nuevas conserven su estado inicial y no existan tablas/secuencias/enums/event triggers inesperados o RLS añadido. Es una verificación posterior a la migración **antes de introducir datos de negocio/prueba**.

No se fabrican manifiestos intermedios con datos históricos tomados del estado actual. El original no se modifica. Las revisiones oficiales, las transacciones de solo lectura y los controles SHA256/deriva previos al DDL permanecen intactos.

## Uso sobre la copia YA migrada

Importar el bundle incremental desde un repositorio local que contenga `5635f67`:

```powershell
git fetch "RUTA_COMPLETA\Codrop_Auditoria_Cadena_Debian.bundle" fix/debian-80-auditoria-cadena
git worktree add -b revision/auditoria-cadena ..\codrop-auditoria-cadena FETCH_HEAD
```

Usar nombres nuevos si esos destinos ya existen. El nuevo worktree no hereda entorno virtual, `.env` ni manifiestos; conservar el original y señalar su ruta absoluta.

Desde `backend/`, con el entorno Python activo, configurar exclusivamente la conexión de la copia **paas_restore_test, localhost:55433**, con el usuario ya confirmado. Se necesita `CODROP_MIGRATION_DATABASE_URL` en ese proceso; no usar `--use-project-database`. Antes de consultar puede mostrarse únicamente su identidad configurada, sin contraseña:

```powershell
python -c "from app.core.migration_config import migration_url; u=migration_url(); print('Servidor:',u.host); print('Puerto:',u.port); print('Base:',u.database); print('Usuario:',u.username)"
```

Tras confirmar esos datos, ejecutar **solo** lo siguiente, sustituyendo el marcador por la ruta del manifiesto original anterior a d0001:

```powershell
python -B -m alembic_debian.audit --verify-after "RUTA_MANIFIESTO_ORIGINAL_PRE_D0001.json"
```

Si la conexión se configuró en el runner Python con getpass de las guías anteriores, usar ese mismo runner y reemplazar sus llamadas finales por una única llamada a `--verify-after` con el manifiesto original. La variable de conexión vive solo en ese proceso; no mostrarla ni copiar contraseñas al historial.

Resultado esperado: `Read-only verification OK.` y código de salida 0. Si aparece otro bloqueo, conservar la salida y revisar la diferencia. **No repetir upgrade head, --capture ni --verify-before sobre esta copia migrada; no crear un manifiesto nuevo que sustituya la evidencia original.**

Esta entrega no se conecta a la copia ni a Debian, no ejecuta migraciones y no modifica Docker o GitHub.

## Pruebas

La regresión reproduce exactamente el rechazo anterior de V4 al pasarle las 21 tablas originales y comprueba la ruta corregida de `audit.main()`. Incluye ambos inventarios revisados y las cuatro etapas. Detecta alteraciones de datos históricos, conteos, FKs, columnas/defaults, secuencias, tablas nuevas, función/triggers, RLS, enums y event triggers. Comprueba que evidencia y captura no se mutan y que el CLI ejecuta únicamente SELECT/SET TRANSACTION en los dobles SQL.

```powershell
python -m pytest -q tests/test_debian_complete_audit.py
python -m pytest -q
```

Las pruebas usan catálogos y respuestas SQL sintéticos; no se presentan como una ejecución contra PostgreSQL real. No hay cambios de frontend.

Resultado ejecutado: **41 pruebas nuevas aprobadas; suite completa: 330 passed, 4 skipped y 36 subtests passed**. Las cuatro omisiones son integraciones PostgreSQL opt-in; no se conectó a PostgreSQL ni se ejecutó DDL en esta entrega.
