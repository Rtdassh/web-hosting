#!/usr/bin/env bash
# ==============================================================================
# Script de Verificación de Aislamiento de Red (Rol 1 - DevOps)
# Proyecto: CloudPaaS Web Hosting - Hito 50%
# Tarea: T1.3 - Verificar Aislamiento de Red e Inmunidad Lateral (RNF-04, RNF-07)
# ==============================================================================

set -euo pipefail

INSTANCES_NET="${DOCKER_NETWORK:-paas_instances_network}"
INTERNAL_NET="paas_dev_network"
PROBE_CONTAINER="probe_isolation_$$"
TARGET_MOCK="mock_internal_db_$$"
TEST_PORT="30099"

echo "================================================================="
echo "   CloudPaaS - Verificación de Aislamiento de Red (RNF-04)       "
echo "================================================================="

# 1. Asegurar redes
if ! docker network inspect "$INSTANCES_NET" > /dev/null 2>&1; then
    echo "[INFO] Red '$INSTANCES_NET' no existe. Creándola..."
    docker network create --driver bridge "$INSTANCES_NET" > /dev/null
fi

if ! docker network inspect "$INTERNAL_NET" > /dev/null 2>&1; then
    echo "[INFO] Red interna '$INTERNAL_NET' no existe. Creándola temporalmente..."
    docker network create --driver bridge "$INTERNAL_NET" > /dev/null
    REMOVE_INTERNAL_NET=true
else
    REMOVE_INTERNAL_NET=false
fi

cleanup() {
    echo ""
    echo "[INFO] Limpiando contenedores temporales de prueba..."
    docker rm -f "$PROBE_CONTAINER" "$TARGET_MOCK" > /dev/null 2>&1 || true
    if [ "$REMOVE_INTERNAL_NET" = true ]; then
        docker network rm "$INTERNAL_NET" > /dev/null 2>&1 || true
    fi
    echo "[OK] Limpieza finalizada."
}
trap cleanup EXIT

# 2. Levantar servicio simulado dentro de la red interna (representa PostgreSQL en puerto 5432)
echo "[+] Levantando servicio interno simulado en red '$INTERNAL_NET'..."
docker run -d \
    --name "$TARGET_MOCK" \
    --network "$INTERNAL_NET" \
    --label managed_by=cloudpaas_test \
    nginx:1.27-alpine > /dev/null

TARGET_IP=$(docker inspect "$TARGET_MOCK" --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}")
echo "    -> IP del servicio interno simulado: $TARGET_IP (red: $INTERNAL_NET)"

# 3. Levantar contenedor de cliente (sonda) estrictamente confinado en paas_instances_network
echo "[+] Desplegando contenedor sonda de inquilino en '$INSTANCES_NET'..."
docker run -d \
    --name "$PROBE_CONTAINER" \
    --network "$INSTANCES_NET" \
    -p "$TEST_PORT:80" \
    --label managed_by=cloudpaas \
    --label cloudpaas_test=isolation_probe \
    cloudpaas/nginx-hosting:latest > /dev/null

PROBE_IP=$(docker inspect "$PROBE_CONTAINER" --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}")
echo "    -> IP de la instancia cliente: $PROBE_IP (red: $INSTANCES_NET)"

echo ""
echo "[INFO] Evaluando políticas de aislamiento (RNF-04 / RNF-07)..."
echo "-----------------------------------------------------------------"

# 4. Prueba 1: Movimiento lateral hacia IP interna
echo -n "[Prueba 1] Intento de conexión del cliente hacia el servicio interno ($TARGET_IP)... "
ISOLATION_BREACH=0
if docker exec "$PROBE_CONTAINER" nc -z -w 2 "$TARGET_IP" 80 > /dev/null 2>&1; then
    ISOLATION_BREACH=1
    echo "[FALLA GRAVE] ¡El contenedor del cliente pudo comunicarse con la red interna!"
else
    echo "[AISLADO - CORRECTO]"
    echo "           El tráfico entre '$INSTANCES_NET' y '$INTERNAL_NET' está confinado."
fi

# 5. Prueba 2: Resolución por nombre de host interno
echo -n "[Prueba 2] Intento de resolución DNS del contenedor interno ('$TARGET_MOCK')... "
if docker exec "$PROBE_CONTAINER" ping -c 1 -W 2 "$TARGET_MOCK" > /dev/null 2>&1; then
    ISOLATION_BREACH=1
    echo "[FALLA GRAVE] ¡El contenedor pudo resolver y alcanzar '$TARGET_MOCK' por nombre!"
else
    echo "[BLOQUEADO - CORRECTO]"
    echo "           El daemon de Docker no comparte nombres de red entre redes disjuntas."
fi

# 6. Prueba 3: Conectividad hacia el puerto mapeado en el Host
echo -n "[Prueba 3] Acceso web del usuario desde el Host hacia http://localhost:$TEST_PORT... "
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$TEST_PORT" || echo "failed")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "[OPERATIVO (HTTP $HTTP_STATUS)]"
else
    echo "[FALLA (HTTP $HTTP_STATUS)]"
    ISOLATION_BREACH=1
fi

echo ""
if [ "$ISOLATION_BREACH" -eq 0 ]; then
    echo "[EXITO] Aislamiento de red verificado: Contenedores de hosting completamente segregados de la infraestructura interna."
    exit 0
else
    echo "[ERROR CRITICO] Falló la verificación de aislamiento de red."
    exit 1
fi
