# Especificación de Requisitos de Software (SRS)

## Codrop CloudPaaS — Plataforma de alojamiento web

| Campo | Valor |
|---|---|
| Identificador | CODROP-SRS-001 |
| Versión | 1.0 |
| Estado | Especificación base para el hito 100 % |
| Fecha | 5 de noviembre de 2026 |
| Referencia | IEEE 830; características de calidad ISO/IEC 25010 |

## 1. Introducción

### 1.1 Propósito

Este documento define los requisitos funcionales, interfaces, restricciones y requisitos de calidad de Codrop CloudPaaS. Sirve como referencia para desarrollo, pruebas de aceptación, integración entre roles y evolución del producto. Los estados de cumplimiento mencionados en el plan de trabajo son objetivos del equipo; este documento no sustituye evidencia de pruebas o mediciones.

### 1.2 Alcance

Codrop permite a clientes registrar una cuenta, contratar planes simulados y desplegar sitios web estáticos aislados en contenedores. El servicio ofrece gestión del ciclo de vida, consulta de métricas y logs, facturación simulada y funciones de administración con control de acceso basado en roles.

La solución se compone de una SPA React, una API REST FastAPI, persistencia PostgreSQL y un adaptador de orquestación Docker. El envío transaccional de correo usa Brevo cuando está configurado; SMTP es un adaptador alternativo disponible. El pago es una simulación académica y no procesa fondos reales.

### 1.3 Definiciones y abreviaturas

| Término | Definición |
|---|---|
| Cliente | Usuario de la plataforma con acceso a sus propias instancias y suscripción. |
| Administrador | Usuario con permisos globales de consulta y acciones administrativas auditadas. |
| JWT | Token firmado para autenticar solicitudes API. |
| RBAC | Control de acceso basado en roles. |
| Token de un solo uso | Secreto aleatorio entregado fuera de banda; se almacena como hash, expira y se consume una vez. |
| PaaS | Plataforma como servicio. |
| MoSCoW | Priorización Must, Should, Could y Won’t para esta versión. |

### 1.4 Convenciones

- Los requisitos `RF-nn` son funcionales y `RNF-nn` son no funcionales.
- Los códigos HTTP forman parte del contrato público de la API.
- Los tokens y contraseñas no se deben incluir en logs ni respuestas de error.
- Las cantidades y métricas de rendimiento son criterios de aceptación; requieren medición reproducible para declararse cumplidas.

## 2. Descripción general

### 2.1 Perspectiva del producto

La aplicación expone una API versionada bajo `/api/v1`. La SPA consume JSON por HTTP(S). FastAPI publica OpenAPI, Swagger UI en `/docs` y Redoc en `/redoc`. PostgreSQL conserva usuarios, planes, suscripciones, instancias, asignaciones de puertos, transacciones, facturas, bitácora administrativa y tokens temporales. Docker aloja los sitios de clientes en contenedores independientes.

### 2.2 Clases de usuario

| Actor | Necesidades y permisos |
|---|---|
| Visitante | Consultar planes y crear una cuenta. |
| Cliente | Verificar correo, autenticarse, administrar su suscripción e instancias, consultar facturas, métricas y logs propios. |
| Administrador | Consultar métricas e instancias globales y ejecutar acciones de emergencia con auditoría. |
| Servicio de correo | Entregar mensajes de verificación y recuperación por Brevo o SMTP; no recibe contraseñas. |
| Docker Engine | Crear, consultar y controlar instancias según las solicitudes autorizadas de la API. |

### 2.3 Entorno operativo

- Backend: Python, FastAPI, SQLAlchemy y Alembic.
- Base de datos: PostgreSQL; las pruebas funcionales deben usar bases aisladas.
- Correo: API REST de Brevo o SMTP con configuración explícita.
- Orquestación: Docker Engine y redes/volúmenes definidos por la plataforma.
- Frontend: React/Vite; sus cambios quedan fuera del alcance del Rol 3.

