# Imagen base ultraligera según RNF-02 (< 15MB disco, < 10MB RAM idle)
FROM nginx:1.27-alpine

# Reemplazar la configuración por defecto con la configuración segura de la plataforma
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto estándar HTTP
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
