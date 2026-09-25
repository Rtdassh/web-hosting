import logging
from pathlib import Path
from typing import Optional
import docker
from docker.errors import DockerException, NotFound
from app.core.config import settings

logger = logging.getLogger(__name__)

class DockerService:
    def __init__(self):
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        try:
            # Intenta conectarse al Docker Daemon local vía socket
            self.client = docker.from_env()
            self.client.ping()
            logger.info("Conexión con Docker Daemon establecida exitosamente.")
        except DockerException as e:
            logger.warning(f"No se pudo conectar al Docker Daemon: {e}. Modo simulación disponible.")
            self.client = None

    def _resolve_image(self) -> str:
        """Determina la imagen disponible en el host (prefiere la imagen optimizada de Rol 1)."""
        if not self.client:
            return settings.DOCKER_IMAGE_NAME

        try:
            self.client.images.get(settings.DOCKER_IMAGE_NAME)
            return settings.DOCKER_IMAGE_NAME
        except NotFound:
            logger.warning(
                f"Imagen '{settings.DOCKER_IMAGE_NAME}' no encontrada localmente. Usando fallback 'nginx:1.27-alpine'."
            )
            return "nginx:1.27-alpine"
        except Exception:
            return "nginx:1.27-alpine"

    def _resolve_network(self) -> Optional[str]:
        """Comprueba si la red aislada de la plataforma existe."""
        if not self.client:
            return None
        try:
            self.client.networks.get(settings.DOCKER_NETWORK)
            return settings.DOCKER_NETWORK
        except NotFound:
            logger.info(f"Red '{settings.DOCKER_NETWORK}' no encontrada, utilizando red bridge por defecto.")
            return None

    def run_nginx_instance(
        self,
        container_name: str,
        host_port: int,
        host_storage_path: str,
        ram_limit_mb: int = 128,
        cpu_quota: float = 0.25,
        user_id: int = 1,
        instance_uuid: str = ""
    ) -> str:
        """
        Crea e inicia un contenedor Nginx aislado con:
        - Imagen de hosting optimizada (RNF-02)
        - Mapeo de puerto host_port -> 80 interno (RF-18)
        - Montaje en modo solo lectura (:ro) en /usr/share/nginx/html (RNF-04)
        - Límites estrictos de hardware cgroups (RAM y nano_cpus) según el plan
        - Conexión a red aislada paas_instances_network
        """
        if not self.client:
            logger.warning("Docker client no disponible. Simulando ID de contenedor.")
            return f"mock_container_{container_name}"

        abs_storage_path = str(Path(host_storage_path).resolve())
        image_name = self._resolve_image()
        network_name = self._resolve_network()

        # Configuración de límites cgroups duros
        extra_kwargs = {
            "mem_limit": f"{ram_limit_mb}m",
            "memswap_limit": f"{ram_limit_mb}m",
        }
        if cpu_quota and cpu_quota > 0:
            extra_kwargs["nano_cpus"] = int(cpu_quota * 1e9)

        if network_name:
            extra_kwargs["network"] = network_name

        labels = {
            "managed_by": "cloudpaas",
            "user_id": str(user_id),
            "instance_uuid": instance_uuid
        }

        container = self.client.containers.run(
            image=image_name,
            name=container_name,
            detach=True,
            ports={'80/tcp': host_port},
            volumes={
                abs_storage_path: {
                    'bind': '/usr/share/nginx/html',
                    'mode': 'ro'  # Modo solo lectura estricto (RNF-04)
                }
            },
            labels=labels,
            restart_policy={"Name": "on-failure", "MaximumRetryCount": 3},
            **extra_kwargs
        )
        return container.id

    def stop_instance(self, container_id: str) -> bool:
        if not self.client or container_id.startswith("mock_"):
            return True
        try:
            container = self.client.containers.get(container_id)
            container.stop(timeout=5)
            return True
        except NotFound:
            logger.warning(f"Contenedor {container_id} no encontrado para detener (asumido detenido).")
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
        except NotFound:
            logger.warning(f"Contenedor {container_id} no encontrado para reiniciar.")
            return False
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
        except NotFound:
            logger.warning(f"Contenedor {container_id} ya no existe en Docker.")
            return True
        except DockerException as e:
            logger.error(f"Error al remover contenedor {container_id}: {e}")
            return False

docker_service = DockerService()
