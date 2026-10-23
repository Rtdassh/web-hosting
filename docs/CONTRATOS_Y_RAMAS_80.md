# Guía de Ramas, Contratos de Integración y Trabajo Colaborativo (Hito 80%)
**Sistema:** CloudPaaS – Web Hosting as a Service  
**Hito Objetivo:** Avance Funcional 3 (80%) – Monetización, Suscripciones, Plantillas 1-Clic y Gobernanza Administrativa  
**Fecha de Entrega:** 23 de octubre de 2026  

---

## 1. Estrategia de Ramas en Git (Branching Model para el 80%)

Siguiendo el modelo GitFlow adaptado del proyecto, el desarrollo del hito del 80% se divide estrictamente en 4 ramas de características correspondientes a cada rol técnico, integrándose sobre `development`:

```plaintext
main (v0.5.0 actual ───► v0.8.0 al validar la entrega completa)
  ▲
development (Rama central de integración continua liderada por Rol 4)
  ▲
  ├── feat/r1-templates-host-metrics      (Rol 1: DevOps & Networking)
  ├── feat/r2-billing-admin-ui            (Rol 2: Frontend & UI/UX)
  ├── feat/r3-billing-admin-api           (Rol 3: Backend & Database)
  └── feat/r4-template-engine-e2e         (Rol 4: Integrador & Docker SDK)
```

### 1.1 Matriz de Asignación por Rol

| Rama | Rol Responsable | Alcance Técnico | Tareas Principales |
| :--- | :--- | :--- | :--- |
| `feat/r1-templates-host-metrics` | **Rol 1** (DevOps & Networking) | Estructura de plantillas en disco (`/srv/hosting/plantillas/`), script de métricas del host (`get_host_metrics.py`), configuración de subdominios locales y permisos de solo lectura. | T1.1, T1.2, T1.3, T1.4 |
| `feat/r2-billing-admin-ui` | **Rol 2** (Frontend & UI/UX) | Tarjetas comparativas de precios (`PricingPage`), modal de checkout con validación en vivo del Algoritmo de Luhn (`CheckoutModal`), historial de facturas y recibos (`BillingHistoryPage`, `ReceiptModal`), selector de plantillas en `DeployModal` y consola administrativa (`AdminDashboardPage`). | T2.1, T2.2, T2.3, T2.4, T2.5, T2.6 |
| `feat/r3-billing-admin-api` | **Rol 3** (Backend & Database) | Modelos de BD (`PaymentTransaction`, `Invoice`, `PasswordResetToken`, `AdminAuditLog`), servicio `BillingService` con Algoritmo de Luhn en backend, endpoints `/plans`, `/billing/*`, `/admin/*` y `/auth/forgot-password`. | T3.1, T3.2, T3.3, T3.4, T3.5 |
| `feat/r4-template-engine-e2e` | **Rol 4** (Integrador & Docker) | Servicio de clonación y aprovisionamiento `TemplateService`, middleware interceptor de cuotas en upgrade/downgrade, endpoints de acciones forzosas de admin y suite de pruebas E2E `test_flow_80.py`. | T4.1, T4.2, T4.3, T4.4 |

### 1.2 Reglas Operativas para los Desarrolladores
1. **Creación de Rama:**
   ```bash
   git checkout development
   git pull origin development
   git checkout -b feat/<nombre-rama-segun-rol>
   ```
2. **Convenciones de Commits (Conventional Commits Obligatorio):**
   * `feat(billing): implementacion del algoritmo de luhn en checkout`
   * `feat(templates): catalogo de plantillas 1-clic en filesystem`
   * `feat(admin): endpoints de metricas de plataforma y acciones forzosas`
   * `fix(quota): validacion preventiva de downgrade con instancias activas`
   * `test(e2e): suite de pruebas automatizadas para hito 80`
3. **Verificación Previa a Merge:**
   * Backend: Ejecutar `pytest backend/tests/test_flow_80.py` y verificar compilación limpia con `python -m compileall backend/app`.
   * Frontend: Ejecutar `npm run build` en `frontend/` sin errores de tipos o linting.

