# Guía de Ramas, Contratos de Integración y Trabajo Colaborativo (Hito 50%)
**Proyecto:** CloudPaaS – Web Hosting as a Service  
**Hito:** Avance Funcional 2 (50%) – 9 de octubre de 2026  

---

## 1. Estrategia de Ramas en Git (Branching Model)

Para garantizar la no interferencia entre los 4 integrantes del equipo y permitir despliegues continuos controlados, se establece un modelo basado en **GitFlow Adaptado** con ramas de características por rol:

```plaintext
main (Etiquetas de versión / Entregas oficiales: v0.3.0, v0.5.0)
  ▲
  │ (Merge final al completar y validar la demo del 50%)
development (Rama central de integración continua)
  ▲
  ├────── feat/r1-infra-cgroups-network     (Rol 1: DevOps & Networking)
  ├────── feat/r2-frontend-telemetry-logs   (Rol 2: Frontend & UI/UX)
  ├────── feat/r3-backend-observability     (Rol 3: Backend & Database)
  └────── feat/r4-docker-middleware         (Rol 4: Integrador & Docker SDK)
```

### 1.1 Definición y Asignación de Ramas

| Rama | Rol Responsable | Alcance Técnico | Tareas Asociadas |
| :--- | :--- | :--- | :--- |
| `main` | Todo el equipo | Código estable, evaluado y listo para sustentación. Solo recibe merges desde `development`. | Hito 30% completado, Hito 50% en preparación. |
| `development` | Integrador (Rol 4) | Rama de consolidación continua. Todo Pull Request se dirige aquí. | Integración general de tareas. |
| `feat/r1-infra-cgroups-network` | **Rol 1** (DevOps) | Límite de CPU/RAM, política de logs `json-file` (5MB), aislamiento de red `paas_instances_network`, scripts de auditoría. | T1.1, T1.2, T1.3, T1.4 |
| `feat/r2-frontend-telemetry-logs` | **Rol 2** (Frontend) | Componentes `InstanceLogsModal.jsx`, `InstanceMetricsCard.jsx`, confirmación destructiva y consumo de API. | T2.1, T2.2, T2.3, T2.4 |
| `feat/r3-backend-observability` | **Rol 3** (Backend) | Endpoints `/metrics`, `/logs`, `/sync`, esquemas Pydantic, transacciones de liberación y log estructurado de auditoría. | T3.1, T3.2, T3.3, T3.4 |
| `feat/r4-docker-middleware` | **Rol 4** (Integrador) | Métodos en `docker_service.py` (`get_container_stats`, `get_container_logs`), manejo de `NotFound` y pruebas E2E. | T4.1, T4.2, T4.3, T4.4 |

### 1.2 Reglas Operativas para Desarrolladores
1. **Punto de Partida:** Toda rama debe originarse desde la última versión de `development`:
   ```bash
   git checkout development
   git pull origin development
   git checkout -b feat/<nombre-rama>
   ```
2. **Convención de Commits (Conventional Commits):**
   * `feat(modulo): descripcion clara`
   * `fix(modulo): correccion de error`
   * `refactor(modulo): mejora interna sin alterar contrato`
   * `chore(modulo): scripts, configuracion o dependencias`
3. **Validación Previa a Commit:**
   * Backend: `python3 -m compileall app` dentro de `backend/` sin errores.
   * Frontend: `npm run build` dentro de `frontend/` sin errores de transpilación.
4. **Sincronización antes de Crear Pull Request:**
   ```bash
   git fetch origin
   git rebase origin/development
   git push origin feat/<nombre-rama>
   ```

---

## 2. Contratos de Integración (API Contracts & Schemas)

Los contratos definen las interfaces inmutables que comunican el backend con el frontend. Ambas partes deben apegarse estrictamente a estas firmas.

### 2.1 Esquemas Pydantic (Backend)
Ubicación: `backend/app/schemas/instance_schema.py`

* `InstanceMetricsResponse`:
  ```json
  {
    "instance_id": 1,
    "status": "running",
    "cpu_percent": 1.25,
    "memory_usage_mb": 7.82,
    "memory_limit_mb": 128.0,
    "memory_percent": 6.11,
    "updated_at": "2026-10-04T12:00:00Z"
  }
  ```
* `InstanceLogsResponse`:
  ```json
  {
    "instance_id": 1,
    "container_id": "7f8b9a1c2d3e",
    "total_lines": 3,
    "lines": [
      "2026-10-04T12:00:01Z [notice] 1#1: using the epoll event method",
      "2026-10-04T12:00:02Z 127.0.0.1 - GET / HTTP/1.1 200 450",
      "2026-10-04T12:00:03Z [error] 29#29: open() /favicon.ico failed"
    ]
  }
  ```
* `InstanceActionResponse`:
  ```json
  {
    "message": "Instancia stop ejecutada exitosamente.",
    "status": "stopped"
  }
  ```
* `InstanceSyncResponse`:
  ```json
  {
    "instance_id": 1,
    "previous_status": "running",
    "current_status": "stopped",
    "synced": true
  }
  ```
* `InstanceDestroyResponse`:
  ```json
  {
    "message": "Instancia destruida, puerto liberado y almacenamiento limpiado correctamente.",
    "instance_id": 1
  }
  ```

### 2.2 Cliente API Frontend
Ubicación: `frontend/src/services/api.js` y `frontend/src/types/contracts.js`

El objeto `instanceService` expone:
* `getInstances()`: Obtiene la lista completa de instancias del usuario.
* `deployInstance(name, zipFile)`: Despliega un nuevo sitio con validación de cuota y Anti-Zip Slip.
* `triggerAction(instanceId, action)`: Ejecuta `'start'`, `'stop'` o `'restart'`.
* `destroyInstance(instanceId)`: Destruye el contenedor, libera el puerto y elimina el almacenamiento en disco.
* `getMetrics(instanceId)`: Obtiene telemetría de CPU y memoria en tiempo real.
* `getLogs(instanceId, tail = 100)`: Obtiene el buffer de salida de Nginx.
* `syncStatus(instanceId)`: Solicita la reconciliación entre Docker y la base de datos.

---

## 3. Scripts de Infraestructura y Diagnóstico (Rol 1)

* **Prueba de Cgroups:** `infra/scripts/test_resource_limits.sh`
  Ejecuta inspección con `docker stats` para comprobar que ningún contenedor supere su asignación de CPU o memoria RAM.
* **Auditoría de Huérfanos:** `infra/scripts/cleanup_orphans.py`
  Compara contenedores con etiqueta `managed_by=cloudpaas` con la tabla `instances` de PostgreSQL.
  * Modo diagnóstico: `python infra/scripts/cleanup_orphans.py`
  * Modo corrección: `python infra/scripts/cleanup_orphans.py --fix`

---

## 4. Bitácora Estructurada de Auditoría (T3.4)

Todas las operaciones de ciclo de vida se registran en los logs del backend bajo el formato estructurado:
```text
[ACTION_AUDIT] user_id={user_id} instance_id={instance_id} action={action} result={success|failed}
```
Esto permite trazabilidad forense y cumplimiento de requisitos no funcionales de auditoría para la entrega.
