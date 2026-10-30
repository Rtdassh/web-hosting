# Imagen base ultraligera y segura según RNF-02 y RNF-07 (< 25MB disco, < 10MB RAM idle)
FROM nginx:1.27-alpine

# Preparar directorios temporales con permisos de escritura para el usuario nginx (UID 101, GID 101)
RUN mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp \
    && chown -R 101:101 /tmp /var/cache/nginx /var/run /etc/nginx \
    && chmod -R 777 /tmp

# Copiar la configuración segura y endurecida non-root
COPY nginx-nonroot.conf /etc/nginx/nginx.conf

# Establecer usuario no privilegiado (UID 101 / GID 101)
USER 101:101

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