---

## 2. Contratos de Integración de API (API REST JSON)

### 2.1 Catálogo de Planes Parametrizados
* **Endpoint:** `GET /api/v1/plans`
* **Acceso:** Público / Autenticado
* **Respuesta Exitosa (HTTP 200 OK):**
```json
[
  {
    "id": 1,
    "name": "Free",
    "description": "Ideal para prototipos y sitios personales",
    "price": 0.00,
    "max_instances": 1,
    "max_ram_mb": 128,
    "cpu_quota": 0.25,
    "is_active": true
  },
  {
    "id": 2,
    "name": "Developer",
    "description": "Para desarrolladores con múltiples sitios activos",
    "price": 9.99,
    "max_instances": 3,
    "max_ram_mb": 256,
    "cpu_quota": 0.50,
    "is_active": true
  },
  {
    "id": 3,
    "name": "Pro",
    "description": "Máxima potencia para sitios de producción",
    "price": 24.99,
    "max_instances": 10,
    "max_ram_mb": 512,
    "cpu_quota": 1.00,
    "is_active": true
  }
]
```

---

### 2.2 Pasarela de Pago Simulada (Algoritmo de Luhn)
* **Endpoint:** `POST /api/v1/billing/checkout`
* **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Cuerpo de Solicitud (Request Body):**
```json
{
  "plan_id": 2,
  "card_holder": "JUAN PEREZ",
  "card_number": "4532015112830366",
  "exp_month": 12,
  "exp_year": 2028,
  "cvv": "123"
}
```
* **Respuesta Exitosa (HTTP 200 OK):**
```json
{
  "transaction_id": 1042,
  "status": "approved",
  "auth_code": "AUTH-7F9B2C",
  "plan_name": "Developer",
  "amount_charged": 9.99,
  "card_last_four": "0366",
  "card_brand": "Visa",
  "invoice_number": "INV-2026-1042",
  "new_quota": {
    "max_instances": 3,
    "max_ram_mb": 256,
    "cpu_quota": 0.50
  },
  "timestamp": "2026-10-23T10:15:30Z"
}
```
* **Respuestas de Error:**
  * `400 Bad Request`: Número de tarjeta no supera el Algoritmo de Luhn (`"detail": "El número de tarjeta no supera la validación del Algoritmo de Luhn (Módulo 10)."`).
  * `400 Bad Request`: Fecha de expiración inválida o vencida.

---

### 2.3 Historial de Facturas y Comprobantes
* **Endpoint:** `GET /api/v1/billing/invoices`
* **Headers:** `Authorization: Bearer <token>`
* **Respuesta Exitosa (HTTP 200 OK):**
```json
[
  {
    "id": 101,
    "invoice_number": "INV-2026-1042",
    "transaction_id": 1042,
    "plan_name": "Developer",
    "amount": 9.99,
    "tax": 1.60,
    "status": "paid",
    "auth_code": "AUTH-7F9B2C",
    "card_last_four": "0366",
    "card_brand": "Visa",
    "created_at": "2026-10-23T10:15:30Z"
  }
]
```

---

### 2.4 Cambio Dinámico de Suscripción (Upgrade / Downgrade)
* **Endpoint:** `POST /api/v1/subscriptions/change-plan`
* **Headers:** `Authorization: Bearer <token>`
* **Cuerpo de Solicitud:**
```json
{
  "target_plan_id": 1
}
```
* **Respuestas:**
  * `200 OK`: Plan actualizado exitosamente.
  * `400 Bad Request` (Bloqueo preventivo en Downgrade):
    ```json
    {
      "detail": "No se puede realizar el downgrade al plan Free. Tienes 3 instancias activas y el plan destino solo permite 1. Detén o elimina 2 instancias antes de continuar."
    }
    ```

---

