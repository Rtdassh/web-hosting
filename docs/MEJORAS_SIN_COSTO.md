# Publicaciones, monitoreo y HTTPS sin servicios de pago

## Funciones incluidas

El detalle de cada proyecto permite publicar un ZIP y restaurar una versión anterior, conservando puerto y URL. Se validan autorización, suscripción y ZIP antes de detener el original. Se comprueba HTTP del candidato y se conserva el contenedor anterior hasta confirmar PostgreSQL. Puede haber unos segundos de indisponibilidad. Un journal privado permite al worker recuperar un proceso interrumpido. No cambia el esquema de base de datos.

Versiones y monitor: `HOSTING_STORAGE_PATH/.site-data/<id>/`, fuera de los document roots. Nunca servir HOSTING_STORAGE_PATH directamente. RELEASES_RETAINED=5 conserva la activa y hasta cuatro adicionales. Se mantienen límites de 25 MB comprimido y 100 MB descomprimido. Durante una carga puede haber una versión adicional y se conserva el directorio legado para recuperación. Reservar espacio: no es backup externo ni protección ante pérdida del host. Eliminar la instancia limpia esos datos.

El worker toma muestras HEAD / por ciclo (objetivo 30 segundos); persiste MONITOR_SAMPLES=2880 muestras, aproximadamente 24 horas sin interrupciones. Excluye paradas intencionales del porcentaje. Es disponibilidad desde el host, no SLA ni verificación pública de DNS/HTTPS. Con muchos sitios el ciclo puede tardar más; datos mayores a 120 segundos se muestran como antiguos.

MONITOR_HOST=127.0.0.1 sirve para FastAPI en el host. Si corre en Docker, configurar MONITOR_HOST=host.docker.internal y `extra_hosts: ["host.docker.internal:host-gateway"]` en backend; permitir esa conexión a los puertos del pool. Comprobar conectividad antes de anunciar disponibilidad. No visita URLs de clientes ni sigue redirecciones.

Las alertas de caída/recuperación aparecen mientras la aplicación autenticada está abierta, con consultas cada 30 segundos. No envía correos ni SMS. Los fallos de consulta no se convierten en falsas caídas.

Tráfico: solicitudes, errores y bytes de cuerpos de respuesta en las últimas 1000 líneas disponibles del contenedor actual, excluyendo HEAD. No son visitantes únicos, pageviews ni totales históricos; bots, assets y caché limitan su interpretación. Logs rotan y se reinician al reemplazar el contenedor. Los agregados no almacenan IPs ni rutas.

## HTTPS gratuito sin dominio: Quick Tunnel

No requiere cuenta ni comprar dominio. Es una URL temporal para demostraciones, no producción permanente. En el servidor Linux con Docker:

```sh
docker run --rm --network host cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://127.0.0.1:5173
```

La consola devuelve `https://<aleatorio>.trycloudflare.com`. Expone públicamente interfaz y API conservando autenticación. Para mostrar solo un sitio, usar su puerto, por ejemplo 30001. La URL cambia al reiniciar; cerrar el comando elimina el acceso. No cambia las URLs guardadas por Codrop. Si se prueban correos, configurar FRONTEND_URL y PASSWORD_RESET_FRONTEND_URL con esa URL y reiniciar backend con su procedimiento habitual.

Fuente: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

## Dominios y HTTPS con Caddy

Caddy es gratuito. Un certificado público requiere un hostname controlado, DNS correcto y puertos 80/443 alcanzables desde Internet. Una IP 100.x de Tailscale no es pública. Puede usarse un subdominio gratuito DuckDNS si se dispone de IP pública y acceso al router. CGNAT requiere un túnel. No abrir PostgreSQL ni Docker a Internet.

1. Copiar `infra/domains.example.json` a `infra/domains.json`.
2. Para probar en red privada mantener `.test` y `local: true`. Añadir al archivo hosts de cada cliente `100.112.65.75 codrop.test mi-sitio.test`, sustituyendo IP/puertos por los reales.
3. Generar, validar e iniciar (comprobar primero que 80/443 estén libres):

```sh
python3 infra/scripts/render_caddy_config.py infra/domains.json infra/Caddyfile
docker compose -f infra/docker-compose.https.yml run --rm caddy caddy validate --config /etc/caddy/Caddyfile
docker compose -f infra/docker-compose.https.yml up -d
```

El Compose usa red del host Linux, sin Docker socket. Para confiar en certificados locales, exportar la CA y confiar en ella únicamente en equipos de prueba:

```sh
docker compose -f infra/docker-compose.https.yml cp caddy:/data/caddy/pki/authorities/local/root.crt ./codrop-local-root.crt
```

En Windows importar la CA en certificados raíz de confianza del usuario. En Debian instalarla en `/usr/local/share/ca-certificates/` y ejecutar `sudo update-ca-certificates`. No compartir la clave privada. Visitar `https://codrop.test` o `https://mi-sitio.test` desde clientes configurados.

Para certificado público: usar dominio real, `local: false`, A/AAAA hacia IP pública correcta y permitir 80/443. Caddy solicita y renueva certificados. Para agregar dominios de clientes, el operador verifica control por DNS y añade hostname/puerto al JSON. No hay asociación automática sin verificar propiedad. Regenerar y recargar:

```sh
docker compose -f infra/docker-compose.https.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Son accesos adicionales; Codrop conserva su URL por puerto. Persistir volúmenes caddy_data/caddy_config. Configurar FRONTEND_URL y PASSWORD_RESET_FRONTEND_URL con la URL de la plataforma. El proxy conserva /api/ en el mismo origen.

Fuentes: https://caddyserver.com/docs/automatic-https , https://caddyserver.com/docs/quick-starts/reverse-proxy , https://www.duckdns.org/

## Verificación operativa

- Respaldar código, base y HOSTING_STORAGE_PATH antes de desplegar. Evitar --reload durante el reemplazo de módulos.
- ZIP válido: misma URL y contenido nuevo; rollback: contenido anterior. ZIP inválido no debe detener el original.
- Ante interrupción esperar el worker y revisar estado/logs antes de repetir. No editar handover.json con worker activo.
- Comprobar que un usuario no puede leer ni restaurar versiones de otro.
- Probar tráfico con solicitudes reales. Parar voluntariamente no debe generar alerta.
- Configuración opcional pendiente del operador: cuentas/túneles públicos, DNS, confianza de CA y exposición a Internet. No se contrata ningún servicio.
