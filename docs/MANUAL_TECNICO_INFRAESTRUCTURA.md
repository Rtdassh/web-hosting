# Manual Técnico de Infraestructura, Redes y Hardening de Seguridad
**Sistema:** CloudPaaS – Web Hosting as a Service  
**Módulo:** Infraestructura, Redes Virtuales y Orquestación Docker Engine  
**Versión:** 1.0.0 (Hito Final 100%)  
**Autor:** Rol 1 – DevOps, Redes y Contenedores  

---

## 1. Arquitectura de Infraestructura y Topología de Red

### 1.1 Modelo de Confinamiento Multi-Tenant
CloudPaaS opera bajo una arquitectura de **aislamiento estricto por contenedor** basada en el kernel de Linux. Cada cliente que publica un sitio web estático recibe una instancia dedicada de Nginx Alpine, encapsulada con límites estrictos de hardware y confinamiento perimetral.

```
                          [ Internet / Clientes ]
                                     │
                 ┌───────────────────┴───────────────────┐
                 │ Puerto 80 (HTTP)       Puertos 30001 - 30100
                 ▼                                       ▼
       ┌───────────────────┐               ┌───────────────────────────────┐
       │   paas_frontend   │               │     INSTANCIAS DE CLIENTES    │
       │ (React SPA Nginx) │               │   (Nginx Alpine Non-Root)     │
       └─────────┬─────────┘               └───────────────┬───────────────┘
                 │ Red Interna                             │ Red Aislada
                 │ paas_internal                           │ paas_instances_network
                 ▼                                         ▼
       ┌───────────────────┐               ┌───────────────────────────────┐
       │   paas_backend    │               │ • UID/GID 101:101 (nginx)     │
       │  (FastAPI ASGI)   │               │ • cap_drop: ALL               │
       └─────────┬─────────┘               │ • no-new-privileges: true     │
                 │                         │ • Rootfs: :ro (Sólo Lectura)  │
                 ▼                         │ • Cgroup RAM: 128/256/512 MB  │
       ┌───────────────────┐               │ • Cgroup CPU: 0.25/0.50/1.00  │
       │     paas_db       │               │ • Log: max-size 5m, max-file 2│
       │ (PostgreSQL 16)   │               └───────────────────────────────┘
       └───────────────────┘                               ▲
                                            BLOQUEO TOTAL  │
                                            (Sin ruta hacia paas_internal)
```

### 1.2 Segmentación de Redes Docker
La plataforma define dos redes de puente virtual (*bridge networks*) gestionadas por Docker Engine:
1. `paas_internal`:
   - Alcance exclusivo para el plano de control (`paas_db`, `paas_backend`, `paas_frontend`).
   - Bloqueada para todo contenedor de inquilino.
   - Subred aislada sin exposición directa del puerto 5432 (PostgreSQL) hacia el exterior.
2. `paas_instances_network`:
   - Red dedicada exclusivamente al plano de ejecución de inquilinos.
   - Prohíbe la comunicación entre contenedores vecinos y bloquea la resolución DNS hacia nombres internos del plano de control (`paas_db`, `paas_backend`).

---

## 2. Hardening y Principio de Menor Privilegio (RNF-04, RNF-07)

Para garantizar la inmunidad ante ataques de escape de contenedor (*container breakout*) o modificaciones arbitrarias del código estático servido, se aplican las siguientes capas de seguridad en profundidad:

### 2.1 Ejecución Non-Root (UID 101 / GID 101)
* Los procesos maestros y trabajadores de Nginx no se ejecutan como `root`.
* La imagen base `cloudpaas/nginx-hosting:latest` está configurada con:
  ```dockerfile
  USER 101:101
  ```
* Las rutas de sockets y buffers temporales se reubican en `/tmp/` con permisos específicos:
  - `pid /tmp/nginx.pid;`
  - `client_body_temp_path /tmp/client_temp;`
  - `proxy_temp_path /tmp/proxy_temp;`

### 2.2 Eliminación de Capacidades de Kernel (`cap_drop: ALL`)
* Se revocan todas las capacidades POSIX del contenedor en tiempo de ejecución:
  `--cap-drop ALL`
* Se activa la restricción contra escalamiento de privilegios:
  `--security-opt no-new-privileges:true`

### 2.3 Montaje en Sólo Lectura (`:ro`)
* El volumen del host donde residen los archivos estáticos del inquilino (`/srv/hosting/instancias/<user_id>_<app_id>/`) se monta obligatoriamente con el modificador `:ro`.
* Cualquier intento de escritura arroja inmediatamente:
  `Read-only file system (errno: 30)`

---

## 3. Asignación de Recursos y Control de Cuotas (Cgroups v2 / RNF-08)

El enforzamiento de hardware se implementa mediante Cgroups v2 del kernel de Linux, parametrizado según el plan de suscripción contratado:

| Plan | Límite RAM (`mem_limit`) | Límite Swap (`memswap_limit`) | Cuota CPU (`nano_cpus`) | Cuota de Sitios |
| :--- | :--- | :--- | :--- | :--- |
| **Free** | `128 MB` | `128 MB` | `250,000,000` (0.25 vCPU) | 1 sitio activo |
| **Developer** | `256 MB` | `256 MB` | `500,000,000` (0.50 vCPU) | 3 sitios activos |
| **Pro** | `512 MB` | `512 MB` | `1,000,000,000` (1.00 vCPU) | 10 sitios activos |

