# Codrop: correcciones del hito 80 % y preparación de PostgreSQL

**Fecha:** 3 de noviembre de 2026, Guatemala. Objetivo del 80 %: hoy. Hito 100 %: viernes 6 de noviembre.

## Resultado actual

Se prepararon correcciones en `fix/codrop-80-integracion`, desde `development` f1012229960e80fd6f2404e0ff5b76cede60163d. El remoto `DB` estaba 22 commits detrás y sin commits exclusivos; se creó DB local desde de07fbd17200f5688e2158a1943319169c5b3477 y se avanzó mediante fast-forward antes de abrir la rama de correcciones. No se sobrescribe ni integra directamente `development`, ni se reemplazan cambios remotos de DB.

La aplicación tiene correcciones probadas, pero el cierre real del hito sigue pendiente de diagnóstico/migración de la base compartida y del ensayo con Docker/Nginx reales. No se conecta una prueba de pago a Debian.

## Acceso real comprobado

| Recurso | Resultado | Consecuencia |
| --- | --- | --- |
| GitHub | Lectura de development/DB y checkout local disponibles | Se reutilizó la auditoría; no se repitió completa |
| PostgreSQL Debian | No hay endpoint SSH configurado ni host/base/usuario reales confirmados en este entorno | No se conectó ni se hizo ninguna consulta al servidor real |
| Docker del usuario | No hay CLI/socket compartido ni contexto remoto configurado aquí | No se listaron, reiniciaron ni eliminaron sus contenedores; no se leyeron sus logs |
| PostgreSQL aislado aquí | El intento normal de iniciar servidor embebido falló por permisos para su usuario de servicio; instalación de PostgreSQL del sistema tampoco estuvo disponible | No hubo restauración de dump, ensayo d0001–d0004 ni pruebas de triggers en servidor PostgreSQL |

El usuario confirmó que no se han ejecutado las migraciones del 80 % en Debian. Todavía **no hay evidencia actual para enumerar faltantes reales**. El procedimiento nuevo identifica qué debería agregar cada revisión y el diagnóstico calcula las diferencias al recibir acceso/resultado.

## Correcciones de código y configuración

| Hallazgo | Cambio preparado | Prueba y límites |
| --- | --- | --- |
| A01: enlace de recuperación | App lee `reset_token`, abre el formulario incluso con sesión previa y retira el token de la URL. ForgotPassword muestra confirmación genérica, no espera token simulado. SMTP documentado y pasado por Compose | Dos entradas de navegación y recuperación existente aprobadas; entrega SMTP real pendiente |
| A02: bypass de cuota/vigencia | Downgrade cuenta todos los sitios salvo FAILED, incluidos detenidos. Start/restart comprueban suscripción, vigencia y cuota; un FAILED que se reanima consume plaza | Regresiones con BD SQLite y Docker doble; concurrencia real pendiente |
| A03: éxitos simulados Docker | Sin daemon no se genera un contenedor mock ni se informa éxito de acciones/sync. Imagen de hosting ausente falla en vez de usar Nginx stock con configuración non-root incompatible | Pruebas de indisponibilidad y de imagen ausente aprobadas; daemon real pendiente |
| A04: ZIP | Rollback antes de reutilizar sesión; instancia y vínculo de puerto con un solo commit. Compensación cubre mkdir/flush/link/commit y conserva puerto si no se pudo eliminar contenedor. Colisión de carpeta no elimina contenido existente | Fallos inyectados y fallo de flush real de SQLAlchemy aprobados; filesystem de prueba solamente |
| A05: frontend/backend | Respeta VITE_API_URL; fallback `/api/v1`; Vite reenvía `/api` y Nginx conserva proxy. Se retira login demo automático sin usos | Pruebas de resolución de URL y build aprobados |
| A06: renovación | Perfil incluye vigencia/fecha; UI permite comprar nuevamente el mismo plan vencido | Perfil vencido y botón de renovación aprobados |
| A07: plan desactivado y fallback Free | Se rechaza plan desactivado; plantilla exige una suscripción como ZIP | Pruebas aprobadas. Se conserva compatibilidad de planes pagados heredados sin fechas hasta conocer datos reales |
| A08: despliegue/configuración | Compose exige secretos; Settings rechaza los antiguos placeholders conocidos; SMTP explícito, `.dockerignore` excluye `.env`; frontend se compila en una etapa de build; Swagger proxy corregido; README ya no promete seed/demo automático y script verifica endpoint de negocio | Configuración Python probada, YAML leído y shell validado. Docker build/Compose real pendientes; no se desplegó |
| A09: catálogo | Solo aparecen planes que entrega la API; metadatos visuales por nombre, sin mezclar IDs; error de catálogo no deja compras ficticias | Catálogo parcial, error y renovación aprobados |
| A10: métricas | Recolector real empaquetado dentro del backend; fallback deja de devolver cifras saludables inventadas | Import de paquete y Docker indisponible aprobados; métricas en host real pendientes |
| A11: verificación incompleta | Endpoint responde 501 sin consultar ni modificar usuarios | Regresión aprobada. Verificación formal permanece para el 100 % |

