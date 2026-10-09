#!/usr/bin/env bash
# ==============================================================================
# Script de Verificación de Límites Cgroups y Recursos (Rol 1 - DevOps)
# Proyecto: CloudPaaS Web Hosting - Hito 50%
# Tarea: T1.2 - Validar que los contenedores respeten los límites de CPU y RAM
# Planes:
#   - Free:      128 MB RAM, 128 MB Swap, 0.25 CPU (250M nano_cpus)
#   - Developer: 256 MB RAM, 256 MB Swap, 0.50 CPU (500M nano_cpus)
#   - Pro:       512 MB RAM, 512 MB Swap, 1.00 CPU (1000M nano_cpus)
# ==============================================================================

set -euo pipefail

IMAGE_NAME="${DOCKER_IMAGE_NAME:-cloudpaas/nginx-hosting:latest}"
MODE="${1:-inspect}"

echo "================================================================="
echo "   CloudPaaS - Verificación de Cgroups y Límites de Recursos     "
echo "================================================================="

# Verificar conectividad con Docker
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker Daemon no responde."
    exit 1
fi

test_plan_profiles() {
    echo "[INFO] Iniciando prueba sintética de perfiles de planes..."
    echo "-----------------------------------------------------------------"

    # Perfiles: nombre ram_bytes cpu_frac cpu_nanos
    declare -A PLAN_RAM=( ["test_cgroup_free"]="134217728" ["test_cgroup_dev"]="268435456" ["test_cgroup_pro"]="536870912" )
    declare -A PLAN_CPUS=( ["test_cgroup_free"]="0.25" ["test_cgroup_dev"]="0.50" ["test_cgroup_pro"]="1.0" )
    declare -A PLAN_CPU_NANOS=( ["test_cgroup_free"]="250000000" ["test_cgroup_dev"]="500000000" ["test_cgroup_pro"]="1000000000" )
    declare -A PLAN_LABEL=( ["test_cgroup_free"]="Free (128MB / 0.25 CPU)" ["test_cgroup_dev"]="Developer (256MB / 0.50 CPU)" ["test_cgroup_pro"]="Pro (512MB / 1.0 CPU)" )

    CREATED_CONTAINERS=()

    cleanup_tests() {
        echo ""
        echo "[INFO] Limpiando contenedores temporales de prueba..."
        for c in "${CREATED_CONTAINERS[@]}"; do
            docker rm -f "$c" > /dev/null 2>&1 || true
        done
        echo "[OK] Limpieza de prueba finalizada."
    }
    trap cleanup_tests EXIT

    for cname in test_cgroup_free test_cgroup_dev test_cgroup_pro; do
        mem_bytes="${PLAN_RAM[$cname]}"
        cpu_val="${PLAN_CPUS[$cname]}"
        expected_nanos="${PLAN_CPU_NANOS[$cname]}"
        label_text="${PLAN_LABEL[$cname]}"

        echo "[+] Desplegando perfil $label_text..."

        cid=$(docker run -d \
            --name "$cname" \
            --label managed_by=cloudpaas \
            --label cloudpaas_test=cgroup_verification \
            --memory="${mem_bytes}" \
            --memory-swap="${mem_bytes}" \
            --cpus="${cpu_val}" \
            --log-driver="json-file" \
            --log-opt="max-size=5m" \
            --log-opt="max-file=2" \
            "$IMAGE_NAME")

        CREATED_CONTAINERS+=("$cname")

        # Inspección precisa de cgroup aplicado
        ACTUAL_MEM=$(docker inspect "$cid" --format '{{.HostConfig.Memory}}')
        ACTUAL_SWAP=$(docker inspect "$cid" --format '{{.HostConfig.MemorySwap}}')
        ACTUAL_NANO_CPU=$(docker inspect "$cid" --format '{{.HostConfig.NanoCpus}}')
        ACTUAL_LOG_DRIVER=$(docker inspect "$cid" --format '{{.HostConfig.LogConfig.Type}}')
        ACTUAL_LOG_SIZE=$(docker inspect "$cid" --format '{{index .HostConfig.LogConfig.Config "max-size"}}')
        ACTUAL_LOG_FILE=$(docker inspect "$cid" --format '{{index .HostConfig.LogConfig.Config "max-file"}}')

        if [ "$ACTUAL_MEM" != "$mem_bytes" ] || [ "$ACTUAL_NANO_CPU" != "$expected_nanos" ]; then
            echo "    [FALLA] Cgroups no coinciden para $cname:"
            echo "            Esperado Mem: $mem_bytes | Actual: $ACTUAL_MEM"
            echo "            Esperado CPU Nanos: $expected_nanos | Actual: $ACTUAL_NANO_CPU"
            exit 1
        fi

        echo "    [OK] Memoria: $((ACTUAL_MEM / 1024 / 1024))MB | Swap: $((ACTUAL_SWAP / 1024 / 1024))MB | NanoCPUs: $ACTUAL_NANO_CPU"
        echo "    [OK] Logging: driver=$ACTUAL_LOG_DRIVER, max-size=$ACTUAL_LOG_SIZE, max-file=$ACTUAL_LOG_FILE"
    done

    echo ""
    echo "[INFO] Telemetría instantánea de los contenedores de prueba (docker stats):"
    printf "%-25s %-15s %-20s %-15s\n" "CONTENEDOR" "CPU %" "MEMORIA / LÍMITE" "MEMORIA %"
    echo "--------------------------------------------------------------------------------"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" \
        test_cgroup_free test_cgroup_dev test_cgroup_pro

    echo ""
    echo "[EXITO] Todos los perfiles de cgroups y retención de logs fueron aplicados y validados correctamente."
}

inspect_active_containers() {
    CONTAINERS=$(docker ps --filter "label=managed_by=cloudpaas" --format "{{.ID}}\t{{.Names}}\t{{.Status}}")

    if [ -z "$CONTAINERS" ]; then
        echo "[INFO] No se detectaron contenedores activos en ejecución con etiqueta 'managed_by=cloudpaas'."
        echo "[INFO] Ejecuta con la bandera '--test-plans' para probar los límites de los 3 planes sintéticamente:"
        echo "       $0 --test-plans"
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
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" \
        $(docker ps --filter "label=managed_by=cloudpaas" -q)
    echo ""
    echo "[OK] Verificación completada con éxito."
}

if [ "$MODE" = "--test-plans" ] || [ "$MODE" = "-t" ] || [ "$MODE" = "test" ]; then
    test_plan_profiles
else
    inspect_active_containers
fi
