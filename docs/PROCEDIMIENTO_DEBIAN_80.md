> **Actualización del 3 de noviembre de 2026:** La migración
> de PostgreSQL en Debian se completó y se verificó en
> `d0004_financial_history (head)`.
> Consultar [Estado de la migración](ESTADO_MIGRACION_DEBIAN_80.md).
> Las referencias posteriores a una migración pendiente
> corresponden al estado histórico de preparación.

---
# DiagnÃ³stico y preparaciÃ³n de migraciÃ³n Debian â€” hito 80 %

Referencia integrada: `development` f1012229960e80fd6f2404e0ff5b76cede60163d.
Las correcciones se preparan desde DB sincronizada localmente; nunca aplicar la lÃ­nea Fresh a Debian ni usar stamp para eludir validaciones.

## Estado y lÃ­mites

El usuario confirmÃ³ que las migraciones del 80 % no se han ejecutado en Debian. Esto no demuestra quÃ© columnas faltan: algunas ya existÃ­an en el esquema legado.
Desde el entorno de preparaciÃ³n no hay endpoint SSH configurado, cliente/socket Docker compartido ni credenciales PostgreSQL. No se ha diagnosticado el servidor real, generado/restaurado un respaldo ni aplicado d0001â€“d0004.

Las secciones de respaldo y copia estÃ¡n preparadas para ejecutar en Debian cuando se confirme la identidad. La secciÃ³n de migraciÃ³n real necesita autorizaciÃ³n explÃ­cita posterior al ensayo. No copiar comandos de copia sustituyendo la URL por la de producciÃ³n.

## 1. Identidad antes de consultar

En la terminal Debian y desde tu checkout del proyecto, identifica **sin mostrar contraseÃ±as** el host/puerto PostgreSQL, el nombre de base y el usuario utilizados por el backend. No publiques `.env`, `DATABASE_URL`, `docker inspect` completo ni `docker compose config` completo.

Si el backend usa su entorno virtual, desde `backend/` este comando solo lee su configuraciÃ³n local; no conecta a PostgreSQL:

```bash
python - <<'PY'
from app.core.config import settings
print('Servidor:', settings.POSTGRES_SERVER)
print('Puerto:', settings.POSTGRES_PORT)
print('Base:', settings.POSTGRES_DB)
print('Usuario:', settings.POSTGRES_USER)
PY
```

Ejecutarlo con el mismo entorno y checkout del backend es esencial. Si usa contenedor, estos valores locales pueden ser distintos; confÃ­rmalo antes de seguir.

Una vez confirmados esos datos, sustituye los cuatro valores del siguiente comando, desde `backend/` de esta rama de correcciones:

```bash
python tools/diagnose_debian_readonly.py --host SERVIDOR_CONFIRMADO --port 5432 --database BASE_CONFIRMADA --user USUARIO_CONFIRMADO
```

El programa muestra el destino y exige escribir `LEER` **antes de conectarse**. Pide la contraseÃ±a sin mostrarla, fuerza `default_transaction_read_only=on`, usa snapshot REPEATABLE READ, comprueba identidad efectiva y guarda el inventario, versiÃ³n Alembic, hashes por tabla/secuencias, diferencias de columnas/FKs, triggers y conteos de integridad. No exporta filas ni contraseÃ±as. Conserva el JSON como evidencia privada y comparte solo ese diagnÃ³stico, nunca el dump.

Si no puedes obtener esta rama todavÃ­a, desde tu checkout actual puedes empezar con la identidad y el archivo ya versionado `docs/sql/debian_diagnostico_unificado_readonly.sql`. Confirma host/base/usuario **antes** de abrir psql; ejecÃºtalo con `PGOPTIONS='-c default_transaction_read_only=on'` y `-X -v ON_ERROR_STOP=1`. Si la evidencia no coincide con el estado actual, se detiene el procedimiento.

## 2. Cambios oficiales que se compararÃ¡n con el diagnÃ³stico

| RevisiÃ³n | DDL previsto | Condiciones que no deben omitirse |
| --- | --- | --- |
| d0001_adopt_debian | Completa `payment_transactions` con plan_id, card_last_four, card_brand, auth_code; agrega FK a plans y UNIQUE auth_code; crea invoices, admin_audit_logs y password_reset_tokens con Ã­ndices/FKs | Manifiesto revisado y SHA; inventario exacto de 21 tablas; conteos congelados (7 users, 3 plans, 7 subscriptions, 3 instances, 100 puertos y asignaciones, 0 pagos); asignaciones especÃ­ficas; tipos, FKs y datos sin deriva |
| d0002_admin_audit_set_null | FK admin_audit_logs.target_instance_id â†’ instances.id con ON DELETE SET NULL | RevisiÃ³n anterior y estructura esperada |
| d0003_subscription_period | AÃ±ade current_period_start/current_period_end TIMESTAMPTZ nullable en subscriptions y pdf_metadata JSONB nullable en invoices | Campos legados de plans y subscriptions ya presentes y vÃ¡lidos; no inventa perÃ­odos histÃ³ricos |
| d0004_financial_history | AÃ±ade plan_name_snapshot VARCHAR(50) nullable; cambia FKs user_id de pagos/facturas a RESTRICT; crea funciÃ³n y cuatro triggers que rechazan UPDATE/DELETE/TRUNCATE | Tablas y restricciones exactas; sin nombres de triggers/funciÃ³n en conflicto; comprobaciones de conservaciÃ³n |

