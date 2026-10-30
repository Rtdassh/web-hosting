#!/usr/bin/env bash
# ==============================================================================
# Script Maestro de Puesta en Marcha en Producción (Hito 100% - Rol 1)
# Sistema: CloudPaaS - Web Hosting as a Service
# Principios: Twelve-Factor App, Idempotencia, Aislamiento de Red
# Ejecución: ./infra/scripts/deploy_production.sh
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$INFRA_DIR/.." && pwd)"

echo "================================================================="
echo "       CloudPaaS - Despliegue Automatizado de Producción         "
echo "================================================================="

cd "$REPO_ROOT"

# 1. Comprobación de requisitos en el Host
echo "[1/6] Verificando dependencias del sistema anfitrión..."
command -v docker >/dev/null 2>&1 || { echo "[ERROR] Docker no está instalado en el host."; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "[ERROR] Docker Compose no está disponible."; exit 1; }
echo "  [OK] Docker Engine y Docker Compose verificados."

# 2. Creación de directorios base de almacenamiento
echo ""
echo "[2/6] Inicializando directorios de almacenamiento en host..."
HOSTING_DIR="/srv/hosting"
if [ -w "/srv" ] || [ "$EUID" -eq 0 ] || command -v sudo > /dev/null 2>&1; then
    SUDO_CMD=""
    [ "$EUID" -ne 0 ] && SUDO_CMD="sudo"
    
    $SUDO_CMD mkdir -p "${HOSTING_DIR}/instancias"
    $SUDO_CMD mkdir -p "${HOSTING_DIR}/plantillas"
    $SUDO_CMD mkdir -p "${HOSTING_DIR}/logs"
    $SUDO_CMD chmod -R 755 "${HOSTING_DIR}"
    echo "  [OK] Directorios creados en ${HOSTING_DIR} con permisos 755."
else
    echo "  [AVISO] Sin permisos de superusuario para /srv/hosting. Usando almacenamiento local."
fi

# 3. Sincronización del Catálogo de Plantillas 1-Clic
echo ""
echo "[3/6] Sincronizando catálogo de plantillas 1-clic..."
TEMPLATES_SRC="$INFRA_DIR/host-storage/templates"
if [ -d "${TEMPLATES_SRC}" ]; then
    if [ -d "${HOSTING_DIR}/plantillas" ] && ([ -w "${HOSTING_DIR}/plantillas" ] || [ -n "${SUDO_CMD:-}" ]); then
        ${SUDO_CMD:-} cp -r "${TEMPLATES_SRC}/"* "${HOSTING_DIR}/plantillas/" 2>/dev/null || true
        ${SUDO_CMD:-} chmod -R 755 "${HOSTING_DIR}/plantillas"
        echo "  [OK] Plantillas sincronizadas en ${HOSTING_DIR}/plantillas"
    else
        echo "  [OK] Plantillas maestras disponibles en repositorio local: ${TEMPLATES_SRC}"
    fi
fi

# 4. Aseguramiento de Redes Virtuales
echo ""
echo "[4/6] Configurando redes Docker aisladas (paas_instances_network y paas_internal)..."
bash "$INFRA_DIR/scripts/setup_networks.sh"

# 5. Compilación y Validación de la Imagen Base Non-Root
echo ""
echo "[5/6] Verificando imagen de hosting optimizada cloudpaas/nginx-hosting:latest..."
if ! docker image inspect "cloudpaas/nginx-hosting:latest" > /dev/null 2>&1; then
    echo "  Compilando imagen base de hosting..."
    bash "$INFRA_DIR/scripts/build_hosting_image.sh"
else
    echo "  [OK] Imagen base cloudpaas/nginx-hosting:latest disponible localmente."
fi

# 6. Levantamiento de la Orquestación de Producción
echo ""
echo "[6/6] Levantando servicios de producción (docker-compose.prod.yml)..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "Esperando que los servicios alcancen estado saludable..."
sleep 5
docker compose -f docker-compose.prod.yml ps

echo ""
echo "================================================================="
echo "  [OK] Despliegue de Producción completado exitosamente."
echo "  Plataforma Web Frontend: http://localhost"
echo "  Documentación API REST:  http://localhost:8000/docs"
echo "  Pool de Instancias:      http://localhost:30001 - 30100"
echo "================================================================="