### 2.5 Catálogo y Despliegue de Plantillas en 1 Clic
* **Endpoint:** `GET /api/v1/templates`
* **Respuesta Exitosa (HTTP 200 OK):**
```json
[
  {
    "id": "landing-business",
    "name": "Landing Page Moderna",
    "description": "Sitio comercial responsivo con hero, servicios y llamada a la acción.",
    "category": "Negocios",
    "preview_url": "/templates/previews/landing-business.png"
  },
  {
    "id": "personal-portfolio",
    "name": "Portafolio de Desarrollador",
    "description": "Página personal minimalista para destacar habilidades, proyectos y redes.",
    "category": "Personal",
    "preview_url": "/templates/previews/personal-portfolio.png"
  },
  {
    "id": "html5-docs",
    "name": "Documentación Técnica",
    "description": "Plantilla limpia con barra de navegación lateral y estilos claros.",
    "category": "Documentación",
    "preview_url": "/templates/previews/html5-docs.png"
  }
]
```
* **Endpoint:** `POST /api/v1/instances/deploy-template`
* **Headers:** `Authorization: Bearer <token>`
* **Cuerpo:**
```json
{
  "name": "Mi Portafolio Web",
  "template_id": "personal-portfolio"
}
```
* **Respuesta Exitosa (HTTP 201 Created):**
```json
{
  "id": 5,
  "uuid": "a7b3c9d1",
  "name": "Mi Portafolio Web",
  "assigned_port": 30004,
  "status": "running",
  "public_url": "http://localhost:30004",
  "template_used": "personal-portfolio",
  "created_at": "2026-10-23T11:00:00Z"
}
```

---

### 2.6 Consola de Gobernanza para Administradores
* **Endpoint:** `GET /api/v1/admin/dashboard`
* **Headers:** `Authorization: Bearer <admin_token>`
* **Respuesta Exitosa (HTTP 200 OK):**
```json
{
  "summary": {
    "total_users": 28,
    "total_revenue_simulated": 349.72,
    "total_instances": 14,
    "active_instances": 11,
    "stopped_instances": 3
  },
  "host_resources": {
    "cpu_usage_percent": 14.8,
    "memory_used_mb": 4200.5,
    "memory_total_mb": 16384.0,
    "memory_usage_percent": 25.6,
    "storage_used_gb": 12.4,
    "storage_total_gb": 240.0,
    "containers_running": 11,
    "containers_total": 14
  }
}
```
* **Endpoint:** `POST /api/v1/admin/instances/{id}/force-action`
* **Headers:** `Authorization: Bearer <admin_token>`
* **Cuerpo:**
```json
{
  "action": "force_destroy",
  "reason": "Uso excesivo no autorizado de recursos"
}
```
* **Respuesta Exitosa (HTTP 200 OK):**
```json
{
  "message": "Acción forzosa ejecutada exitosamente sobre la instancia 5.",
  "action": "force_destroy",
  "instance_id": 5,
  "audit_logged": true
}
```

---

## 3. Criterios de Aceptación (Definition of Done 80%)

- [ ] **Validación Algoritmo de Luhn:** En cliente (`CheckoutModal.jsx`) y en backend (`billing_service.py`), tarjetas inválidas son rechazadas inmediatamente.
- [ ] **Persistencia y Recibos:** Transacciones almacenadas con código `AUTH-XXXXXX` e historial consultable en `BillingHistoryPage`.
- [ ] **Control de Cuotas Upgrade/Downgrade:** Al pagar, las cuotas de RAM/CPU/sitios se incrementan; el downgrade se bloquea si el usuario supera la capacidad del nuevo plan.
- [ ] **Plantillas 1-Clic:** Provisión de sitios en menos de 5 segundos a partir de las 3 plantillas maestras en disco.
- [ ] **Panel Admin y Forzado de Acciones:** Rutas `/admin/*` protegidas por rol con métricas del host y capacidad de detener/eliminar contenedores anómalos.
- [ ] **Recuperación de Contraseña:** Generación de token temporal de 15 minutos en `/auth/forgot-password` y actualización en `/auth/reset-password`.
