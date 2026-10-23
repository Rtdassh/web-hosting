# Guía de Ramas, Contratos de Integración y Trabajo Colaborativo (Hito 100%)
**Sistema:** CloudPaaS – Web Hosting as a Service  
**Hito Objetivo:** Avance Final y Sustentación (100%) – Hardening Productivo, Calidad ISO/IEC 25010, Documentación Completa y Startup Pitch  
**Fecha de Entrega:** Primera semana de noviembre de 2026  

---

## 1. Estrategia de Ramas en Git (Branching Model para el 100%)

Para culminar la plataforma y consolidar la versión final de producción (`v1.0.0`), se definen las siguientes ramas de características por rol:

```plaintext
main (v0.8.0 ───► v1.0.0 Listo para Evaluación Oficial y Demo)
  ▲
development (Rama central de consolidación liderada por Rol 4)
  ▲
  ├── feat/r1-hardening-benchmarking     (Rol 1: DevOps & Hardening)
  ├── feat/r2-email-polish-manual        (Rol 2: Frontend & UI/UX Polish)
  ├── feat/r3-verify-ratelimit-srs       (Rol 3: Backend & Security API)
  └── feat/r4-sync-worker-e2e-pitch      (Rol 4: Integrador & Calidad ISO)
```

### 1.1 Matriz de Asignación de Roles hacia el 100%

| Rama | Rol Responsable | Alcance Técnico | Entregables Principales |
| :--- | :--- | :--- | :--- |
| `feat/r1-hardening-benchmarking` | **Rol 1** (DevOps & Hardening) | Imagen Nginx Non-Root (UID 101), `cap_drop: ALL`, `docker-compose.prod.yml`, script `deploy_production.sh`, suite `benchmark_quality.sh` (RNF-01 a RNF-08). | Docker prod, Scripts de test, Sección de Infra en Manual Técnico. |
| `feat/r2-email-polish-manual` | **Rol 2** (Frontend & UI Polish) | Flujo completo de verificación de correo en `Verification.jsx`, microinteracciones, banners de cuota en el navbar, empty states, toasts y redacción del Manual de Usuario ilustrado. | Componentes UI refinados, capturas de pantalla y Manual de Usuario formal. |
| `feat/r3-verify-ratelimit-srs` | **Rol 3** (Backend & Security API) | Endpoint `GET /auth/verify-email`, middleware de Rate Limiting (5 req/min en login), cabeceras HTTP de seguridad, enriquecimiento de OpenAPI `/docs` y redacción del Documento SRS (IEEE 830). | Backend security, Documento SRS PDF, Modelo ER formal. |
| `feat/r4-sync-worker-e2e-pitch` | **Rol 4** (Integrador & Calidad) | Demonio de reconciliación automática periódica `sync_worker.py` (RNF-09), pruebas E2E `test_quality_100.py`, redacción del Documento de Diseño y Arquitectura (UML/ER) y libreto del Pitch. | Worker sync, Documento Arquitectura PDF, Consolidación a `main` v1.0.0. |

---

## 2. Contratos de Integración de API (Hito 100%)

### 2.1 Verificación de Correo Electrónico (RF-02)
* **Endpoint:** `GET /api/v1/auth/verify-email`
* **Query Params:** `?token=<jwt_token_verificacion>`
* **Respuesta Exitosa (HTTP 200 OK):**
```json
{
  "message": "Correo electrónico verificado exitosamente. Tu cuenta se encuentra activa.",
  "is_verified": true,
  "email": "nuevo_cliente@empresa.com"
}
```
* **Respuestas de Error:**
  * `400 Bad Request`: Token expirado, ya utilizado o firma no válida.

---

