#!/usr/bin/env bash
# ==============================================================================
# Script Maestro de Puesta en Marcha en Producción (Hito 100% - Rol 1)
# Sistema: CloudPaaS - Web Hosting as a Service
# Ejecución: ./infra/scripts/deploy_production.sh
# ==============================================================================

set -euo pipefail

echo "================================================================="
echo "       🚀 CloudPaaS - Despliegue Automatizado de Producción       "
echo "================================================================="

# 1. Comprobación de requisitos en el Host
echo "[1/6] Verificando dependencias del sistema anfitrión..."
command -v docker >/dev/null 2>&1 || { echo "❌ ERROR: Docker no está instalado."; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "❌ ERROR: Docker Compose no está disponible."; exit 1; }

# 2. Creación de directorios base de almacenamiento
echo "[2/6] Inicializando directorios de almacenamiento en host (/srv/hosting)..."
HOSTING_DIR="/srv/hosting"
sudo mkdir -p "${HOSTING_DIR}/instancias"
sudo mkdir -p "${HOSTING_DIR}/plantillas"
sudo chmod -R 755 "${HOSTING_DIR}"

# 3. Copia de plantillas oficiales si no existen
echo "[3/6] Sincronizando catálogo de plantillas 1-clic..."
TEMPLATES_SRC="./infra/host-storage/templates"
if [ -d "${TEMPLATES_SRC}" ]; then
  sudo cp -rn "${TEMPLATES_SRC}/"* "${HOSTING_DIR}/plantillas/" 2>/dev/null || true
  echo "✔ Plantillas sincronizadas en ${HOSTING_DIR}/plantillas"
fi

# 4. Redes Docker
echo "[4/6] Verificando redes Docker aisladas..."
docker network inspect paas_instances_network >/dev/null 2>&1 || \
  docker network create --driver bridge paas_instances_network

# 5. Compilación y Levantamiento de Servicios
echo "[5/6] Levantando orquestación de producción (docker-compose.prod.yml)..."
docker compose -f docker-compose.prod.yml up -d --build

# 6. Verificación de Salud
echo "[6/6] Verificando estado de contenedores..."
sleep 5
docker compose -f docker-compose.prod.yml ps

echo "================================================================="
echo "  ✅ Despliegue de Producción completado exitosamente."
echo "  Plataforma Web: http://localhost"
echo "  Documentación API: http://localhost:8000/docs"
echo "================================================================="
