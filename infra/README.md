# Infraestructura, Redes, Hardening y Contenedores (Rol 1 - DevOps)
**Sistema:** CloudPaaS – Web Hosting as a Service  
**Alcance:** Consolidación Integral de Hitos 50%, 80% y 100% (Entrega Final)  
**Estándares:** Twelve-Factor App, ISO/IEC 25010, Principio de Menor Privilegio  

---

## 1. Visión General de Infraestructura por Hito

El **Rol 1 (DevOps & Networking)** es responsable del confinamiento de recursos, topología de red, seguridad perimetral, empaquetado de plantillas base, benchmarking de rendimiento y la orquestación productiva de la plataforma.

### Matriz Consolidada de Entregables de Infraestructura

| Hito | Tarea | Requisito | Alcance Técnico | Artefacto / Archivo |
| :--- | :--- | :--- | :--- | :--- |
| **50%** | **T1.1** | RF-21 | Rotación estricta de logs (`json-file`, `max-size: 5m`, `max-file: 2`) para blindar el almacenamiento del host. | `infra/docker/daemon.json`, `backend/app/services/docker_service.py` |
| **50%** | **T1.2** | RNF-02, RF-15 | Enforzamiento de límites duros de hardware (RAM, Swap, NanoCPUs) por plan. | `infra/scripts/test_resource_limits.sh` |
| **50%** | **T1.3** | RNF-04, RNF-07 | Red virtual aislada `paas_instances_network`, impidiendo movimiento lateral hacia PostgreSQL o FastAPI. | `infra/scripts/setup_networks.sh`, `infra/scripts/test_network_isolation.sh` |
| **50%** | **T1.4** | RNF-05 | Auditoría y saneamiento de contenedores huérfanos. | `infra/scripts/cleanup_orphans.py`, `infra/systemd/cloudpaas-cleanup.*` |
| **80%** | **T1.1** | RF-14 | Catálogo de plantillas estáticas optimizadas en disco (< 1.5 MB cada una, permisos 755). | `infra/host-storage/templates/` (`landing-business`, `personal-portfolio`, `html5-docs`) |
| **80%** | **T1.2** | RF-19, RNF-04 | Soporte para subdominios locales simulados (`*.localhost`) en Nginx con resolución RFC 6761 nativa a loopback. | `infra/docker/instance-nginx/nginx.conf`, `nginx-nonroot.conf`, `infra/scripts/setup_networks.sh` |
| **80%** | **T1.3** | RF-22 | Telemetría consolidada del host en tiempo real (CPU, RAM, Disco via `os.statvfs`, Contenedores Docker). | `infra/scripts/get_host_metrics.py` |
| **80%** | **T1.4** | RNF-04 | Permisos de sólo lectura y preservación de plantillas maestras en `/srv/hosting/plantillas/`. | `infra/scripts/setup_server.sh`, `infra/scripts/deploy_production.sh` |
| **100%** | **T1.1** | RNF-07 | Hardening de seguridad con imagen Nginx Non-Root (UID 101 / GID 101), `cap_drop: ALL` y sistema de archivos `:ro`. | `infra/docker/instance-nginx/Dockerfile`, `nginx-nonroot.conf`, `infra/scripts/build_hosting_image.sh` |
| **100%** | **T1.2** | RNF-11 | Orquestación productiva unificada con Docker Compose, SPA empaquetada con proxy reverso y red interna. | `docker-compose.prod.yml`, `frontend/Dockerfile`, `frontend/nginx.prod.conf` |
| **100%** | **T1.3** | RNF-01..08 | Suite automatizada de Benchmarking y Calidad ISO/IEC 25010 (Provisión, RAM idle, Latencia P95, Anti-OOM). | `infra/scripts/benchmark_quality.sh` |
| **100%** | **T1.4** | RNF-11 | Script maestro de puesta en marcha automatizada con un solo comando. | `infra/scripts/deploy_production.sh` |
| **100%** | **T1.5** | ISO/IEC | Manual técnico de infraestructura y guía operativa de producción. | `docs/MANUAL_TECNICO_INFRAESTRUCTURA.md`, `infra/README.md` |

---

## 2. Topología de Red y Confinamiento de Producción