### 2.2 Rate Limiting y Cabeceras de Seguridad (RNF-06)
* **Regla:** Máximo 5 intentos por minuto en el endpoint `POST /api/v1/auth/login` por dirección IP.
* **Respuesta en caso de exceso (HTTP 429 Too Many Requests):**
```json
{
  "detail": "Demasiadas peticiones. Por favor espera 60 segundos antes de intentar nuevamente.",
  "retry_after": 60
}
```
* **Cabeceras HTTP de Seguridad Inyectadas:**
  * `X-Content-Type-Options: nosniff`
  * `X-Frame-Options: DENY`
  * `Content-Security-Policy: default-src 'self'`
  * `Strict-Transport-Security: max-age=31536000; includeSubDomains`

---

### 2.3 Demonio de Reconciliación Automática de Estado (RNF-09)
* **Módulo:** `backend/app/services/sync_worker.py`
* **Comportamiento:**
  1. Cada 30 segundos, consulta `docker.client.containers.list(all=True)`.
  2. Mapea contra los registros de la tabla `instances` de PostgreSQL.
  3. Si un contenedor fue eliminado o detenido externamente vía terminal del host (ej. `docker kill`), el worker actualiza el registro en BD de `running` a `stopped` o `failed` y registra una entrada en la bitácora de auditoría.
  4. Si una instancia en BD está marcada como `running` pero el contenedor no existe, libera preventivamente el puerto TCP asignado en `ports`.

---

## 3. Matriz de Validación de Calidad ISO/IEC 25010 (Automatizada)

| Identificador | Característica | Métrica Objetivo | Script Automatizado |
| :--- | :--- | :--- | :--- |
| **RNF-01** | Eficiencia de Desempeño | Tiempo de provisión < 5.0 s | `infra/scripts/benchmark_quality.sh --provision` |
| **RNF-02** | Huella de Memoria | RAM en reposo < 10 MB | `infra/scripts/benchmark_quality.sh --memory` |
| **RNF-03** | Rendimiento Temporal | Latencia P95 < 200 ms con 50 VU | `infra/scripts/benchmark_quality.sh --latency` |
| **RNF-04 / 07** | Confinamiento y Menor Privilegio | Montaje `:ro`, UID 101, `cap_drop: ALL` | `infra/scripts/benchmark_quality.sh --security` |
| **RNF-08** | Confiabilidad (Anti-OOM) | Contención OOM sin afectar host | `infra/scripts/benchmark_quality.sh --oom` |
| **RNF-09** | Confiabilidad (Resiliencia) | Reconciliación en < 30 s | `pytest backend/tests/test_quality_100.py` |

---

## 4. Cuatro Documentos Oficiales de Entrega

La carpeta `docs/entregables_oficiales_pdf/` albergará:
1. `01_Documento_de_Requisitos_SRS_Codrop.pdf` (SRS IEEE 830, RF-01 a RF-23, RNF-01 a RNF-12).
2. `02_Documento_de_Diseno_y_Arquitectura_Codrop.pdf` (Diagramas C4, UML Clases, Secuencia y ER).
3. `03_Manual_Tecnico_Codrop.pdf` (Arquitectura de contenedores, scripts, variables de entorno, cgroups).
4. `04_Manual_de_Usuario_Codrop.pdf` (Guía paso a paso ilustrada para el usuario final y admin).

---

## 5. Criterios de Aceptación para la Entrega Final (Definition of Done 100%)

- [ ] **Despliegue Productivo Automatizado:** Puesta en marcha total mediante `./infra/scripts/deploy_production.sh` y `docker-compose.prod.yml`.
- [ ] **Contenedores Non-Root:** Proceso Nginx corriendo con UID 101 y `cap_drop: ALL`.
- [ ] **Sync Worker Activo:** Reconciliación automática y consistente entre Docker Engine y PostgreSQL.
- [ ] **Rate Limiting y Seguridad:** Protección contra fuerza bruta y cabeceras estrictas.
- [ ] **Calidad ISO/IEC 25010 Validada:** Pruebas automatizadas de provisión, huella ligera, P95 y OOM superadas.
- [ ] **Los 4 Documentos Oficiales:** SRS, Arquitectura, Manual Técnico y Manual de Usuario entregados.
- [ ] **Sustentación Exitosa:** Demo fluida y repositorio consolidado con tag `v1.0.0` en `main`.
