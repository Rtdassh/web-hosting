# Infraestructura, Redes y Contenedores (Rol 1 - DevOps)
**Proyecto:** CloudPaaS – Web Hosting as a Service  
**Hito:** Avance Funcional 2 (50%)  
**Rama:** `feat/r1-infra-cgroups-network`

---

## 1. Visión General del Rol 1 (Hito 50%)

El **Rol 1 (DevOps & Networking)** es responsable del confinamiento, aprovisionamiento, seguridad de red y estabilidad física de los recursos en el servidor host donde se ejecutan los sitios de los usuarios.

### Matriz de Tareas Técnicas del 50%

| Tarea | Requisito | Alcance Técnico | Artefacto / Archivo |
| :--- | :--- | :--- | :--- |
| **T1.1** | RF-21 | Política estricta de rotación de logs (`json-file`, `max-size: 5m`, `max-file: 2`) para evitar saturación de disco. | `infra/docker/daemon.json`, `backend/app/services/docker_service.py` |
| **T1.2** | RNF-02, RF-15 | Enforzamiento y verificación de límites duros de hardware (RAM, Swap, NanoCPUs) por plan. | `infra/scripts/test_resource_limits.sh` |
| **T1.3** | RNF-04, RNF-07 | Red virtual bridge aislada `paas_instances_network`, impidiendo movimiento lateral hacia PostgreSQL o FastAPI. | `infra/docker-compose.yml`, `infra/scripts/setup_networks.sh`, `infra/scripts/test_network_isolation.sh` |
| **T1.4** | RNF-05 | Auditoría y saneamiento de contenedores huérfanos e inconsistencias entre Docker y PostgreSQL. | `infra/scripts/cleanup_orphans.py`, `infra/systemd/cloudpaas-cleanup.*` |

---

## 2. Topología de Red y Confinamiento (Arquitectura de Seguridad)

```
                            [ USUARIO EXTERNO ]
                                     │
              ┌──────────────────────┴──────────────────────┐
              │ Tráfico HTTP directo al Host                 │
              │ http://<HOST_PUBLIC_IP>:<PUERTO_30001-30100>│
              ▼                                             ▼
  ┌───────────────────────────────────────────────────────────────┐
  │ SERVIDOR HOST (Linux / Debian / Docker Engine)               │
  │                                                               │
  │  ┌─────────────────────────────────────────────────────────┐  │
  │  │ RED AISLADA DE CLIENTES: paas_instances_network         │  │
  │  │                                                         │  │
  │  │  [ Contenedor 1 ]   [ Contenedor 2 ]   [ Contenedor N ] │  │
  │  │  • Nginx 1.27       • Nginx 1.27       • Nginx 1.27     │  │
  │  │  • Cgroups: 128MB   • Cgroups: 256MB   • Cgroups: 512MB │  │
  │  │  • Volumen: :ro     • Volumen: :ro     • Volumen: :ro   │  │
  │  │  • Log: 5MBx2       • Log: 5MBx2       • Log: 5MBx2     │  │
  │  └─────────────────────────────────────────────────────────┘  │
  │                               ▲                               │
  │                BLOQUEO TOTAL  │ (Sin ruta ni resolución DNS)  │
  │                               ▼                               │
  │  ┌─────────────────────────────────────────────────────────┐  │
  │  │ RED INTERNA DE PLATAFORMA: paas_backend_network         │  │
  │  │                                                         │  │
  │  │  [ paas_postgres ] ◄───► [ paas_backend ]              │  │
  │  │  (PostgreSQL 16)         (FastAPI Core Engine)         │  │
  │  └─────────────────────────────────────────────────────────┘  │
  │                                     │                         │
  │                                     ▼                         │
  │                       Socket Docker: /var/run/docker.sock     │
  └───────────────────────────────────────────────────────────────┘
```

---

## 3. Catálogo de Herramientas y Scripts (`infra/scripts/`)

