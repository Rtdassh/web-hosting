> **Actualización del 3 de noviembre de 2026:** La migración
> de PostgreSQL en Debian se completó y se verificó en
> `d0004_financial_history (head)`.
> Consultar [Estado de la migración](ESTADO_MIGRACION_DEBIAN_80.md).
> Las referencias posteriores a una migración pendiente
> corresponden al estado histórico de preparación.

---
# Codrop: correcciones del hito 80 % y preparaciÃ³n de PostgreSQL

**Fecha:** 3 de noviembre de 2026, Guatemala. Objetivo del 80 %: hoy. Hito 100 %: viernes 6 de noviembre.

## Resultado actual

Se prepararon correcciones en `fix/codrop-80-integracion`, desde `development` f1012229960e80fd6f2404e0ff5b76cede60163d. El remoto `DB` estaba 22 commits detrÃ¡s y sin commits exclusivos; se creÃ³ DB local desde de07fbd17200f5688e2158a1943319169c5b3477 y se avanzÃ³ mediante fast-forward antes de abrir la rama de correcciones. No se sobrescribe ni integra directamente `development`, ni se reemplazan cambios remotos de DB.

La aplicaciÃ³n tiene correcciones probadas, pero el cierre real del hito sigue pendiente de diagnÃ³stico/migraciÃ³n de la base compartida y del ensayo con Docker/Nginx reales. No se conecta una prueba de pago a Debian.

## Acceso real comprobado

| Recurso | Resultado | Consecuencia |
| --- | --- | --- |
| GitHub | Lectura de development/DB y checkout local disponibles | Se reutilizÃ³ la auditorÃ­a; no se repitiÃ³ completa |
| PostgreSQL Debian | No hay endpoint SSH configurado ni host/base/usuario reales confirmados en este entorno | No se conectÃ³ ni se hizo ninguna consulta al servidor real |
| Docker del usuario | No hay CLI/socket compartido ni contexto remoto configurado aquÃ­ | No se listaron, reiniciaron ni eliminaron sus contenedores; no se leyeron sus logs |
| PostgreSQL aislado aquÃ­ | El intento normal de iniciar servidor embebido fallÃ³ por permisos para su usuario de servicio; instalaciÃ³n de PostgreSQL del sistema tampoco estuvo disponible | No hubo restauraciÃ³n de dump, ensayo d0001â€“d0004 ni pruebas de triggers en servidor PostgreSQL |

El usuario confirmÃ³ que no se han ejecutado las migraciones del 80 % en Debian. TodavÃ­a **no hay evidencia actual para enumerar faltantes reales**. El procedimiento nuevo identifica quÃ© deberÃ­a agregar cada revisiÃ³n y el diagnÃ³stico calcula las diferencias al recibir acceso/resultado.

## Correcciones de cÃ³digo y configuraciÃ³n

| Hallazgo | Cambio preparado | Prueba y lÃ­mites |
| --- | --- | --- |
| A01: enlace de recuperaciÃ³n | App lee `reset_token`, abre el formulario incluso con sesiÃ³n previa y retira el token de la URL. ForgotPassword muestra confirmaciÃ³n genÃ©rica, no espera token simulado. SMTP documentado y pasado por Compose | Dos entradas de navegaciÃ³n y recuperaciÃ³n existente aprobadas; entrega SMTP real pendiente |
| A02: bypass de cuota/vigencia | Downgrade cuenta todos los sitios salvo FAILED, incluidos detenidos. Start/restart comprueban suscripciÃ³n, vigencia y cuota; un FAILED que se reanima consume plaza | Regresiones con BD SQLite y Docker doble; concurrencia real pendiente |
| A03: Ã©xitos simulados Docker | Sin daemon no se genera un contenedor mock ni se informa Ã©xito de acciones/sync. Imagen de hosting ausente falla en vez de usar Nginx stock con configuraciÃ³n non-root incompatible | Pruebas de indisponibilidad y de imagen ausente aprobadas; daemon real pendiente |
| A04: ZIP | Rollback antes de reutilizar sesiÃ³n; instancia y vÃ­nculo de puerto con un solo commit. CompensaciÃ³n cubre mkdir/flush/link/commit y conserva puerto si no se pudo eliminar contenedor. ColisiÃ³n de carpeta no elimina contenido existente | Fallos inyectados y fallo de flush real de SQLAlchemy aprobados; filesystem de prueba solamente |
| A05: frontend/backend | Respeta VITE_API_URL; fallback `/api/v1`; Vite reenvÃ­a `/api` y Nginx conserva proxy. Se retira login demo automÃ¡tico sin usos | Pruebas de resoluciÃ³n de URL y build aprobados |
| A06: renovaciÃ³n | Perfil incluye vigencia/fecha; UI permite comprar nuevamente el mismo plan vencido | Perfil vencido y botÃ³n de renovaciÃ³n aprobados |
| A07: plan desactivado y fallback Free | Se rechaza plan desactivado; plantilla exige una suscripciÃ³n como ZIP | Pruebas aprobadas. Se conserva compatibilidad de planes pagados heredados sin fechas hasta conocer datos reales |
| A08: despliegue/configuraciÃ³n | Compose exige secretos; Settings rechaza los antiguos placeholders conocidos; SMTP explÃ­cito, `.dockerignore` excluye `.env`; frontend se compila en una etapa de build; Swagger proxy corregido; README ya no promete seed/demo automÃ¡tico y script verifica endpoint de negocio | ConfiguraciÃ³n Python probada, YAML leÃ­do y shell validado. Docker build/Compose real pendientes; no se desplegÃ³ |
| A09: catÃ¡logo | Solo aparecen planes que entrega la API; metadatos visuales por nombre, sin mezclar IDs; error de catÃ¡logo no deja compras ficticias | CatÃ¡logo parcial, error y renovaciÃ³n aprobados |
| A10: mÃ©tricas | Recolector real empaquetado dentro del backend; fallback deja de devolver cifras saludables inventadas | Import de paquete y Docker indisponible aprobados; mÃ©tricas en host real pendientes |
| A11: verificaciÃ³n incompleta | Endpoint responde 501 sin consultar ni modificar usuarios | RegresiÃ³n aprobada. VerificaciÃ³n formal permanece para el 100 % |

