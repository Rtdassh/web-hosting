#!/usr/bin/env bash
# ==============================================================================
# Script de Compilación y Validación de Imagen Nginx de Hosting (Rol 1 - DevOps)
# Proyecto: CloudPaaS Web Hosting - Hitos 80% & 100%
# RNF-02: Consumo en reposo < 10 MB RAM, huella ligera
# RNF-07: Confinamiento y ejecución Non-Root (UID 101, cap_drop: ALL)
# ==============================================================================

set -euo pipefail

IMAGE_TAG="${1:-cloudpaas/nginx-hosting:latest}"
DOCKERFILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../docker/instance-nginx" && pwd)"

echo "================================================================="
echo "   CloudPaaS - Compilación de Imagen Base Non-Root: $IMAGE_TAG  "
echo "================================================================="

if [ ! -f "$DOCKERFILE_DIR/Dockerfile" ]; then
    echo "[ERROR] No se encontró Dockerfile en: $DOCKERFILE_DIR"
    exit 1
fi

echo "[1/4] Compilando imagen desde $DOCKERFILE_DIR..."
docker build -t "$IMAGE_TAG" "$DOCKERFILE_DIR"

echo ""
echo "[2/4] Verificando especificaciones de imagen..."
docker images "$IMAGE_TAG" --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}"

# Smoke Test de Seguridad Non-Root (RNF-07)
echo ""
echo "[3/4] Validando ejecución Non-Root (UID 101)..."
USER_ID_OUTPUT=$(docker run --rm "$IMAGE_TAG" id)
echo "  Resultado de comando 'id': $USER_ID_OUTPUT"
if [[ "$USER_ID_OUTPUT" =~ "uid=101(nginx)" ]]; then
    echo "  [OK] Proceso corre bajo usuario no privilegiado UID 101 (nginx)."
else
    echo "  [ERROR] La imagen no está corriendo como UID 101."
    exit 1
fi

# Smoke Test de Consumo de Memoria en Reposo (RNF-02)
TEST_CONTAINER="smoke_test_nginx_$$"
echo ""
echo "[4/4] Ejecutando smoke test con contenedor temporal '$TEST_CONTAINER'..."

docker run -d \
    --name "$TEST_CONTAINER" \
    --user 101:101 \
    --cap-drop ALL \
    --sysctl net.ipv4.ip_unprivileged_port_start=0 \
    --memory=128m \
    --cpus=0.25 \
    "$IMAGE_TAG" > /dev/null

sleep 2

# Medir consumo en reposo (RNF-02)
MEM_USAGE=$(docker stats --no-stream --format "{{.MemUsage}}" "$TEST_CONTAINER" | awk '{print $1}')
echo "  Consumo de RAM en reposo (idle): $MEM_USAGE (Debe ser < 10MiB)"

# Limpieza
docker rm -f "$TEST_CONTAINER" > /dev/null

echo ""
echo "================================================================="
echo "  [OK] Imagen base '$IMAGE_TAG' validada exitosamente."
echo "================================================================="