`plans.billing_period`, `plans.is_active`, `plans.created_at` y `subscriptions.start_date/end_date/auto_renew` se esperan como legado en esta lÃ­nea; d0003 **no los crea**. Si faltan, hace falta revisar una reconciliaciÃ³n especÃ­fica, no mezclar con 0004 Fresh.

Si el pago legado contiene filas, d0001 bloquea la adopciÃ³n porque sus cuatro columnas nuevas son NOT NULL y no se permite inventar informaciÃ³n histÃ³rica. Si cambiaron conteos/asignaciones, tambiÃ©n bloquea. No borrar filas, cambiar conteos esperados, desactivar triggers o hacer stamp para conseguir que pase.

## 3. Respaldo completo de la base confirmada

Estos comandos crean archivos de respaldo; no modifican la base de origen. Usar pg_dump de la misma versiÃ³n mayor del servidor o una compatible mÃ¡s reciente. Elegir una carpeta nueva y privada y no subirla a GitHub. Sustituir host, puerto, base y usuario por los confirmados.

```bash
umask 077
mkdir -p "$HOME/codrop-backups-80"
pg_dump -h SERVIDOR_CONFIRMADO -p 5432 -U USUARIO_CONFIRMADO -W -d BASE_CONFIRMADA -Fc --verbose -f "$HOME/codrop-backups-80/codrop_before_80.dump"
sha256sum "$HOME/codrop-backups-80/codrop_before_80.dump"
pg_restore --list "$HOME/codrop-backups-80/codrop_before_80.dump" > "$HOME/codrop-backups-80/codrop_before_80.list"
```

No usar filtros `--schema`, `--table` o exclusiones: deben entrar todas las tablas y objetos de la base, incluidas las heredadas. Antes de ejecutar, comprobar que el archivo de destino no exista para no sobrescribir un respaldo anterior. Registrar versiÃ³n del servidor, versiÃ³n de pg_dump, SHA256 y ruta. Con permisos suficientes, guardar tambiÃ©n roles/atributos sin hashes de contraseÃ±as:

```bash
pg_dumpall -h SERVIDOR_CONFIRMADO -p 5432 -U USUARIO_CONFIRMADO -W --globals-only --no-role-passwords -f "$HOME/codrop-backups-80/globals_without_passwords.sql"
```

El dump contiene datos privados, incluidos hashes guardados por la aplicaciÃ³n; permanecerÃ¡ en el host controlado. Ver el listado o calcular un SHA256 no demuestra restaurabilidad. Eso exige la restauraciÃ³n siguiente.

## 4. RestauraciÃ³n de prueba en un proyecto Docker nuevo

Ejecutar en una mÃ¡quina autorizada con Docker. El proyecto debe ser nuevo; inspeccionar primero `docker compose ls` y no reutilizar un proyecto/volumen existente. El puerto 55439 debe estar libre. No elimina ni reinicia contenedores de la plataforma.

Desde la raÃ­z del repo, elegir la versiÃ³n mayor confirmada de PostgreSQL (16 o 17) y una contraseÃ±a **exclusiva** de ensayo:

```bash
export CODROP_REHEARSAL_POSTGRES_MAJOR=16
read -rsp 'ContraseÃ±a exclusiva de ensayo: ' CODROP_REHEARSAL_PASSWORD
export CODROP_REHEARSAL_PASSWORD
docker compose -p codrop80-rehearsal -f docker-compose.codrop-rehearsal.yml up -d
docker compose -p codrop80-rehearsal -f docker-compose.codrop-rehearsal.yml ps
docker compose -p codrop80-rehearsal -f docker-compose.codrop-rehearsal.yml cp "$HOME/codrop-backups-80/codrop_before_80.dump" postgres-copy:/tmp/codrop_before_80.dump
docker compose -p codrop80-rehearsal -f docker-compose.codrop-rehearsal.yml exec -T postgres-copy pg_restore -U codrop_rehearsal -d codrop_restore_80 --no-owner --no-privileges --exit-on-error --single-transaction /tmp/codrop_before_80.dump
```

Esperar healthcheck antes de restaurar. No usar `--clean` sobre una base existente. Si hay extensiones, tablespaces o dependencias externas no disponibles, la restauraciÃ³n debe fallar y el respaldo no se marca validado todavÃ­a. `--no-owner --no-privileges` adapta propiedad/ACL exclusivamente en la copia; conservar aparte roles/ACL originales para recuperaciÃ³n real. Esa diferencia no autoriza alterar permisos en producciÃ³n.

El dump se obtuvo con snapshot propio. Para comparar hashes exactos con la captura de diagnÃ³stico hay que coordinar una pausa de escrituras de la aplicaciÃ³n y volver a capturar antes/despuÃ©s de pg_dump; sin una ventana estable, una diferencia puede ser actividad legÃ­tima y no pÃ©rdida. No detener aplicaciones compartidas sin autorizaciÃ³n. Mantener la ventana de escrituras detenidas tambiÃ©n durante una eventual migraciÃ³n real para evitar deriva del manifiesto.