### 2.4 Restricciones y supuestos

1. La configuración de producción provee `SECRET_KEY`, credenciales PostgreSQL y datos válidos del remitente/canal de correo mediante variables de entorno.
2. No se almacenan claves completas de pago; la pasarela es simulada.
3. Las operaciones de Docker y despliegue requieren infraestructura provista por el Rol 1.
4. La pantalla que interpreta enlaces de activación corresponde al Rol 2. La API ofrece `GET /api/v1/auth/verify-email?token=...`; el cliente debe leer `token` de la URL y mostrar el resultado.
5. La base de datos real del host Debian no forma parte de pruebas ni validación automática. Las migraciones se aplican solo mediante el procedimiento aprobado y a una instancia aislada.
6. El limitador en memoria aplica por proceso y por IP observada directamente por ASGI. No sustituye un limitador distribuido cuando se ejecutan varios workers o réplicas.

## 3. Requisitos de interfaz externa

### 3.1 Interfaz de usuario

La SPA debe facilitar registro, activación por enlace, login, recuperación de contraseña, catálogo/compra simulada, despliegue y administración de instancias. Debe informar de errores sin mostrar tokens, hashes ni detalles internos.

### 3.2 Interfaz de software

| Interfaz | Contrato |
|---|---|
| API REST | JSON y HTTP; prefijo `/api/v1`; autenticación protegida por `Authorization: Bearer <JWT>`. |
| OpenAPI | `/api/v1/openapi.json`; documentación interactiva en `/docs` y `/redoc`. |
| Correo | Brevo `/v3/smtp/email` o SMTP configurado; el secreto del token viaja únicamente en el mensaje destinado al usuario. |
| PostgreSQL | Acceso mediante SQLAlchemy; los cambios de esquema se versionan con Alembic y no se aplican durante pruebas contra servidores compartidos. |
| Docker Engine | Operaciones de ciclo de vida y observabilidad mediadas por servicios de backend. |

### 3.3 Interfaz de comunicaciones

Las comunicaciones de navegador deben usar HTTPS en producción. CORS debe restringirse a los orígenes aprobados. Las respuestas API incluyen CSP, `no-store`, `no-referrer` y cabeceras de endurecimiento; las páginas de documentación aplican una política CSP compatible con los recursos de Swagger/Redoc.

## 4. Requisitos funcionales

Prioridad de esta versión: **M** (Must), **S** (Should), **C** (Could), **W** (Won’t).

