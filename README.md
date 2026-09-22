# CloudPaaS – Web Hosting Service (Plataforma como Servicio)

CloudPaaS es una plataforma PaaS para el aprovisionamiento automatizado y gestión del ciclo de vida de servidores web dedicados y aislados para aplicaciones estáticas (`HTML5`, `CSS3`, `JavaScript`, `SPAs`) mediante contenedores Docker basados en `nginx:alpine`, persistencia relacional en PostgreSQL y un panel de control interactivo en React 18.

---

##  Estructura del Repositorio (Monorepo)

```plaintext
web-hosting/
├── AGENTS.md                  # Especificación técnica, principios SOLID, reglas de arquitectura y Git
├── docker-compose.dev.yml     # Orquestación de PostgreSQL 16 y PgAdmin 4 para desarrollo
├── .env.example               # Plantilla de variables de entorno para backend y host
├── .gitignore                 # Reglas de exclusión de entornos virtuales, cachés y almacenamiento
├── README.md                  # Guía de incorporación e inicio para desarrolladores
│
├── backend/                   # Capa de Lógica de Negocio y Control (FastAPI + SQLAlchemy)
│   ├── app/
│   │   ├── api/v1/            # Endpoints REST (auth, instances)
│   │   ├── core/              # Configuración (Pydantic Settings), conexión a BD y seguridad JWT
│   │   ├── models/            # Modelos ORM SQLAlchemy (User, Instance, Plan, PortAllocation)
│   │   ├── schemas/           # Esquemas Pydantic para validación y DTOs
│   │   └── services/          # Servicios desacoplados (ArtifactService, DockerService, PortService)
│   ├── Dockerfile             # Imagen Docker para el backend FastAPI
│   └── requirements.txt       # Dependencias de Python (FastAPI, Uvicorn, SQLAlchemy, etc.)
│
├── frontend/                  # Capa de Presentación SPA (React 18 + Vite + Tailwind CSS)
│   ├── .env.example           # Variables de entorno para Vite (VITE_API_URL)
│   ├── index.html             # Punto de entrada HTML5 con fuente Inter
│   ├── package.json           # Dependencias de Node (React, Axios, Tailwind, Lucide)
│   └── src/
│       ├── components/        # Componentes reutilizables (Navbar, DeployModal, InstanceCards)
│       ├── pages/             # Vistas de la aplicación (DashboardPage)
│       └── services/          # Cliente HTTP centralizado (api.js con Axios)
│
├── infra/                     # Infraestructura, imágenes Docker y almacenamiento de host
│   ├── docker/
│   │   └── instance-nginx/    # Dockerfile y nginx.conf optimizado para las instancias
│   └── host-storage/
│       ├── instances/         # Directorios aislados por inquilino (/instances/<user_id>_<app_id>/)
│       └── templates/         # Plantillas base de sitios web
│
├── docs/                      # Documentación formal del proyecto
│   ├── README.md              # Estructura del sistema documental
│   └── plan_trabajo_30.md     # Plan de trabajo, roles y alcance del hito 30%
│
└── samples/                   # Paquetes y artefactos de prueba listos para desplegar
    ├── test-site/             # Sitio web estático de muestra
    └── test-site.zip          # Archivo .zip preempaquetado listo para probar en el panel
```

---

---

### Prerrequisitos
- **Git** instalado.
- **Docker Desktop** (en ejecución).
- **Python 3.11+** o **3.12+**.
- **Node.js 18+** o **20+** (con `pnpm` o `npm`).

---

### Paso 1: Configurar Variables de Entorno

Copia los archivos de plantilla de entorno:

```bash
# En la raíz del proyecto (para backend y compose):
cp .env.example .env

# En la carpeta frontend:
cp frontend/.env.example frontend/.env
```

---

### Paso 2: Iniciar Base de Datos (PostgreSQL 16)

Levanta el contenedor de PostgreSQL y PgAdmin:

```bash
docker compose -f docker-compose.dev.yml up -d
```

- **PostgreSQL:** `localhost:5432` (usuario: `paas_admin`, contraseña: `paas_secret_password`, base de datos: `paas_db`)
- **PgAdmin 4:** [http://localhost:5050](http://localhost:5050) (usuario: `admin@paas.local`, contraseña: `admin`)

---

### Paso 3: Iniciar el Backend (FastAPI)

Abre una terminal en la carpeta `backend`:

```bash
cd backend

# Crear y activar entorno virtual
python -m venv venv

# En Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# En Linux / macOS:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor de desarrollo
uvicorn app.main:app --reload --port 8000
```

- **API REST:** [http://localhost:8000](http://localhost:8000)
- **Documentación Swagger UI interactiva:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Datos iniciales sembrados automáticamente al arrancar:**
  - **Planes:** `Free` (1 sitio, 128MB RAM), `Developer` (3 sitios), `Pro` (10 sitios).
  - **Puertos:** Pool TCP dinámico `30001` a `30100`.
  - **Usuario demo:** `dev@cloudpaas.local` / `admin123` (con plan Free activo).

---

### Paso 4: Iniciar el Frontend (React + Vite)

Abre otra terminal en la carpeta `frontend`:

```bash
cd frontend

# Instalar dependencias (con pnpm o npm)
pnpm install
# o: npm install

# Iniciar servidor Vite
pnpm run dev
# o: npm run dev
```

- **Panel de Control:** [http://localhost:5173](http://localhost:5173)
