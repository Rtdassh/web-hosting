# Configuración del backend

`ENVIRONMENT` acepta exactamente estos valores:

- `development`: desarrollo local; es el valor predeterminado.
- `testing`: pruebas automatizadas/locales.
- `production`: despliegue productivo; requiere secretos configurados.

En producción, configura `SECRET_KEY` y `POSTGRES_PASSWORD` mediante el gestor
de secretos o el entorno seguro del despliegue. Ambos valores deben ser no
vacíos y distintos de los valores predeterminados de desarrollo. No los
almacenes en el repositorio ni los imprimas en logs. Para generar una clave
aleatoria, puede usarse `python -c "import secrets; print(secrets.token_urlsafe(48))"`
en un entorno controlado y guardar el resultado directamente en el gestor de
secretos.

Ejemplo de nombres de variables a configurar en el entorno de producción (sin
incluir sus valores):

```text
ENVIRONMENT
SECRET_KEY
POSTGRES_PASSWORD
```

La URL PostgreSQL se construye con `sqlalchemy.engine.URL.create()`. SQLAlchemy
recibe la URL estructurada, por lo que contraseñas con caracteres reservados se
codifican al serializarse y no requieren concatenación ni codificación manual.