| ID | Prioridad | Requisito |
|---|---:|---|
| RF-01 | M | El sistema permitirá registrar un cliente con correo normalizado, nombre y contraseña; asignará el plan Free y mantendrá la cuenta sin verificar hasta confirmar el correo. |
| RF-02 | M | El sistema generará un token aleatorio de verificación, persistirá solo su hash, lo enviará por correo, lo hará expirar en 24 horas, permitirá reenviarlo y consumirá cada enlace una sola vez. Un reenvío invalidará enlaces anteriores. |
| RF-03 | M | El sistema autenticará usuarios con correo y contraseña; solo cuentas activas y verificadas recibirán un JWT firmado HS256 con expiración configurable, cuyo valor predeterminado será de 24 horas. |
| RF-04 | M | El usuario autenticado consultará su perfil, rol y cuota vigente. El cierre de sesión de un JWT sin estado corresponde al cliente; no se promete revocación del token en el servidor. |
| RF-05 | M | El sistema permitirá solicitar recuperación con respuesta no enumerativa y token aleatorio de un solo uso con expiración de 15 minutos. El restablecimiento actualizará el hash bcrypt sin revelar el token. |
| RF-06 | M | El sistema restringirá operaciones administrativas a cuentas con rol `admin`; un cliente recibirá HTTP 403 al invocar rutas administrativas. |
| RF-07 | M | El visitante consultará los planes activos con precio y límites publicados. |
| RF-08 | M | El sistema asignará una suscripción Free al cliente nuevo y expondrá el plan y sus cuotas vigentes. |
| RF-09 | M | El sistema simulará checkout y validará los datos de tarjeta mediante Luhn y vigencia; no procesará ni conservará el número completo de tarjeta ni el CVV. |
| RF-10 | M | El cliente consultará su historial de transacciones y comprobantes; la información financiera histórica será inmutable según las restricciones de base de datos existentes. |
| RF-11 | M | El cliente solicitará upgrade/downgrade; el sistema validará el plan y evitará downgrade incompatible con instancias activas. |
| RF-12 | M | El backend aplicará cuotas del plan a la creación y operación de instancias, rechazando operaciones que excedan los límites. |
| RF-13 | M | El cliente desplegará un sitio desde ZIP; el backend validará el contenido y rechazará rutas que escapen del directorio asignado (Zip Slip). |
| RF-14 | S | El cliente desplegará una plantilla desde un catálogo permitido sin cargar un ZIP. |
| RF-15 | M | Cada instancia respetará los límites de CPU y RAM asignados por el plan. |
| RF-16 | M | El cliente autorizado iniciará, detendrá o reiniciará su instancia; las operaciones administrativas se regirán por RF-23. |
| RF-17 | M | El cliente eliminará una instancia propia; la operación liberará de forma segura su puerto y almacenamiento asociado. |
| RF-18 | M | El backend reservará puertos disponibles exclusivamente del rango configurado `30001–30100`, evitando asignaciones duplicadas. |
| RF-19 | S | El sistema expondrá una URL pública/local de acceso para cada instancia en ejecución. |
| RF-20 | S | El cliente consultará métricas de CPU y memoria de sus instancias; el acceso a instancias ajenas será denegado. |
| RF-21 | S | El cliente consultará un número acotado de líneas recientes de logs de sus instancias; el acceso a instancias ajenas será denegado. |
| RF-22 | S | El administrador consultará métricas agregadas de usuarios, instancias, facturación simulada y recursos del host disponibles. |
| RF-23 | M | El administrador ejecutará acciones forzosas autorizadas sobre instancias de terceros; cada acción registrará actor, objetivo, acción y resultado en la bitácora. |

## 5. Requisitos no funcionales

| ID | Atributo ISO/IEC 25010 | Criterio de aceptación |
|---|---|---|
| RNF-01 | Eficiencia de desempeño | El tiempo promedio de provisión de 10 instancias será inferior a 5 s bajo el entorno de medición acordado. |
| RNF-02 | Capacidad | La memoria en reposo por contenedor será menor a 10 MB y el almacenamiento de imagen/directorio menor a 25 MB, medidos en el host objetivo. |
| RNF-03 | Rendimiento temporal | P95 de API menor a 200 ms en una prueba de 500 solicitudes con concurrencia 50 sobre endpoints de consulta. |
| RNF-04 | Seguridad / aislamiento | Instancias de cliente no tendrán conectividad a la red privada de backend/DB y sus archivos publicados serán de solo lectura. |
| RNF-05 | Integridad | Cargas ZIP con rutas de escape serán rechazadas sin escribir fuera del espacio del cliente. |
| RNF-06 | Seguridad / autenticación | Contraseñas con bcrypt y coste 12; JWT HS256; vencimiento no superior a 24 horas; tokens temporales almacenados solo como hash. |
| RNF-07 | Seguridad / menor privilegio | Contenedores de hosting ejecutarán Nginx sin root (UID/GID 101), con capacidades eliminadas y sistema de archivos raíz de solo lectura conforme al despliegue. |
| RNF-08 | Confiabilidad / recursos | Los límites cgroup contendrán agotamiento de memoria de una instancia sin afectar host ni otros clientes. |
| RNF-09 | Confiabilidad / consistencia | Un worker reconciliará estado de Docker y PostgreSQL en un máximo de 30 s ante fallos externos. |
| RNF-10 | Usabilidad | La interfaz mostrará estados, cuotas, progreso y errores de forma clara y adaptable a móvil/escritorio. |
| RNF-11 | Portabilidad / mantenibilidad | Frontend y backend se comunicarán mediante API REST versionada y desacoplada; la configuración se suministrará externamente. |
| RNF-12 | Mantenibilidad | La API publicará OpenAPI versionado, esquemas tipados y documentación Swagger/Redoc funcional. |

