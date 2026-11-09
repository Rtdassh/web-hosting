# Validacion local del worker - Rol 4

## Alcance y entorno

Prueba realizada en Windows con Docker Desktop, PostgreSQL 16 en el puerto
local 5433 y la base aislada `codrop_rol4_worker100`. Se aplicaron las
migraciones hasta `0005_financial_history` y las semillas explicitas.
La base antigua `paas_db` no se migro durante esta validacion.

## Evidencia automatizada

Comando: `python -m pytest tests -q --cov=app --cov-report=term-missing`.

- 356 pruebas y 36 subpruebas aprobadas.
- 4 pruebas omitidas: requieren habilitar PostgreSQL aislado para migraciones.
- 1 advertencia de deprecacion de TestClient.
- Cobertura global de lineas: 82%; `sync_worker.py`: 95%.
- Estos porcentajes no acreditan rendimiento, cobertura de ramas ni seguridad completa.

## Prueba real observada

1. FastAPI inicio automaticamente el worker con intervalo de 30 segundos.
2. Se registro un usuario local de prueba y se desplego un ZIP por la API.
3. Instancia 1, UUID `62e45306`, puerto 30001.
4. `docker stop 0236da5c70f7`: la consulta de instancias mostro `stopped`
   sin invocar el endpoint manual de sincronizacion.
5. Se inicio nuevamente la instancia por la API y se elimino su contenedor
   con `docker rm -f 0236da5c70f7`.
6. El worker marco la instancia como `failed`. La consulta SQL confirmo
   `is_allocated = false` e `instance_id = NULL` para el puerto 30001.
7. El historial persistio `running -> stopped` y `running -> failed`,
   incluyendo los motivos de reconciliacion.
8. Ctrl+C produjo `SyncWorker detenido correctamente` y
   `Application shutdown complete`.

La observacion se realizo esperando 30-40 segundos entre la operacion y la
consulta. No se midio la latencia exacta; no acredita un limite estricto <30s.

## Pendientes de integracion

- Se incorporo `pg_try_advisory_xact_lock(7304100)` para excluir ciclos
  simultaneos en la misma base. Una prueba local con dos conexiones reales
  confirmo que el segundo ciclo se omite mientras existe el bloqueo y puede
  ejecutarse al liberarlo. Falta probar el despliegue productivo con 4 procesos.
- El ciclo ahora consulta `running` y `stopped`. Pruebas automatizadas
  verifican `stopped -> failed` cuando desaparece el contenedor y que no se
  duplique el historial si continua detenido. Este caso adicional aun no se
  repitio con Docker real.
- Verificar recuperacion despues de indisponibilidad real de Docker.
- Repetir las pruebas relevantes si se modifica el worker y actualizar esta evidencia.
- Completar documento de arquitectura, guion de sustentacion y revision del equipo.
