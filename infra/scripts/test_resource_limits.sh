#!/usr/bin/env bash
# ==============================================================================
# Script de Verificación de Límites Cgroups y Recursos (Rol 1 - DevOps)
# Proyecto: CloudPaaS Web Hosting - Hito 50%
# Tarea: T1.2 - Validar que los contenedores respeten los límites de CPU y RAM
# ==============================================================================

set -euo pipefail

echo "================================================================="
echo "   CloudPaaS - Verificación de Cgroups y Límites de Recursos     "
echo "================================================================="

CONTAINERS=$(docker ps --filter "label=managed_by=cloudpaas" --format "{{.ID}}\t{{.Names}}\t{{.Status}}")

if [ -z "$CONTAINERS" ]; then
    echo "[INFO] No se detectaron contenedores activos gestionados por CloudPaaS."
    echo "[INFO] Puedes desplegar una instancia desde la interfaz o ejecutar:"
    echo "       docker run -d --name test_instance --label managed_by=cloudpaas --memory=128m --cpus=0.25 nginx:alpine"
    exit 0
fi

echo "[INFO] Contenedores encontrados:"
printf "%-16s %-30s %-20s\n" "CONTAINER ID" "NOMBRE" "ESTADO"
echo "-----------------------------------------------------------------"
echo "$CONTAINERS" | while IFS=$'\t' read -r cid cname cstatus; do
    printf "%-16s %-30s %-20s\n" "$cid" "$cname" "$cstatus"
done

echo ""
echo "[INFO] Leyendo estadísticas en tiempo real (docker stats)..."
echo "-----------------------------------------------------------------"
printf "%-25s %-15s %-20s %-15s\n" "NOMBRE" "CPU %" "MEMORIA / LÍMITE" "MEMORIA %"
echo "-----------------------------------------------------------------"

docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" \
    $(docker ps --filter "label=managed_by=cloudpaas" -q)

echo ""
echo "[INFO] Verificación completada con éxito."
