#!/usr/bin/env bash
# Script para iniciar el backend de CloudPaaS en el servidor Debian
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -d "venv" ]; then
    source venv/bin/activate
fi

echo "Iniciando CloudPaaS FastAPI Backend en 0.0.0.0:8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
