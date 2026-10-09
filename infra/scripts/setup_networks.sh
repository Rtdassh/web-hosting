#!/usr/bin/env bash
# ==============================================================================
# Script de Configuración y Aseguramiento de Redes (Rol 1 - DevOps)
# Proyecto: CloudPaaS Web Hosting - Hito 50%
# Tarea: T1.3 - Red Aislada de Instancias (RNF-04, RNF-07)
# ==============================================================================

set -euo pipefail

NETWORK_NAME="${DOCKER_NETWORK:-paas_instances_network}"

echo "================================================================="
echo "   CloudPaaS - Inicialización de Red Aislada: $NETWORK_NAME     "
echo "================================================================="

# Verificar conectividad con Docker
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] No se pudo conectar al daemon de Docker (/var/run/docker.sock)."
    exit 1
fi

# Verificar si la red ya existe
if docker network inspect "$NETWORK_NAME" > /dev/null 2>&1; then
    echo "[INFO] La red '$NETWORK_NAME' ya existe en Docker."
else
    echo "[INFO] Creando red bridge aislada '$NETWORK_NAME'..."
    docker network create \
        --driver bridge \
        --label managed_by=cloudpaas \
        --label purpose=hosting_instances_isolation \
        "$NETWORK_NAME"
    echo "[OK] Red '$NETWORK_NAME' creada exitosamente."
fi

# Mostrar información de la red
echo ""
echo "[INFO] Detalles de la red:"
docker network inspect "$NETWORK_NAME" --format '  ID: {{.Id}}
  Driver: {{.Driver}}
  Scope: {{.Scope}}
  Subnet: {{(index .IPAM.Config 0).Subnet}}
  Gateway: {{(index .IPAM.Config 0).Gateway}}
  Contenedores Conectados: {{len .Containers}}'

echo ""
echo "[OK] Configuración de red verificada correctamente."
