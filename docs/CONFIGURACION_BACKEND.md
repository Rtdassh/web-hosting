# Configuración del backend

`ENVIRONMENT` acepta exactamente estos valores:

- `development`: desarrollo local; es el valor predeterminado.
- `testing`: pruebas automatizadas/locales.
- `production`: despliegue productivo; requiere secretos configurados.

En producción, configura `SECRET_KEY` y `POSTGRES_PASSWORD` mediante el gestor
de secretos o el entorno seguro del despliegue. La clave JWT debe contener al
menos 32 bytes UTF-8 y ambos valores deben diferir de los valores
predeterminados de desarrollo. El backend usa exclusivamente HS256 y limita la
vigencia del JWT a un máximo de 24 horas. No almacenes secretos en el repositorio
ni los imprimas en logs. Para generar una clave aleatoria, puede usarse
`python -c "import secrets; print(secrets.token_urlsafe(48))"` en un entorno
controlado y guardar el resultado directamente en el gestor de secretos.

Ejemplo de nombres de variables a configurar en el entorno de producción (sin
incluir sus valores):

```text
ENVIRONMENT
SECRET_KEY
POSTGRES_PASSWORD
ACCESS_TOKEN_EXPIRE_MINUTES
BREVO_API_KEY
BREVO_SENDER_EMAIL
BREVO_SENDER_NAME
PASSWORD_RESET_FRONTEND_URL
```

La URL PostgreSQL se construye con `sqlalchemy.engine.URL.create()`. SQLAlchemy
recibe la URL estructurada, por lo que contraseñas con caracteres reservados se
codifican al serializarse y no requieren concatenación ni codificación manual.

Brevo es el canal transaccional preferido. El remitente debe estar validado en
Brevo; la API requiere `BREVO_API_KEY` y `BREVO_SENDER_EMAIL`. Si no se configura
Brevo, se puede usar SMTP configurando `PASSWORD_RESET_SMTP_HOST`,
`PASSWORD_RESET_SMTP_PORT`, `PASSWORD_RESET_SMTP_SECURITY`,
`PASSWORD_RESET_FROM_EMAIL` y, cuando corresponda, usuario/contraseña SMTP.
`PASSWORD_RESET_FRONTEND_URL` es la URL base de la SPA sin query ni fragmento:
el enlace de recuperación agrega `reset_token` y el enlace de activación agrega
`token`. La SPA debe extraer y enviar dichos parámetros al endpoint
correspondiente. No es necesario ni seguro publicar el token en la respuesta API.

El middleware aplica límites por IP en memoria dentro de cada proceso. Si el
backend se despliega con varios workers o réplicas, configure un limitador
distribuido/proxy equivalente antes de considerarlo una defensa global.