Los umbrales de RNF-01 a RNF-03 y RNF-07 a RNF-10 requieren evidencia del entorno de infraestructura; no se consideran comprobados por pruebas unitarias del backend.

## 6. Requisitos de seguridad y datos

1. Contraseñas de mínimo 8 caracteres y máximo 72 bytes UTF-8 (límite de bcrypt); nunca se almacenan en claro.
2. Los tokens de activación y recuperación se generan con CSPRNG, se almacenan como SHA-256 de dominio separado y se consumen mediante una actualización atómica con condición de no usado y no expirado.
3. Los tokens de verificación se guardan en la tabla existente `password_reset_tokens` con prefijo de propósito `email-verification:` para aislarlos de los tokens de recuperación sin alterar el esquema desplegado. Los tokens de recuperación conservan su hash histórico sin prefijo.
4. Las respuestas de reenvío de verificación y recuperación no distinguen entre correo desconocido y estado que no requiere acción. Fallos de envío invalidan el token emitido; logs solo contienen el tipo de error.
5. La API limita por IP: 5 solicitudes/minuto para login, registro, recuperación, restablecimiento y reenvío; 10/minuto para verificación; 30/minuto para despliegue, acciones de instancias, acciones administrativas, checkout y cambios de suscripción.
6. El límite en memoria es local al proceso. Para varias réplicas se requiere un almacenamiento compartido (por ejemplo Redis) o limitar el tráfico en un proxy confiable.
7. El rol se consulta desde la base de datos en cada solicitud y debe concordar con el claim del JWT. Tokens ausentes, expirados, malformados, de rol desactualizado o de cuenta inactiva/no verificada se rechazan con HTTP 401.
8. Las pruebas deben usar SQLite temporal o PostgreSQL de prueba autorizado. Ninguna prueba del SRS requiere acceder o migrar la base Debian compartida.

## 7. Casos de uso principales

### CU-01 — Registro y activación

**Actor principal:** Visitante. **Precondiciones:** plan Free activo y canal de correo configurado.

1. El visitante envía correo, nombre y contraseña.
2. El sistema valida y normaliza entradas, crea usuario no verificado, asigna plan Free y guarda un token de verificación hasheado.
3. El sistema envía un enlace con `token` durante 24 horas.
4. El usuario solicita `GET /api/v1/auth/verify-email?token=...`.
5. El backend consume token de forma atómica, marca `is_verified=true` y devuelve confirmación.
6. El usuario puede iniciar sesión. Un enlace inválido, usado o expirado produce HTTP 400; una cuenta no verificada no puede autenticarse.

**Alternos:** Si el correo falla, la cuenta permanece pendiente, el token se invalida y se responde con error explícito; el usuario puede pedir reenvío. El reenvío revoca enlaces anteriores y no revela si la cuenta existe.

### CU-02 — Recuperación de contraseña

1. El usuario solicita recuperación.
2. La API responde de forma genérica y, si corresponde, entrega un enlace de 15 minutos por correo.
3. El usuario envía el token y una contraseña nueva.
4. La API valida y consume el token en una transacción, actualiza bcrypt y rechaza cualquier reuso.

### CU-03 — Administración de instancia

1. El cliente presenta JWT vigente.
2. El backend valida cuenta, rol y propiedad de instancia.
3. El servicio ejecuta la acción solicitada y registra auditoría cuando corresponda.
4. Solicitudes por encima del límite de tasa responden HTTP 429 con `Retry-After`.

## 8. Persistencia lógica

