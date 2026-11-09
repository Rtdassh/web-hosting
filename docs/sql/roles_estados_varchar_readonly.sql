-- PostgreSQL 16/17. Una sola consulta, solo lectura. Sin IDs ni datos personales.
-- Usar si los controles corregidos detectan etiquetas incompatibles con el ORM.
-- Solo se muestran categorias fijas; los valores desconocidos nunca se exportan.
WITH etiquetas AS (
    SELECT 'users.role' AS elemento,
           CASE WHEN role IS NULL THEN 'NULL'
                WHEN role::text IN ('ADMIN','CLIENT') THEN 'NOMBRES_ORM_MAYUSCULAS'
                WHEN role::text IN ('admin','client') THEN 'VALORES_JSON_MINUSCULAS'
                ELSE 'OTROS_NO_EXPORTADOS' END AS representacion
    FROM public.users
    UNION ALL
    SELECT 'instances.status',
           CASE WHEN status IS NULL THEN 'NULL'
                WHEN status::text IN ('PENDING','RUNNING','STOPPED','FAILED') THEN 'NOMBRES_ORM_MAYUSCULAS'
                WHEN status::text IN ('pending','running','stopped','failed') THEN 'VALORES_JSON_MINUSCULAS'
                ELSE 'OTROS_NO_EXPORTADOS' END
    FROM public.instances
)
SELECT elemento, representacion, count(*) AS cantidad
FROM etiquetas
GROUP BY elemento, representacion
ORDER BY elemento, representacion;