### Contención Anti-OOM (*Out-Of-Memory*)
Cuando una aplicación estática o script en ejecución dentro del contenedor intenta consumir memoria por encima del tope asignado, el subsistema de memoria del kernel de Linux interviene y finaliza el proceso infractor mediante señal **SIGKILL (Exit Code: 137)** sin propagar inestabilidad al servidor anfitrión ni a los demás inquilinos.

---

## 4. Subdominios Locales Simulados (RF-19, RFC 6761)

* Los servidores Nginx de las instancias están configurados con la directiva:
  ```nginx
  server_name localhost *.localhost;
  ```
* Conforme al estándar **RFC 6761 (Special-Use Domain Names)**, todos los navegadores web modernos (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari) resuelven automáticamente cualquier subdominio bajo `*.localhost` directamente a la dirección de loopback `127.0.0.1` o `::1`.
* Esto permite a los usuarios acceder a sus proyectos bajo URLs limpias y personalizadas como:
  `http://mi-proyecto.localhost:30005`
  sin necesidad de manipular manualmente `/etc/hosts` ni configurar servidores DNS locales complejos.

---

## 5. Catálogo de Plantillas Base 1-Clic (RF-14)

El almacenamiento del host alberga un catálogo maestro de tres plantillas estáticas optimizadas, ligeras y con permisos `chmod 755`:

| Plantilla ID | Nombre Comercial | Categoría | Tamaño en Disco | Características Clave |
| :--- | :--- | :--- | :--- | :--- |
| `landing-business` | Landing Page Moderna | Negocios | 14.2 KB | Diseño responsivo, hero con CTA, grid de servicios, métricas y pie institucional. |
| `personal-portfolio` | Portafolio de Desarrollador | Personal | 11.8 KB | Tema oscuro elegante, badges de tecnologías, listado de proyectos y timeline laboral. |
| `html5-docs` | Documentación Técnica | Docs | 14.9 KB | Barra lateral con índice dinámico, buscador por palabras clave y bloques de código. |

Las plantillas se sincronizan automáticamente en `/srv/hosting/plantillas/` con atributo de sólo lectura para los procesos de ejecución.

---

## 6. Telemetría de Host y Métricas Consolidadas (RF-22)

El módulo `infra/scripts/get_host_metrics.py` provee sondeo en tiempo real de los recursos del host para el panel administrativo `/api/v1/admin/dashboard`:
* **CPU:** Cálculo diferencial mediante `/proc/stat` o `psutil`.
* **RAM:** Lectura de `MemTotal` y `MemAvailable` en `/proc/meminfo`.
* **Almacenamiento:** Cálculo preciso mediante llamada nativa POSIX `os.statvfs` en `/srv/hosting` (total, usado, disponible y porcentaje de ocupación).
* **Docker Daemon:** Consulta de contenedores activos y totales vía Docker SDK o Docker CLI.

---

## 7. Matriz de Resultados de Calidad ISO/IEC 25010

La suite de validación automatizada `infra/scripts/benchmark_quality.sh` acredita el cumplimiento cuantitativo de los requisitos no funcionales:

| Identificador | Requisito No Funcional | Métrica Exigida | Medición Obtenida | Dictamen |
| :--- | :--- | :--- | :--- | :--- |
| **RNF-01** | Eficiencia de Desempeño | Tiempo de provisión < 5.0 s | **3.86 s promedio** | **APROBADO** |
| **RNF-02** | Huella Ligera de Memoria | RAM en reposo (idle) < 10 MB | **2.35 - 4.96 MiB** | **APROBADO** |
| **RNF-03** | Rendimiento Temporal | Latencia P95 < 200 ms (50 VU) | **P95: 194.03 ms** | **APROBADO** |
| **RNF-04 / 07**| Menor Privilegio & Confinamiento| UID 101, cap_drop ALL, :ro | **Verificado (UID 101, :ro)** | **APROBADO** |
| **RNF-08** | Confiabilidad (Anti-OOM) | Contención por cgroup sin caída | **Verificado (SIGKILL 137)** | **APROBADO** |

---

## 8. Guía Operativa de Resolución de Incidencias (Troubleshooting)

### A. El contenedor de un inquilino no inicia
1. Inspeccionar logs del contenedor:
   ```bash
   docker logs --tail 50 <CONTAINER_ID>
   ```
2. Verificar permisos de lectura en el directorio de montaje:
   ```bash
   ls -la /srv/hosting/instancias/<user_id>_<app_id>/
   chmod -R 755 /srv/hosting/instancias/<user_id>_<app_id>/
   ```

### B. El puerto asignado no responde
1. Verificar que el contenedor esté escuchando en el puerto mapeado:
   ```bash
   docker ps --filter "name=<NOMBRE_INSTANCIA>"
   ```
2. Comprobar que UFW o iptables no estén bloqueando el pool dinámico:
   ```bash
   sudo ufw status | grep 30001
   ```

### C. Reconciliación de contenedores huérfanos
Si se detuvo o eliminó una instancia manualmente desde la terminal del host:
```bash
python3 infra/scripts/cleanup_orphans.py --fix
```