| Script | Descripción | Modo de Uso |
| :--- | :--- | :--- |
| `setup_server.sh` | **Script maestro de aprovisionamiento.** Idempotente. Configura Cgroups, Daemon logs, `/srv/hosting`, UFW, redes, compila imagen y ejecuta pruebas de aceptación. | `sudo bash infra/scripts/setup_server.sh` |
| `setup_networks.sh` | Crea y valida la existencia de la red virtual aislada `paas_instances_network`. | `bash infra/scripts/setup_networks.sh` |
| `build_hosting_image.sh` | Compila la imagen ultraligera `cloudpaas/nginx-hosting:latest` y realiza un smoke test midiendo RAM idle (< 10 MB). | `bash infra/scripts/build_hosting_image.sh` |
| `test_resource_limits.sh` | Valida cgroups. Inspecciona contenedores en vivo o lanza prueba sintética de perfiles Free, Dev y Pro. | `bash infra/scripts/test_resource_limits.sh --test-plans` |
| `test_network_isolation.sh` | Prueba de penetración simulada para verificar que un contenedor cliente no pueda acceder a PostgreSQL ni a la red de backend. | `bash infra/scripts/test_network_isolation.sh` |
| `cleanup_orphans.py` | Reconcilia contenedores huérfanos entre Docker y la base de datos PostgreSQL. | `python3 infra/scripts/cleanup_orphans.py [--fix]` |
| `cron_cleanup_orphans.sh` | Envoltorio para cron que redirige la salida a `/srv/hosting/logs/orphan_cleanup.log`. | `bash infra/scripts/cron_cleanup_orphans.sh` |

---

## 4. Guía Operativa de Puesta en Marcha en el Servidor (SSH)

Cuando se reciba acceso SSH al servidor remoto (`HOST_PUBLIC_IP`), seguir estos pasos:

### Paso 1: Conexión SSH y Clonación / Actualización
```bash
# Conectarse al servidor remoto
ssh usuario@<IP_DEL_SERVIDOR>

# Clonar o actualizar el repositorio
cd /srv/hosting || cd ~
git checkout feat/r1-infra-cgroups-network
git pull origin feat/r1-infra-cgroups-network
```

### Paso 2: Ejecutar el Aprovisionamiento Maestro
```bash
cd web-hosting
sudo bash infra/scripts/setup_server.sh
```

El script se encargará automáticamente de:
1. Validar soporte de Cgroups v2 en el kernel.
2. Respaldar y escribir `/etc/docker/daemon.json` con política de retención de logs.
3. Reiniciar el daemon de Docker.
4. Crear la estructura `/srv/hosting/instancias` con permisos `755`.
5. Configurar UFW permitiendo SSH, 80, 443, 8000 y el pool `30001-30100`, bloqueando 5432.
6. Crear la red `paas_instances_network`.
7. Construir y validar la imagen `cloudpaas/nginx-hosting:latest`.
8. Instalar y habilitar el temporizador de systemd (`cloudpaas-cleanup.timer`).
9. Ejecutar las pruebas automáticas de cgroups y aislamiento de red.

### Paso 3: Configurar Variables de Entorno (`.env`)
```bash
cp .env.example .env
# Ajustar HOST_PUBLIC_IP con la IP pública del servidor y SECRET_KEY segura
nano .env
```

### Paso 4: Levantar Infraestructura
```bash
# Levantar PostgreSQL y Backend mediante Docker Compose
docker compose -f infra/docker-compose.yml up -d
```

---

## 5. Cuotas y Límites de Hardware por Plan

| Plan | Límite RAM (`mem_limit`) | Límite Swap (`memswap_limit`) | Cuota CPU (`nano_cpus`) | Cuota de Sitios |
| :--- | :--- | :--- | :--- | :--- |
| **Free** | `128 MB` | `128 MB` | `250,000,000` (0.25 CPU) | 1 sitio activo |
| **Developer** | `256 MB` | `256 MB` | `500,000,000` (0.50 CPU) | 3 sitios activos |
| **Pro** | `512 MB` | `512 MB` | `1,000,000,000` (1.00 CPU) | 10 sitios activos |

---

## 6. Mantenimiento y Troubleshooting

### Diagnóstico de Recursos en Vivo
```bash
# Ver telemetría en tiempo real de todos los sitios
docker stats $(docker ps --filter "label=managed_by=cloudpaas" -q)
```

### Comprobación de Logs del Contenedor
```bash
# Inspeccionar las últimas 50 líneas de un contenedor de inquilino
docker logs --tail 50 <CONTAINER_ID>
```

### Inspección del Tamaño de Archivos de Logs en Disco
```bash
# Comprobar que ningún log supere los 5MB
ls -lh /var/lib/docker/containers/*/*-json.log
```

### Forzar Saneamiento de Huérfanos
```bash
python3 infra/scripts/cleanup_orphans.py --fix
```