**Política de cuota usada:** un sitio detenido conserva su plaza; borrarlo la libera. Sigue el conteo que ya usaban ZIP/perfil y la sección T4.2. El plan original tenía otra frase que permitía detener excedentes; se documenta la elección para revisión. Las instancias FAILED no consumen plaza, pero reactivarlas sí.

## Pruebas ejecutadas

| Validación | Resultado |
| --- | --- |
| Backend antes de cambios | 194 passed, 4 skipped, 36 subtests |
| Backend final | **222 passed, 4 skipped, 36 subtests** |
| Frontend antes de cambios | 49 passed |
| Frontend final | **56 passed**, 11 archivos |
| Compilación frontend | Aprobada |
| Sintaxis Python, shell modificado y whitespace Git | Aprobados |
| PostgreSQL/migraciones/triggers reales | No ejecutados |
| Imagen Docker/Nginx/Compose real | No ejecutados |

Las cuatro omisiones corresponden a pruebas de integración PostgreSQL opt-in. Entorno de ejecución: Python 3.12, dependencias compatibles con los rangos del repo instaladas en venv aislado; no equivale al Python 3.11 del equipo ni a una imagen productiva. Aparecieron dos avisos de dependencias: transición de TestClient/httpx y deprecación de `crypt` de passlib; no fallaron pruebas.

Comandos desde las carpetas correspondientes:

```bash
# backend/, con el entorno virtual de pruebas activado
python -m pytest -q

# frontend/
npm test -- --maxWorkers=2 --minWorkers=1
npm run build
```

`test_codrop_80_regressions.py` incluye registro → login → Free → pago simulado → factura → downgrade → ZIP → HTTP 200, con SQLite efímera y extracción ZIP real. El HTTP se sirve mediante Python como **doble explícito de Docker**. No se sustituye por ello el ensayo pendiente con PostgreSQL y Nginx reales.

## PostgreSQL: procedimiento preparado, todavía sin ejecutar

Ver [PROCEDIMIENTO_DEBIAN_80.md](PROCEDIMIENTO_DEBIAN_80.md).

- `backend/tools/diagnose_debian_readonly.py` exige host/base/usuario, los muestra y pide confirmarlos antes de conectar. Fuerza transacciones PostgreSQL de solo lectura y genera diferencias de tablas/columnas/FKs, triggers, versión Alembic, conteos y fingerprints sin exportar contraseñas ni filas.
- Compara tanto modelos ORM como el contrato oficial Debian. Muestra diferencias de tipos/nulabilidad como evidencia a revisar, sin corregirlas automáticamente.
- `docker-compose.codrop-rehearsal.yml` crea un proyecto de copia separado en localhost:55439, sin montar el socket Docker ni el almacenamiento de usuarios.
- El procedimiento cubre dump completo, checksum, restauración en copia, comparación de tablas/hashes/secuencias, ensayo de d0001–d0004, verificación posterior y recuperación mediante restauración. Verificar listado del dump no se considera prueba de restaurabilidad.
- d0001 exige 21 tablas, pagos vacíos, conteos/asignaciones congelados y manifiesto sin deriva. **No se relajaron esos controles ni se modificaron las revisiones oficiales.** Si no coinciden, se necesita revisión específica.

Para determinar qué falta realmente, obtener el JSON de diagnóstico actual. Los cambios previstos por la línea oficial son: completar cuatro campos de pagos y su FK/UNIQUE; crear invoices/admin_audit_logs/password_reset_tokens; corregir FK de auditoría; agregar períodos y metadata; snapshot del nombre; FKs financieras RESTRICT; función y cuatro triggers de inmutabilidad. Algunas columnas de plans/subscriptions se esperan ya presentes como legado y no son creadas por esa línea.