Contra `127.0.0.1:55439`, base **codrop_restore_80**, usuario **codrop_rehearsal**, ejecutar el diagnÃ³stico de solo lectura y comparar con el del origen: todas las tablas, conteos, hashes, columnas, FKs, secuencias y objetos esperados. Confirmar explÃ­citamente tablas heredadas y filas de historia. No basta comparar solo users/plans.

## 5. Ensayo d0001â€“d0004 exclusivamente en la copia

Solo continuar si el respaldo restaurÃ³ sin errores, la copia coincide con la captura de origen y el diagnÃ³stico acepta el perfil esperado. Si aparece otra versiÃ³n Alembic, decidir el punto de partida segÃºn su historial real.

En `backend/`, definir `CODROP_MIGRATION_DATABASE_URL` **Ãºnicamente para codrop_restore_80 en 127.0.0.1:55439**. Usar la contraseÃ±a exclusiva de ensayo; no escribirla en historial de shell ni compartirla. Se puede cargar con getpass y `URL.create` desde un proceso Python que ejecute Alembic en el mismo proceso. La herramienta de diagnÃ³stico no ejecuta migraciones.

El manifiesto para Alembic es el objeto `evidence` del diagnÃ³stico de la **copia**, no el JSON completo del informe. Extraerlo a `.env.codrop-copy-before.json` y revisar su SHA. Una vez configurada la URL exclusiva de ensayo:

```bash
python -B -m alembic_debian.audit --capture .env.codrop-copy-before.json
python -B -m alembic_debian.audit --verify-before .env.codrop-copy-before.json
python -B -m alembic -c alembic-debian.ini -x manifest=.env.codrop-copy-before.json -x evidence_sha256=SHA256_REVISADO upgrade head
python -B -m alembic_debian.audit --verify-after .env.codrop-copy-before.json
```

La captura oficial imprime su SHA de contenido; no confundirlo con `sha256sum` de un JSON con formato distinto. Detenerse si falla cualquier comando; ejecutar uno por uno, no pegar una secuencia que continÃºe tras errores.

En la copia comprobar `d0004_financial_history`, nuevas columnas/FKs y cuatro triggers habilitados. Las comprobaciones oficiales normalizan solo las columnas nuevas y contrastan hashes/filas/tablas/secuencias existentes. Crear datos sintÃ©ticos de pagos en la copia **despuÃ©s** de verificar la conservaciÃ³n histÃ³rica. Probar rechazo de UPDATE/DELETE/TRUNCATE sobre datos sintÃ©ticos dentro de transacciones de ensayo. No hacer estas pruebas de escritura en Debian real.

El flujo registro â†’ login â†’ Free â†’ pago â†’ factura â†’ cambio de plan â†’ ZIP/plantilla â†’ HTTP 200 requiere ademÃ¡s Docker de pruebas y volÃºmenes/directorios separados. La prueba SQLite con Docker simulado valida la aplicaciÃ³n, no demuestra la ejecuciÃ³n de Nginx ni las migraciones PostgreSQL.

## 6. Punto obligatorio de autorizaciÃ³n para Debian real

Presentar antes de solicitar autorizaciÃ³n:

- Identidad confirmada, diagnÃ³stico actual y diferencias exactas.
- Respaldo completo, SHA256, restauraciÃ³n sin errores y comparaciÃ³n de conservaciÃ³n.
- Resultado del ensayo con el mismo cÃ³digo d0001â€“d0004, verificaciÃ³n histÃ³rica y pruebas de negocio de la copia.
- RevisiÃ³n Alembic de partida, destino y comandos concretos; ventana coordinada sin escrituras.
- Plan de recuperaciÃ³n: detener escrituras, restaurar el dump verificado en una base nueva, validar conteos/hashes y cambiar la conexiÃ³n de forma controlada. Los downgrade oficiales se bloquean por diseÃ±o; no prometer una reversiÃ³n destructiva con Alembic.

**No aplicar ninguna migraciÃ³n real hasta recibir autorizaciÃ³n explÃ­cita.** Un ensayo sintÃ©tico o los tests anteriores no certifican el respaldo de la base real.

## Docker real: comando de lectura

Desde la raÃ­z de esta rama, en el equipo donde Docker funciona:

```bash
python infra/scripts/diagnose_docker_readonly.py
```

Se necesita el JSON con contexto, estados/ExitCode/Error, usuario de contenedor, montajes, puertos y Ãºltimos logs de Nginx/Codrop. No cambia contenedores ni exporta variables de entorno. Los logs pueden contener IP o rutas; revisar esos campos antes de compartir. Con ese resultado se podrÃ¡ distinguir imagen stock con configuraciÃ³n incompatible non-root, permisos/PID/directorios temporales, bind mount equivocado, contenido faltante, conflicto de puertos u otra causa concreta del exit 1. Sin logs reales son hipÃ³tesis, no diagnÃ³sticos confirmados.

