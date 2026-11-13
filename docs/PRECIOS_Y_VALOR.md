# Precios de lanzamiento y prioridades

Tarifas mensuales en USD: Free 0, Developer 4.99 (3 sitios), Pro 9.99 (10 sitios). No cambian cuotas, facturas ni transacciones históricas. La facturación continúa siendo simulada. Los nuevos precios se usan en compras y renovaciones posteriores.

Referencias consultadas: Vercel Pro desde USD 20/mes (https://vercel.com/pricing), Cloudflare Pages con opción gratuita (https://www.cloudflare.com/products/pages/). Son servicios con capacidades diferentes; las tarifas propuestas posicionan el alcance estático actual y no demuestran rentabilidad. Antes de vender, medir costos de host, soporte, transferencia, almacenamiento y ocupación.

El seed sigue siendo aditivo. Para actualizar un catálogo existente explícitamente, con el entorno correcto de backend:

```sh
python -m app.seed --use-project-database --update-prices
```

Respaldar antes el catálogo. La operación exige los tres planes, bloquea sus filas y cambia únicamente price en una transacción; no es una migración de esquema.

Prioridades de valor: actualización de sitios sin cambiar URL; versiones y rollback; dominios con HTTPS; monitor de disponibilidad y alertas; cuota de almacenamiento y transferencia medible. Posteriormente integración Git y compilación aislada.
