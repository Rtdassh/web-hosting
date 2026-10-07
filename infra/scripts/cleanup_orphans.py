#!/usr/bin/env python3
"""
Script de Detección y Saneamiento de Contenedores Huérfanos (Rol 1 - DevOps).
Proyecto: CloudPaaS Web Hosting - Hito 50%
Tarea: T1.4 - Reconciliación física entre Docker Engine y PostgreSQL.
"""

import sys
import argparse
from pathlib import Path

# Agregar el directorio backend al sys.path para reutilizar modelos y settings
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

try:
    import docker
    from docker.errors import DockerException
except ImportError:
    print("[ERROR] El paquete 'docker' no está instalado. Ejecuta: pip install docker")
    sys.exit(1)

try:
    from app.core.database import SessionLocal
    from app.models.instance import Instance, InstanceStatus
except Exception as e:
    print(f"[ADVERTENCIA] No se pudo inicializar sesión de base de datos directamente: {e}")
    SessionLocal = None


def inspect_orphans(dry_run: bool = True):
    print("=" * 65)
    print("   CloudPaaS - Auditoría de Contenedores Huérfanos e Inconsistencias")
    print("=" * 65)

    try:
        client = docker.from_env()
        client.ping()
    except DockerException as e:
        print(f"[ERROR] No se pudo conectar al daemon de Docker: {e}")
        return

    # 1. Obtener contenedores Docker etiquetados por CloudPaaS
    docker_containers = client.containers.list(all=True, filters={"label": "managed_by=cloudpaas"})
    docker_map = {c.id: c for c in docker_containers}
    # Mapeo por ID corto también
    docker_short_map = {c.short_id: c for c in docker_containers}

    print(f"[INFO] Contenedores encontrados en Docker con etiqueta 'cloudpaas': {len(docker_containers)}")

    if not SessionLocal:
        print("[INFO] Finalizando en modo diagnóstico sin base de datos.")
        return

    db = SessionLocal()
    try:
        db_instances = db.query(Instance).all()
        db_container_ids = {inst.container_id for inst in db_instances if inst.container_id}

        print(f"[INFO] Instancias registradas en Base de Datos: {len(db_instances)}")
        print("-" * 65)

        # 2. Detectar huérfanos en Docker (existen en Docker pero no en BD)
        orphans_in_docker = []
        for cid, container in docker_map.items():
            if cid not in db_container_ids and container.short_id not in db_container_ids:
                orphans_in_docker.append(container)

        if orphans_in_docker:
            print(f"[ALERTA] Se encontraron {len(orphans_in_docker)} contenedor(es) huérfano(s) en Docker:")
            for orphan in orphans_in_docker:
                print(f"  - ID: {orphan.short_id} | Nombre: {orphan.name} | Estado: {orphan.status}")
                if not dry_run:
                    print(f"    -> Deteniendo y removiendo contenedor {orphan.short_id}...")
                    orphan.remove(force=True)
                    print("    -> Removido.")
        else:
            print("[OK] No hay contenedores huérfanos en Docker.")

        print("-" * 65)

        # 3. Detectar discrepancias en BD (instancia figura RUNNING pero no existe en Docker)
        ghost_instances = []
        for inst in db_instances:
            if inst.status == InstanceStatus.RUNNING:
                if not inst.container_id or (
                    inst.container_id not in docker_map and inst.container_id not in docker_short_map
                ):
                    ghost_instances.append(inst)

        if ghost_instances:
            print(f"[ALERTA] Se encontraron {len(ghost_instances)} instancia(s) fantasma en la BD:")
            for ghost in ghost_instances:
                print(f"  - Instancia ID: {ghost.id} | Nombre: {ghost.name} | ContainerID: {ghost.container_id}")
                if not dry_run:
                    print(f"    -> Marcando instancia {ghost.id} como STOPPED...")
                    ghost.status = InstanceStatus.STOPPED
                    db.commit()
                    print("    -> Estado sincronizado.")
        else:
            print("[OK] Todas las instancias activas en la BD tienen su contenedor correspondiente.")

    finally:
        db.close()

    print("=" * 65)
    print(f"[INFO] Diagnóstico concluido ({'MODO SEGURO / DRY-RUN' if dry_run else 'CAMBIOS APLICADOS'}).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Auditoría de contenedores huérfanos CloudPaaS")
    parser.add_argument("--fix", action="store_true", help="Aplica saneamiento eliminando huérfanos y sincronizando BD")
    args = parser.parse_args()

    inspect_orphans(dry_run=not args.fix)