Entidades principales del producto: `users`, `plans`, `subscriptions`, `instances`, `port_allocations`, `payment_transactions`, `invoices`, `admin_audit_logs` y `password_reset_tokens`.

| Entidad | Responsabilidad |
|---|---|
| `users` | Correo único, hash de contraseña, rol, estado activo/verificado y fecha de creación. |
| `plans` | Catálogo de precio y cuotas técnicas. |
| `subscriptions` | Relación entre usuario, plan y periodo/estado de suscripción. |
| `instances` | Propietario, contenedor, puerto, ruta de almacenamiento, URL y estado. |
| `port_allocations` | Reserva y liberación de puertos del pool. |
| `payment_transactions` | Registro inmutable de pagos simulados, monto, estado y metadatos no sensibles. |
| `invoices` | Comprobantes asociados a transacciones. |
| `admin_audit_logs` | Actor administrativo, objetivo, acción y fecha. |
| `password_reset_tokens` | Hash, usuario, expiración, uso y creación de tokens de recuperación y verificación con propósitos separados. |

Las claves foráneas, índices y tipos físicos exactos se rigen por la revisión Alembic aplicable al perfil de base de datos. No se deben cambiar ni migrar instancias compartidas sin evidencia, respaldo y autorización.

## 9. Contrato API IAM

| Método y ruta | Autenticación | Éxito | Errores principales |
|---|---|---|---|
| `POST /api/v1/auth/register` | No | 201 | 400, 422, 429, 503 |
| `POST /api/v1/auth/login` | No | 200 | 401, 403, 422, 429 |
| `GET /api/v1/auth/me` | Bearer | 200 | 401 |
| `POST /api/v1/auth/forgot-password` | No | 200 genérico | 422, 429, 503 |
| `POST /api/v1/auth/reset-password` | No | 200 | 400, 422, 429 |
| `GET /api/v1/auth/verify-email?token=...` | No | 200 | 400, 422, 429 |
| `POST /api/v1/auth/resend-verification` | No | 200 genérico | 422, 429, 503 |

## 10. Criterios de aceptación y trazabilidad

| Requisito | Evidencia automatizada o manual esperada |
|---|---|
| RF-01/RF-02 | Pruebas aisladas de registro, correo entregado, hash persistido, vencimiento, reenvío, revocación y uso único. |
| RF-03/RF-06 | Pruebas de login previo/posterior a activación, firma/expiración JWT y denegación RBAC. |
| RF-05 | Pruebas de expiración de 15 minutos, respuesta genérica, consumo concurrente único y fallo de envío. |
| RNF-06 | Verificación de contexto bcrypt, algoritmo HS256 y TTL JWT configurado. |
| Rate limiting | Pruebas de umbral por endpoint, separación de buckets, HTTP 429, `Retry-After` y cabeceras de seguridad. |
| RNF-01 a RNF-03/RNF-07 a RNF-10 | Reportes de benchmark, Docker/cgroups, aislamiento de red y pruebas E2E ejecutadas en ambiente aislado aprobado. |
| RNF-12 | Inspección de `/docs`, `/redoc`, OpenAPI y códigos/modelos publicados. |

## 11. Riesgos y dependencias pendientes

- El cliente frontend debe extraer `token` del enlace de activación y presentar estados de éxito/error; queda fuera del Rol 3.
- La entrega productiva necesita configurar `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (o remitente SMTP), nombre de remitente y `PASSWORD_RESET_FRONTEND_URL`. Las credenciales deben residir solo en el gestor de secretos/entorno, nunca en Git.
- El rate limiter local no comparte estado entre workers; producción multiworker requiere una capa distribuida o limitación equivalente en infraestructura (Rol 1).
- Las mediciones de P95, OOM, Non-Root y aislamiento requieren Docker/host; no pueden inferirse desde pruebas unitarias.
- El plan de trabajo exige PDFs formales. Este archivo es la fuente editable SRS; la exportación y diagramación PDF deben realizarse con la herramienta institucional acordada.
