import logging
import os
from pathlib import Path
import docker
from docker.errors import DockerException
from app.core.config import settings

logger = logging.getLogger(__name__)

class DockerService:
    def __init__(self):
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        try:
            # Intenta conectarse al Docker Daemon local
            self.client = docker.from_env()
            self.client.ping()
            logger.info("Conexión con Docker Daemon establecida exitosamente.")
        except DockerException as e:
            logger.warning(f"No se pudo conectar al Docker Daemon: {e}. Modo simulación disponible.")
            self.client = None

    def run_nginx_instance(self, container_name: str, host_port: int, host_storage_path: str, ram_limit_mb: int = 128) -> str:
        """
        Crea e inicia un contenedor nginx:alpine con:
        - Mapeo de puerto al 80 interno
        - Montaje en modo solo lectura (:ro) en /usr/share/nginx/html
        - Límite de memoria RAM estricto (cgroups)
        """
        if not self.client:
            # Si Docker no está corriendo (p. ej. pruebas unitarias sin daemon), devuelve un mock id
            logger.warning("Docker client no disponible. Simulando ID de contenedor.")
            return f"mock_container_{container_name}"

        abs_storage_path = str(Path(host_storage_path).resolve())

        # Parámetros de ejecución según RNF-04, RNF-07 y RNF-08
        container = self.client.containers.run(
            image="nginx:1.27-alpine",
            name=container_name,
            detach=True,
            ports={'80/tcp': host_port},
            volumes={
                abs_storage_path: {
                    'bind': '/usr/share/nginx/html',
                    'mode': 'ro'  # Modo solo lectura estricto
                }
            },
            mem_limit=f"{ram_limit_mb}m",
            restart_policy={"Name": "on-failure", "MaximumRetryCount": 3}
        )
        return container.id

    def stop_instance(self, container_id: str) -> bool:
        if not self.client or container_id.startswith("mock_"):
            return True
        try:
            container = self.client.containers.get(container_id)
            container.stop(timeout=5)
            return True
        except DockerException as e:
            logger.error(f"Error al detener contenedor {container_id}: {e}")
            return False

    def restart_instance(self, container_id: str) -> bool:
        if not self.client or container_id.startswith("mock_"):
            return True
        try:
            container = self.client.containers.get(container_id)
            container.restart(timeout=5)
            return True
        except DockerException as e:
            logger.error(f"Error al reiniciar contenedor {container_id}: {e}")
            return False

    def remove_instance(self, container_id: str) -> bool:
        if not self.client or container_id.startswith("mock_"):
            return True
        try:
            container = self.client.containers.get(container_id)
            container.remove(force=True)
            return True
        except DockerException as e:
            logger.error(f"Error al remover contenedor {container_id}: {e}")
            return False

docker_service = DockerService()