No se garantiza todavía que los datos históricos del servidor real estén conservados en un respaldo restaurado: falta hacerlo. Los guardas y pruebas unitarias de preservación no reemplazan esa evidencia.

## Docker/configuración: qué está comprobado y qué falta

Se corrigieron causas de código capaces de ocultar indisponibilidad o escoger una imagen incompatible. La causa real de sus contenedores con ExitCode 1 sigue sin confirmar. Necesitamos estado, logs de Nginx, imagen/usuario, bind mounts, puertos y permisos del origen.

Herramienta preparada: `python infra/scripts/diagnose_docker_readonly.py`, desde la raíz del repo en el equipo que posee Docker. No hace exec/restart/remove ni vuelca Config.Env. Los logs pueden contener IP/rutas; revisar esos campos antes de compartirlos.

## Pendientes y autorizaciones

1. Confirmar destino real y obtener diagnóstico de PostgreSQL y Docker. Sin eso no se atribuyen fallos concretos al esquema ni al host.
2. Generar respaldo real y probar su restauración con comparación de historia/legado/secuencias. Obtener pausa coordinada de escrituras si se requieren fingerprints idénticos; no detener aplicaciones compartidas por cuenta propia.
3. Ensayar las migraciones y el flujo real en la copia. Verificar Nginx UID 101, imagen configurada, puertos y lectura del contenido montado; no usar la base compartida para compras sintéticas.
4. Presentar evidencia y solicitar autorización **antes de migrar Debian real**. Cualquier reinicio/eliminación de contenedores existentes, restauración sobre un destino existente o pruebas de pago en la BD compartida también necesitan autorización.
5. Integrar la rama revisada mediante DB y el flujo del equipo. El trabajo no modifica directamente development ni actualiza el remoto DB.
6. Riesgos conservados para revisión: checkout sin idempotencia; ausencia de unicidad de suscripción activa y serialización completa de despliegues concurrentes; pagos heredados sin vencimiento; semántica de impuesto y crédito por renovación anticipada; límites RAM/CPU de contenedores ya creados no se recalculan con el cambio de plan.

## Comandos inmediatos para continuar

Primero, en **Debian, carpeta backend y su entorno virtual actual**, mostrar únicamente la configuración de identidad (sin conexión y sin contraseña):

```bash
python -c "from app.core.config import settings as s; print('Servidor:',s.POSTGRES_SERVER); print('Puerto:',s.POSTGRES_PORT); print('Base:',s.POSTGRES_DB); print('Usuario:',s.POSTGRES_USER)"
```

Si la aplicación se ejecuta en contenedor, confirmar que esos valores corresponden a ese contenedor. En el equipo de Docker:

```bash
docker context show
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

Con esos resultados se concreta el destino del diagnóstico. No enviar contraseñas, `.env`, URLs con credenciales ni backups.

## Entrega local y publicación pendiente

Las correcciones están confirmadas en la rama local `fix/codrop-80-integracion`. El push fue rechazado por la revisión automática porque consideró vigente la prohibición inicial de modificar GitHub. No se intentó publicar por otro mecanismo. Hace falta autorización explícita para subir únicamente esa rama; DB y development remotas siguen sin modificarse.

Se entrega un Git bundle incremental y un patch con los cambios. El bundle requiere tener el commit base f101222 de development. Después de descargarlo, en el repositorio local se puede preparar otro worktree sin alterar la carpeta de trabajo actual:

```powershell
git fetch origin
git worktree add -b revision/codrop-80 ..\codrop80-revision f1012229960e80fd6f2404e0ff5b76cede60163d
git -C ..\codrop80-revision fetch "RUTA_COMPLETA\Codrop_80_Correcciones.bundle" fix/codrop-80-integracion
git -C ..\codrop80-revision merge --ff-only FETCH_HEAD
```

Sustituir solo la ruta completa del bundle. Si ya existen esa rama o carpeta, elegir un nombre nuevo; no borrarlas. El worktree nuevo no hereda `.env` ni credenciales y no ejecuta nada automáticamente. El patch es una alternativa para revisión; no aplicarlo encima del bundle porque contiene los mismos cambios.
