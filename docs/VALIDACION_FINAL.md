# Validación final de Codrop

Fecha: **13 de noviembre de 2026** · Entorno operativo: servidor Debian, Nginx, API FastAPI y PostgreSQL.

## Resultado de las pruebas

| Verificación | Resultado | Alcance |
| --- | --- | --- |
| Backend, suite local completa | **449 aprobadas**, 4 omitidas, 36 subpruebas aprobadas | Servicios, validación, recuperación, cuotas, facturación, seguridad y contratos. |
| PostgreSQL 16 aislado en Debian | **18 aprobadas**, 22 subpruebas aprobadas | Incluye las pruebas PostgreSQL que el entorno local omitió: instalación nueva, migraciones, esquema heredado sintético y diagnóstico. |
| Frontend, suite completa | **110 aprobadas**, 21 archivos | Navegación, publicación, detalle, recuperación, pagos simulados y componentes compartidos. |
| Build de producción | **Aprobado** | Vite, con `VITE_API_URL=/api/v1`. |
| API operativa | **28 comprobaciones correctas** | Catálogos públicos, login, perfil, sitios, facturas, salud, métricas, logs, versiones, archivos y actividad. Incluye dos rechazos HTTP 401 esperados sin JWT. |
| Sitios alojados | **6 respuestas HTTP 200** | Comprobación desde el host de los puertos publicados existentes. |
| Nginx y PostgreSQL | **Correctos** | `nginx -t` y `pg_isready`. |
| pgAdmin de desarrollo | **Corregido y operativo** | Se sustituyó el correo `.local` rechazado por una dirección válida y configurable; la web responde HTTP 302 hacia el login. |
| Interfaz | **Verificada en navegador** | Landing, dashboard y detalle; revisiones previas en escritorio y móvil sin desbordamiento horizontal. |

La prueba inicial de instalación nueva detectó una aserción antigua que suponía un único registro en la tabla de tokens. La verificación de correo y la recuperación comparten esa tabla. Se corrigió la selección del token de recuperación, conservando las comprobaciones de hash y unicidad. La repetición sobre una base nueva completó las 18 pruebas correctamente.

Las suites emiten una advertencia de deprecación de Starlette/httpx; no produjo fallos. Las pruebas frontend también informan que jsdom no implementa `window.scrollTo`, cubierto adicionalmente con la revisión en navegador.

## Aislamiento y evidencias

Las pruebas PostgreSQL utilizaron un proyecto Docker independiente y una base temporal publicada exclusivamente en `127.0.0.1:55432`. La contraseña de prueba se generó en memoria y no se guardó en el repositorio. Los contenedores de prueba se detuvieron al terminar y sus volúmenes se conservaron para inspección. La base de usuarios no se migró ni modificó para estas pruebas.

Registro de la repetición aprobada en el servidor:

```text
/home/juan/codrop-backups/final-tests-20261113091943/postgres-tests.log
```

Los chequeos funcionales de los sitios existentes fueron de lectura: no ejecutaron paradas, reinicios, publicaciones, restauraciones ni eliminaciones. La corrección de pgAdmin recreó únicamente ese servicio, con respaldo previo de su compose.

## Estado de los contenedores existentes

La validación funcional es satisfactoria. El inventario de hardening mostró estas diferencias que deben mantenerse visibles:

- Los seis sitios tienen límite de memoria (128, 256 o 512 MB), contenido web montado en solo lectura, `privileged=false` y una red distinta de la utilizada por PostgreSQL.
- Cuatro contenedores tienen usuario explícito `101:101` y `cap_drop: ALL`. Dos contenedores heredados conservan el usuario predeterminado de su imagen y no tienen esa eliminación explícita de capacidades.
- Los seis contenedores tienen `ReadonlyRootfs=false`. El montaje de contenido en solo lectura está verificado; el sistema de archivos raíz completo en solo lectura **no** está aplicado. El aprovisionador actual tampoco solicita `read_only=True` al SDK.

Por tanto, este cierre no equivale a una certificación de endurecimiento completo. Homogeneizar los contenedores heredados y activar el rootfs de solo lectura requiere una intervención de infraestructura con prueba de las rutas temporales de Nginx y recreación controlada de las instancias. El informe distingue esa tarea de la disponibilidad y del comportamiento funcional comprobados.

## Presentación y documentación

- Se conservó exactamente el bloque inicial del README: logo, descripción, navegación y badges de tecnologías.
- El contenido se redujo de 641 a 261 líneas, priorizando producto, capturas y acceso a las guías específicas.
- Las tablas de dependencias extensas y los diagramas detallados se sustituyeron por un resumen y documentación enlazada.
- Se corrigieron instrucciones de instalación: migraciones y seed explícitos, URLs de documentación y separación entre instalación nueva y esquema existente.
- Las capturas se tomaron de la interfaz actual con la cuenta de demostración. Solo se sustituyeron en el DOM las direcciones de red privada por `localhost` para su presentación; no se modificaron datos del servidor.
- El checkout se identifica como simulación académica; el monitoreo no se presenta como SLA ni como analítica histórica.

Referencias editoriales revisadas: [README oficial de Supabase](https://github.com/supabase/supabase/blob/master/README.md) y [README oficial de Appwrite](https://github.com/appwrite/appwrite/blob/main/README.md). Se tomó como criterio la jerarquía de producto, captura y documentación; el texto y las imágenes de Codrop son propios del proyecto.