```
                             [ TRÁFICO EXTERNO ]
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │ Puerto 80 (HTTP)          Puertos 30001 - 30100   │
            ▼                                                   ▼
┌───────────────────────┐                   ┌───────────────────────────────┐
│     paas_frontend     │                   │     CONTENEDORES TENANTS      │
│ (Nginx Prod SPA + API)│                   │   (Nginx Alpine Non-Root)     │
└───────────┬───────────┘                   └───────────────┬───────────────┘
            │                                               │
            │ Red Interna: paas_internal                    │ Red Aislada: paas_instances_network
            ▼                                               ▼
┌───────────────────────┐                   ┌───────────────────────────────┐
│     paas_backend      │                   │  • UID 101 / GID 101          │
│ (FastAPI Core Engine) │                   │  • cap_drop: ALL              │
└───────────┬───────────┘                   │  • no-new-privileges: true    │
            │                               │  • Montaje :ro                │
            │                               │  • Cgroups: 128MB / 256MB / 512MB
            ▼                               │  • tmpfs /tmp: 16m            │
┌───────────────────────┐                   └───────────────────────────────┘
│       paas_db         │                                   ▲
│ (PostgreSQL 16)       │                                   │
└───────────────────────┘                         AISLAMIENTO TOTAL
                                              (Sin acceso a paas_internal)
```

---

## 3. Catálogo de Herramientas y Scripts (`infra/scripts/`)

| Script | Propósito | Ejecución |
| :--- | :--- | :--- |
| `deploy_production.sh` | **Script maestro de producción.** Prepara host, compila imagen non-root, sincroniza plantillas, levanta red y orquestación Compose. | `./infra/scripts/deploy_production.sh` |
| `benchmark_quality.sh` | **Suite de auditoría ISO/IEC 25010.** Evalúa tiempo de provisión, RAM idle, latencia P95, hardening non-root y contención Anti-OOM. | `bash infra/scripts/benchmark_quality.sh [all\|--provision\|--memory\|--latency\|--security\|--oom]` |
| `build_hosting_image.sh` | Construye y certifica la imagen segura `cloudpaas/nginx-hosting:latest` (UID 101, RAM idle < 10 MB). | `bash infra/scripts/build_hosting_image.sh` |
| `get_host_metrics.py` | Extractor de telemetría de host para panel admin (/admin/dashboard), usando sondeo nativo de `/proc` y `os.statvfs`. | `python3 infra/scripts/get_host_metrics.py` |
| `setup_networks.sh` | Crea y valida redes bridge `paas_instances_network` y `paas_internal`, verificando loopback de subdominios. | `bash infra/scripts/setup_networks.sh` |
| `test_resource_limits.sh` | Enforzamiento sintético de perfiles cgroups (Free, Developer, Pro). | `bash infra/scripts/test_resource_limits.sh --test-plans` |
| `test_network_isolation.sh`| Prueba de penetración simulada para verificar inmunidad lateral de contenedores. | `bash infra/scripts/test_network_isolation.sh` |
| `cleanup_orphans.py` | Reconciliador de discrepancias de estado entre Docker Daemon y PostgreSQL. | `python3 infra/scripts/cleanup_orphans.py [--fix]` |

---

## 4. Catálogo de Plantillas Base 1-Clic (`infra/host-storage/templates/`)

1. **`landing-business/`**:
   - Landing page comercial responsiva con hero dinámico, grid de servicios, métricas SLA, llamada a la acción y pie de página institucional.
   - Peso total: `< 15 KB` (100% autosuficiente, sin CDNs externas).
2. **`personal-portfolio/`**:
   - Portafolio moderno para desarrollador/ingeniero de software con modo oscuro, tarjetas de proyectos, badges de stack técnico y línea de tiempo laboral.
   - Peso total: `< 12 KB`.
3. **`html5-docs/`**:
   - Estructura limpia para documentación técnica con barra de navegación lateral, buscador interactivo en vivo, bloques de código preformateados y llamadas de alerta.
   - Peso total: `< 15 KB`.

---

## 5. Resultados de Benchmarking ISO/IEC 25010

Ejecución auditada mediante `infra/scripts/benchmark_quality.sh`:

```plaintext
=================================================================
  ✅ MATRIZ DE CALIDAD ISO/IEC 25010 CUMPLIDA AL 100%
=================================================================
  • RNF-01 (Tiempo de Provisión < 5.0s):         APROBADO (3.86s promedio)
  • RNF-02 (Huella de Memoria Idle < 10MB):      APROBADO (2.35 - 4.96 MiB)
  • RNF-03 (Latencia Concurrente P95 < 200ms):   APROBADO (P95: 194.03 ms / 50 VU)
  • RNF-04 / 07 (Seguridad Non-Root & :ro):       APROBADO (UID 101, cap_drop: ALL, :ro)
  • RNF-08 (Contención Anti-OOM / cgroups):      APROBADO (Kernel SIGKILL 137)
=================================================================
```

---

## 6. Procedimiento de Puesta en Marcha Rápida (Quickstart)

```bash
# 1. Configurar redes
bash infra/scripts/setup_networks.sh

# 2. Compilar imagen de hosting optimizada
bash infra/scripts/build_hosting_image.sh

# 3. Ejecutar suite de pruebas de calidad
bash infra/scripts/benchmark_quality.sh

# 4. Desplegar todo el entorno productivo
./infra/scripts/deploy_production.sh
```