**PolÃ­tica de cuota usada:** un sitio detenido conserva su plaza; borrarlo la libera. Sigue el conteo que ya usaban ZIP/perfil y la secciÃ³n T4.2. El plan original tenÃ­a otra frase que permitÃ­a detener excedentes; se documenta la elecciÃ³n para revisiÃ³n. Las instancias FAILED no consumen plaza, pero reactivarlas sÃ­.

## Pruebas ejecutadas

| ValidaciÃ³n | Resultado |
| --- | --- |
| Backend antes de cambios | 194 passed, 4 skipped, 36 subtests |
| Backend final | **222 passed, 4 skipped, 36 subtests** |
| Frontend antes de cambios | 49 passed |
| Frontend final | **56 passed**, 11 archivos |
| CompilaciÃ³n frontend | Aprobada |
| Sintaxis Python, shell modificado y whitespace Git | Aprobados |
| PostgreSQL/migraciones/triggers reales | No ejecutados |
| Imagen Docker/Nginx/Compose real | No ejecutados |

Las cuatro omisiones corresponden a pruebas de integraciÃ³n PostgreSQL opt-in. Entorno de ejecuciÃ³n: Python 3.12, dependencias compatibles con los rangos del repo instaladas en venv aislado; no equivale al Python 3.11 del equipo ni a una imagen productiva. Aparecieron dos avisos de dependencias: transiciÃ³n de TestClient/httpx y deprecaciÃ³n de `crypt` de passlib; no fallaron pruebas.

Comandos desde las carpetas correspondientes:

```bash
# backend/, con el entorno virtual de pruebas activado
python -m pytest -q

# frontend/
npm test -- --maxWorkers=2 --minWorkers=1
npm run build
```

`test_codrop_80_regressions.py` incluye registro â†’ login â†’ Free â†’ pago simulado â†’ factura â†’ downgrade â†’ ZIP â†’ HTTP 200, con SQLite efÃ­mera y extracciÃ³n ZIP real. El HTTP se sirve mediante Python como **doble explÃ­cito de Docker**. No se sustituye por ello el ensayo pendiente con PostgreSQL y Nginx reales.

## PostgreSQL: procedimiento preparado, todavÃ­a sin ejecutar

Ver [PROCEDIMIENTO_DEBIAN_80.md](PROCEDIMIENTO_DEBIAN_80.md).

- `backend/tools/diagnose_debian_readonly.py` exige host/base/usuario, los muestra y pide confirmarlos antes de conectar. Fuerza transacciones PostgreSQL de solo lectura y genera diferencias de tablas/columnas/FKs, triggers, versiÃ³n Alembic, conteos y fingerprints sin exportar contraseÃ±as ni filas.
- Compara tanto modelos ORM como el contrato oficial Debian. Muestra diferencias de tipos/nulabilidad como evidencia a revisar, sin corregirlas automÃ¡ticamente.
- `docker-compose.codrop-rehearsal.yml` crea un proyecto de copia separado en localhost:55439, sin montar el socket Docker ni el almacenamiento de usuarios.
- El procedimiento cubre dump completo, checksum, restauraciÃ³n en copia, comparaciÃ³n de tablas/hashes/secuencias, ensayo de d0001â€“d0004, verificaciÃ³n posterior y recuperaciÃ³n mediante restauraciÃ³n. Verificar listado del dump no se considera prueba de restaurabilidad.
- d0001 exige 21 tablas, pagos vacÃ­os, conteos/asignaciones congelados y manifiesto sin deriva. **No se relajaron esos controles ni se modificaron las revisiones oficiales.** Si no coinciden, se necesita revisiÃ³n especÃ­fica.

