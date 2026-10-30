#!/usr/bin/env bash
# ==============================================================================
# Script de Configuración y Aseguramiento de Redes (Rol 1 - DevOps)
# Proyecto: CloudPaaS Web Hosting - Hitos 80% & 100%
# Tarea: T1.2, T1.3 - Redes Aisladas y Subdominios Locales (RF-19, RNF-04, RNF-07)
# ==============================================================================

set -euo pipefail

INSTANCES_NETWORK="${DOCKER_NETWORK:-paas_instances_network}"
INTERNAL_NETWORK="paas_internal"

echo "================================================================="
echo "   🌐 CloudPaaS - Configuración y Aseguramiento de Redes        "
echo "================================================================="

# 1. Verificar conectividad con Docker
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] No se pudo conectar al daemon de Docker (/var/run/docker.sock)."
    exit 1
fi

create_network_if_missing() {
    local net_name="$1"
    local purpose="$2"
    if docker network inspect "$net_name" > /dev/null 2>&1; then
        echo "[INFO] La red '$net_name' ya existe en Docker."
    else
        echo "[INFO] Creando red bridge '$net_name' ($purpose)..."
        docker network create \
            --driver bridge \
            --label managed_by=cloudpaas \
            --label purpose="$purpose" \
            "$net_name"
        echo "[OK] Red '$net_name' creada exitosamente."
    fi
}

# 2. Configurar redes
echo ""
echo "[1/3] Verificando red aislada de instancias..."
create_network_if_missing "$INSTANCES_NETWORK" "hosting_instances_isolation"

echo ""
echo "[2/3] Verificando red interna de plataforma..."
create_network_if_missing "$INTERNAL_NETWORK" "platform_internal_communication"

# 3. Verificación de resolución de subdominios locales *.localhost (RFC 6761)
echo ""
echo "[3/3] Verificando resolución de subdominios locales (*.localhost -> 127.0.0.1)..."
TEST_SUBDOMAIN="tenant-demo.localhost"
if command -v getent > /dev/null 2>&1; then
    RESOLVED_IP=$(getent ahosts "$TEST_SUBDOMAIN" 2>/dev/null | awk '{print $1}' | head -n 1 || true)
    if [ "$RESOLVED_IP" = "127.0.0.1" ] || [ "$RESOLVED_IP" = "::1" ]; then
        echo "  [OK] Subdominios locales *.localhost resuelven nativamente a loopback ($RESOLVED_IP)."
    else
        echo "  [AVISO] Resolución getent devolvió '$RESOLVED_IP'. En navegadores modernos (Chromium, Firefox) *.localhost resuelve automáticamente a 127.0.0.1 conforme a RFC 6761."
    fi
else
    echo "  [INFO] getent no disponible. Conforme a RFC 6761, *.localhost resuelve a loopback en el navegador."
fi

# 4. Resumen
echo ""
echo "[INFO] Topología de red verificada:"
docker network inspect "$INSTANCES_NETWORK" --format '  - Red Instancias: {{.Name}} [Driver: {{.Driver}}, Scope: {{.Scope}}]'
docker network inspect "$INTERNAL_NETWORK" --format '  - Red Interna:    {{.Name}} [Driver: {{.Driver}}, Scope: {{.Scope}}]'
echo ""
echo "[OK] Configuración y aseguramiento de redes completado exitosamente."
