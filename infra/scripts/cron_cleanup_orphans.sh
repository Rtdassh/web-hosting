#!/usr/bin/env bash
# ==============================================================================
# Script de Ejecución Programada de Limpieza de Huérfanos (Rol 1 - DevOps)
# Proyecto: CloudPaaS Web Hosting - Hito 50%
# Tarea: T1.4 - Mantenimiento preventivo periódico
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
LOG_DIR="${HOSTING_LOG_DIR:-/srv/hosting/logs}"

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/orphan_cleanup.log"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Iniciando auditoría de huérfanos CloudPaaS..." >> "$LOG_FILE"

# Activar entorno virtual si existe
if [ -d "$BACKEND_DIR/venv" ]; then
    PYTHON_BIN="$BACKEND_DIR/venv/bin/python3"
elif [ -d "$REPO_ROOT/venv" ]; then
    PYTHON_BIN="$REPO_ROOT/venv/bin/python3"
else
    PYTHON_BIN="$(which python3)"
fi

# Ejecutar script con corrección automática y redirección al log
if "$PYTHON_BIN" "$SCRIPT_DIR/cleanup_orphans.py" --fix >> "$LOG_FILE" 2>&1; then
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Auditoría y saneamiento completados con éxito." >> "$LOG_FILE"
else
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [ERROR] La auditoría de huérfanos finalizó con error." >> "$LOG_FILE"
    exit 1
fi
