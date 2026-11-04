# Estado de la migración PostgreSQL en Debian

**Proyecto:** Codrop - Hito 80 %
**Fecha:** 3 de noviembre de 2026
**Estado:** Completada y verificada

## 1. Estado inicial

La base PostgreSQL 17.11 de Debian tenía 21 tablas
y no registraba versiones de Alembic.

Datos históricos identificados:
- Usuarios: 7
- Planes: 3
- Suscripciones: 7
- Instancias: 2
- Transacciones de pago: 0

## 2. Respaldo

Se generó el archivo:

paas_db_respaldo_20261103_175436.dump

El respaldo fue reconocido por pg_restore como
archivo CUSTOM de PostgreSQL 17.11.

También se conservó el respaldo original anterior
a las pruebas de migración.

Los respaldos y las credenciales se mantienen fuera
del repositorio Git.

## 3. Migraciones aplicadas

Se ejecutó la línea especial de Debian:

- d0001_adopt_debian
- d0002_admin_audit_set_null
- d0003_subscription_period
- d0004_financial_history

Las migraciones fueron probadas previamente en una
copia restaurada de la base histórica.

## 4. Verificaciones

Antes de la migración:
Read-only verification OK.

Después de la migración:
d0004_financial_history (head)
Read-only verification OK.

La auditoría posterior confirmó la conservación
de datos y estructuras según el contrato del proyecto.

## 5. Resultado

La actualización del esquema PostgreSQL en Debian
se completó correctamente.

No se requieren nuevas ejecuciones de estas
migraciones. Las modificaciones futuras deberán
realizarse mediante nuevas revisiones de Alembic.

## 6. Pendientes independientes

- Integrar el PR #4 en development.
- Configurar y probar el envío SMTP real.
- Revisar la presentación de impuestos.
- Validar el despliegue productivo de la aplicación.

Las pruebas funcionales de pagos, suscripciones y
hosting se realizaron en un entorno local aislado,
no sobre la base compartida de Debian.
