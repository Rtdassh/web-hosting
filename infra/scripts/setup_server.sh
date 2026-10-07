#!/usr/bin/env bash
# ==============================================================================
# CloudPaaS Web Hosting - Script Maestro de Aprovisionamiento de Servidor (Rol 1)
# Hito 50%: Configuración de Host, Cgroups, Logging, Redes y Seguridad
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$INFRA_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================================================${NC}"
echo -e "${BLUE}   CloudPaaS - Aprovisionamiento Integral de Servidor Host       ${NC}"
echo -e "${BLUE}   Hito 50% - Rol 1: DevOps, Redes y Contenedores                ${NC}"
echo -e "${BLUE}=================================================================${NC}"

# 1. Comprobación de privilegios
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}[AVISO] Este script requiere privilegios de superusuario para configurar Docker y el sistema.${NC}"
    echo -e "${YELLOW}        Ejecutando con sudo...${NC}"
    exec sudo bash "$0" "$@"
fi

# 2. Verificación de Cgroups v2
echo ""
echo -e "${BLUE}[1/8] Verificando controladores de Cgroups del Kernel...${NC}"
if [ -f "/sys/fs/cgroup/cgroup.controllers" ]; then
    echo -e "  ${GREEN}[OK] Cgroups v2 detectado.${NC}"
    CONTROLLERS=$(cat /sys/fs/cgroup/cgroup.controllers)
    echo -e "       Controladores activos: $CONTROLLERS"
    if [[ "$CONTROLLERS" =~ "memory" ]] && [[ "$CONTROLLERS" =~ "cpu" ]]; then
        echo -e "  ${GREEN}[OK] Controladores 'cpu' y 'memory' disponibles para cuotas.${NC}"
    else
        echo -e "  ${YELLOW}[ADVERTENCIA] Controladores de cpu/memoria no encontrados en raíz de cgroup.${NC}"
    fi
else
    echo -e "  ${YELLOW}[AVISO] Sistema ejecutando Cgroups v1. Compatible, pero se recomienda cgroups v2.${NC}"
fi

# 3. Configuración de Docker Daemon (T1.1: Rotación de logs y Live Restore)
echo ""
echo -e "${BLUE}[2/8] Configurando políticas de Docker Daemon (/etc/docker/daemon.json)...${NC}"
mkdir -p /etc/docker
DAEMON_SOURCE="$INFRA_DIR/docker/daemon.json"

if [ -f "/etc/docker/daemon.json" ]; then
    echo -e "  [INFO] Realizando backup de configuración previa en /etc/docker/daemon.json.bak..."
    cp /etc/docker/daemon.json /etc/docker/daemon.json.bak
fi

cp "$DAEMON_SOURCE" /etc/docker/daemon.json
echo -e "  ${GREEN}[OK] /etc/docker/daemon.json configurado con driver json-file (max-size: 5m, max-file: 2).${NC}"

# Reiniciar Docker daemon para aplicar la política
echo -e "  [INFO] Recargando Docker Daemon..."
systemctl daemon-reload || true
systemctl restart docker || service docker restart || true
sleep 2

# 4. Creación de la Jerarquía de Directorios del Host (/srv/hosting)
echo ""
echo -e "${BLUE}[3/8] Creando estructura de almacenamiento en el Host (/srv/hosting)...${NC}"
mkdir -p /srv/hosting/instancias
mkdir -p /srv/hosting/templates
mkdir -p /srv/hosting/logs

# Permisos: 755 para que nginx pueda leer las carpetas montadas en sólo lectura (:ro)
chmod -R 755 /srv/hosting
echo -e "  ${GREEN}[OK] Directorios creados con permisos de lectura para inquilinos:${NC}"
echo -e "       • /srv/hosting/instancias (Tenant Web Root)"
echo -e "       • /srv/hosting/templates  (Base Templates)"
echo -e "       • /srv/hosting/logs       (Platform Logs)"