Para determinar quÃ© falta realmente, obtener el JSON de diagnÃ³stico actual. Los cambios previstos por la lÃ­nea oficial son: completar cuatro campos de pagos y su FK/UNIQUE; crear invoices/admin_audit_logs/password_reset_tokens; corregir FK de auditorÃ­a; agregar perÃ­odos y metadata; snapshot del nombre; FKs financieras RESTRICT; funciÃ³n y cuatro triggers de inmutabilidad. Algunas columnas de plans/subscriptions se esperan ya presentes como legado y no son creadas por esa lÃ­nea.

No se garantiza todavÃ­a que los datos histÃ³ricos del servidor real estÃ©n conservados en un respaldo restaurado: falta hacerlo. Los guardas y pruebas unitarias de preservaciÃ³n no reemplazan esa evidencia.

## Docker/configuraciÃ³n: quÃ© estÃ¡ comprobado y quÃ© falta

Se corrigieron causas de cÃ³digo capaces de ocultar indisponibilidad o escoger una imagen incompatible. La causa real de sus contenedores con ExitCode 1 sigue sin confirmar. Necesitamos estado, logs de Nginx, imagen/usuario, bind mounts, puertos y permisos del origen.

Herramienta preparada: `python infra/scripts/diagnose_docker_readonly.py`, desde la raÃ­z del repo en el equipo que posee Docker. No hace exec/restart/remove ni vuelca Config.Env. Los logs pueden contener IP/rutas; revisar esos campos antes de compartirlos.

## Pendientes y autorizaciones

1. Confirmar destino real y obtener diagnÃ³stico de PostgreSQL y Docker. Sin eso no se atribuyen fallos concretos al esquema ni al host.
2. Generar respaldo real y probar su restauraciÃ³n con comparaciÃ³n de historia/legado/secuencias. Obtener pausa coordinada de escrituras si se requieren fingerprints idÃ©nticos; no detener aplicaciones compartidas por cuenta propia.
3. Ensayar las migraciones y el flujo real en la copia. Verificar Nginx UID 101, imagen configurada, puertos y lectura del contenido montado; no usar la base compartida para compras sintÃ©ticas.
4. Presentar evidencia y solicitar autorizaciÃ³n **antes de migrar Debian real**. Cualquier reinicio/eliminaciÃ³n de contenedores existentes, restauraciÃ³n sobre un destino existente o pruebas de pago en la BD compartida tambiÃ©n necesitan autorizaciÃ³n.
5. Integrar la rama revisada mediante DB y el flujo del equipo. El trabajo no modifica directamente development ni actualiza el remoto DB.
6. Riesgos conservados para revisiÃ³n: checkout sin idempotencia; ausencia de unicidad de suscripciÃ³n activa y serializaciÃ³n completa de despliegues concurrentes; pagos heredados sin vencimiento; semÃ¡ntica de impuesto y crÃ©dito por renovaciÃ³n anticipada; lÃ­mites RAM/CPU de contenedores ya creados no se recalculan con el cambio de plan.

## Comandos inmediatos para continuar

Primero, en **Debian, carpeta backend y su entorno virtual actual**, mostrar Ãºnicamente la configuraciÃ³n de identidad (sin conexiÃ³n y sin contraseÃ±a):

```bash
python -c "from app.core.config import settings as s; print('Servidor:',s.POSTGRES_SERVER); print('Puerto:',s.POSTGRES_PORT); print('Base:',s.POSTGRES_DB); print('Usuario:',s.POSTGRES_USER)"
```

Si la aplicaciÃ³n se ejecuta en contenedor, confirmar que esos valores corresponden a ese contenedor. En el equipo de Docker:

```bash
docker context show
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

Con esos resultados se concreta el destino del diagnÃ³stico. No enviar contraseÃ±as, `.env`, URLs con credenciales ni backups.

## Entrega local y publicaciÃ³n pendiente

Las correcciones estÃ¡n confirmadas en la rama local `fix/codrop-80-integracion`. El push fue rechazado por la revisiÃ³n automÃ¡tica porque considerÃ³ vigente la prohibiciÃ³n inicial de modificar GitHub. No se intentÃ³ publicar por otro mecanismo. Hace falta autorizaciÃ³n explÃ­cita para subir Ãºnicamente esa rama; DB y development remotas siguen sin modificarse.

Se entrega un Git bundle incremental y un patch con los cambios. El bundle requiere tener el commit base f101222 de development. DespuÃ©s de descargarlo, en el repositorio local se puede preparar otro worktree sin alterar la carpeta de trabajo actual:

```powershell
git fetch origin
git worktree add -b revision/codrop-80 ..\codrop80-revision f1012229960e80fd6f2404e0ff5b76cede60163d
git -C ..\codrop80-revision fetch "RUTA_COMPLETA\Codrop_80_Correcciones.bundle" fix/codrop-80-integracion
git -C ..\codrop80-revision merge --ff-only FETCH_HEAD
```

Sustituir solo la ruta completa del bundle. Si ya existen esa rama o carpeta, elegir un nombre nuevo; no borrarlas. El worktree nuevo no hereda `.env` ni credenciales y no ejecuta nada automÃ¡ticamente. El patch es una alternativa para revisiÃ³n; no aplicarlo encima del bundle porque contiene los mismos cambios.

