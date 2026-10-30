# Carpeta de Documentación Formal del Proyecto

Esta carpeta contiene la documentación técnica, funcional y de planeación de CloudPaaS.

## 📋 Planes de Trabajo y Contratos de Integración
* **Hito 50%:**
  * Plan: [plan_trabajo_50.md](file:///c:/Users/JDan/Documents/6to%20semestre/Software/proyecto/web-hosting/docs/plan_trabajo_50.md)
  * Contratos y Ramas: [CONTRATOS_Y_RAMAS_50.md](file:///c:/Users/JDan/Documents/6to%20semestre/Software/proyecto/web-hosting/docs/CONTRATOS_Y_RAMAS_50.md)
* **Hito 80% (Monetización, Plantillas y Gobernanza Admin):**
  * Plan: [plan_trabajo_80.md](file:///c:/Users/JDan/Documents/6to%20semestre/Software/proyecto/web-hosting/docs/plan_trabajo_80.md)
  * Contratos y Ramas: [CONTRATOS_Y_RAMAS_80.md](file:///c:/Users/JDan/Documents/6to%20semestre/Software/proyecto/web-hosting/docs/CONTRATOS_Y_RAMAS_80.md)
* **Hito 100% (Hardening, Calidad ISO/IEC 25010 y Sustentación):**
  * Plan: [plan_trabajo_100.md](file:///c:/Users/JDan/Documents/6to%20semestre/Software/proyecto/web-hosting/docs/plan_trabajo_100.md)
  * Contratos y Ramas: [CONTRATOS_Y_RAMAS_100.md](file:///c:/Users/JDan/Documents/6to%20semestre/Software/proyecto/web-hosting/docs/CONTRATOS_Y_RAMAS_100.md)

```plaintext
docs/
├── CONTRATOS_Y_RAMAS_50.md       # Guía de ramas y contratos para el Hito 50%
├── CONTRATOS_Y_RAMAS_80.md       # Guía de ramas y contratos para el Hito 80%
├── CONTRATOS_Y_RAMAS_100.md      # Guía de ramas y contratos para el Hito 100%
├── plan_trabajo_50.md            # Plan táctico del Hito 50%
├── plan_trabajo_80.md            # Plan táctico del Hito 80%
├── plan_trabajo_100.md           # Plan táctico del Hito 100%
├── requerimientos/               # Documento de Requisitos (SRS)
├── diseno/                       # Documento de Diseño de Software
├── manuales/                     # Manuales Técnico y de Usuario
└── entregables_oficiales_pdf/    # PDFs oficiales para sustentación final
```

# Migraciones PostgreSQL

El backend ya no crea tablas ni ejecuta semillas al arrancar. Consultar
[MIGRACIONES_ALEMBIC.md](MIGRACIONES_ALEMBIC.md) para instalaciones nuevas,
pruebas aisladas y la adopción pendiente de verificar de la base Debian.

La ruta específica de adopción del esquema heredado está en
[RECONCILIACION_DEBIAN.md](RECONCILIACION_DEBIAN.md); no utiliza stamp.

El mapeo ORM común y los contratos físicos de ambos historiales se describen en
[ADAPTACION_ORM_DEBIAN.md](ADAPTACION_ORM_DEBIAN.md).

