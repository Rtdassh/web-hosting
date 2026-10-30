# Servidor web de producción Nginx Alpine ultraligero
# Optimizado para entornos de bajo ancho de banda (utiliza el bundle precompilado en dist/)
FROM nginx:1.27-alpine

# Copiar artefactos SPA ya compilados
COPY dist /usr/share/nginx/html

# Copiar configuración de producción con compresión Gzip, caché y reverse-proxy hacia /api/
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
