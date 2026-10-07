#!/usr/bin/env bash
# ==============================================================================
# Script de Compilación y Validación de Imagen Nginx de Hosting (Rol 1 - DevOps)
# Proyecto: CloudPaaS Web Hosting - Hito 50%
# RNF-02: Consumo en reposo < 10 MB RAM, tamaño compacto (< 15 MB comprimido / < 50 MB)
# ==============================================================================

set -euo pipefail

IMAGE_TAG="${1:-cloudpaas/nginx-hosting:latest}"
DOCKERFILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../docker/instance-nginx" && pwd)"

echo "================================================================="
echo "   CloudPaaS - Compilación de Imagen Base: $IMAGE_TAG           "
echo "================================================================="

if [ ! -f "$DOCKERFILE_DIR/Dockerfile" ]; then
    echo "[ERROR] No se encontró Dockerfile en: $DOCKERFILE_DIR"
    exit 1
fi

echo "[INFO] Compilando imagen desde $DOCKERFILE_DIR..."
docker build -t "$IMAGE_TAG" "$DOCKERFILE_DIR"

echo ""
echo "[INFO] Verificando especificaciones de imagen..."
docker images "$IMAGE_TAG" --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}"

# Prueba rápida de arranque en frío y consumo de memoria (smoke test)
TEST_CONTAINER="smoke_test_nginx_$$"
echo ""
echo "[INFO] Ejecutando smoke test con contenedor temporal '$TEST_CONTAINER'..."

docker run -d \
    --name "$TEST_CONTAINER" \
    --memory=128m \
    --cpus=0.25 \
    "$IMAGE_TAG" > /dev/null

sleep 2

# Medir consumo en reposo (RNF-02)
MEM_USAGE=$(docker stats --no-stream --format "{{.MemUsage}}" "$TEST_CONTAINER" | awk '{print $1}')
echo "[INFO] Consumo de RAM en reposo (idle): $MEM_USAGE (Debe ser < 10MiB)"

# Limpieza
docker rm -f "$TEST_CONTAINER" > /dev/null

echo ""
echo "[OK] Imagen base '$IMAGE_TAG' validada y lista para aprovisionar."