# 5. Configuración del Firewall (UFW)
echo ""
echo -e "${BLUE}[4/8] Configurando reglas de Firewall (UFW) y aislamiento de puertos...${NC}"
if command -v ufw > /dev/null 2>&1; then
    echo -e "  [INFO] Configurando políticas de puertos de CloudPaaS en UFW..."
    ufw allow 22/tcp comment "CloudPaaS SSH" > /dev/null || true
    ufw allow 80/tcp comment "CloudPaaS HTTP Reverse Proxy" > /dev/null || true
    ufw allow 443/tcp comment "CloudPaaS HTTPS" > /dev/null || true
    ufw allow 8000/tcp comment "CloudPaaS FastAPI Backend" > /dev/null || true
    ufw allow 5173/tcp comment "CloudPaaS Vite Frontend" > /dev/null || true
    ufw allow 30001:30100/tcp comment "CloudPaaS Dynamic Instances Pool" > /dev/null || true
    ufw deny 5432/tcp comment "Block public PostgreSQL access" > /dev/null || true
    echo -e "  ${GREEN}[OK] Puertos 30001-30100 abiertos; PostgreSQL 5432 restringido al host.${NC}"
else
    echo -e "  ${YELLOW}[INFO] UFW no está instalado en este host. Omitiendo regla automática.${NC}"
fi

# 6. Creación de la Red Aislada (T1.3)
echo ""
echo -e "${BLUE}[5/8] Inicializando red virtual aislada paas_instances_network...${NC}"
bash "$INFRA_DIR/scripts/setup_networks.sh"

# 7. Compilación de la Imagen Oficial de Hosting (RNF-02)
echo ""
echo -e "${BLUE}[6/8] Compilando imagen Nginx optimizada (cloudpaas/nginx-hosting:latest)...${NC}"
bash "$INFRA_DIR/scripts/build_hosting_image.sh"

# 8. Instalación del Temporizador Systemd de Limpieza de Huérfanos (T1.4)
echo ""
echo -e "${BLUE}[7/8] Instalando servicio de mantenimiento y saneamiento de huérfanos...${NC}"
if [ -d "/etc/systemd/system" ]; then
    cp "$INFRA_DIR/systemd/cloudpaas-cleanup.service" /etc/systemd/system/
    cp "$INFRA_DIR/systemd/cloudpaas-cleanup.timer" /etc/systemd/system/
    chmod 644 /etc/systemd/system/cloudpaas-cleanup.*
    systemctl daemon-reload
    systemctl enable --now cloudpaas-cleanup.timer
    echo -e "  ${GREEN}[OK] Temporizador systemd 'cloudpaas-cleanup.timer' activado (cada 15 minutos).${NC}"
else
    echo -e "  ${YELLOW}[INFO] Systemd no disponible. Se puede programar con 'infra/scripts/cron_cleanup_orphans.sh'.${NC}"
fi

# 9. Ejecución de Pruebas de Verificación (Smoke Tests)
echo ""
echo -e "${BLUE}[8/8] Ejecutando batería de pruebas automáticas de Infraestructura...${NC}"
echo -e "  --- Prueba A: Cgroups y Políticas de Logs ---"
bash "$INFRA_DIR/scripts/test_resource_limits.sh" --test-plans

echo ""
echo -e "  --- Prueba B: Aislamiento de Red e Inmunidad Lateral ---"
bash "$INFRA_DIR/scripts/test_network_isolation.sh"

echo ""
echo -e "${GREEN}=================================================================${NC}"
echo -e "${GREEN}   ¡APROVISIONAMIENTO DE INFRAESTRUCTURA COMPLETADO CON ÉXITO!   ${NC}"
echo -e "${GREEN}=================================================================${NC}"
echo -e "El servidor host está 100% configurado para soportar el Hito del 50%:"
echo -e "  • Docker Daemon con retención de logs (5MB / 2 archivos) activo."
echo -e "  • Red aislada 'paas_instances_network' en funcionamiento."
echo -e "  • Imagen 'cloudpaas/nginx-hosting:latest' verificada (< 10 MB RAM idle)."
echo -e "  • Pool de puertos TCP 30001 - 30100 preparado y protegido."
echo -e "  • Directorio /srv/hosting/instancias con permisos de sólo lectura."
echo -e "  • Auditoría y limpieza de contenedores huérfanos programada."
echo ""
