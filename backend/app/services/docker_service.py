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

        # Política de retención de logs para proteger el almacenamiento del host (T1.1, RF-21)
        extra_kwargs["log_config"] = {
            "type": "json-file",
            "config": {
                "max-size": "5m",
                "max-file": "2"
            }
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

    def start_instance(self, container_id: str) -> bool:
        """Inicia un contenedor existente detenido (RF-16)."""
        if not self.client or container_id.startswith("mock_"):
            return True
        try:
            container = self.client.containers.get(container_id)
            container.start()
            return True
        except NotFound:
            logger.warning(f"Contenedor {container_id} no encontrado para iniciar.")
            return False
        except DockerException as e:
            logger.error(f"Error al iniciar contenedor {container_id}: {e}")
            return False

    def stop_instance(self, container_id: str) -> bool:
        """Detiene un contenedor en ejecución (RF-16)."""
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
        """Reinicia un contenedor activo (RF-16)."""
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
        """Elimina definitivamente un contenedor Docker (RF-17)."""
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

    def get_container_status(self, container_id: Optional[str]) -> str:
        """Comprueba el estado real de un contenedor en Docker Engine (T3.3, T4.3)."""
        if not container_id:
            return "not_found"
        if not self.client or container_id.startswith("mock_"):
            return "running"
        try:
            container = self.client.containers.get(container_id)
            container.reload()
            return container.status.lower()  # running, exited, paused, etc.
        except NotFound:
            return "not_found"
        except DockerException as e:
            logger.warning(f"Error consultando estado de {container_id}: {e}")
            return "error"

    def get_container_stats(self, container_id: Optional[str], ram_limit_mb: float = 128.0) -> dict:
        """
        Calcula las métricas de CPU y Memoria en tiempo real (T4.1, RF-20).
        Fórmulas precisas:
        - CPU%: (cpu_delta / system_cpu_delta) * number_cpus * 100.0
        - RAM MB: (usage - cache) / (1024 * 1024)
        """
        default_stats = {
            "cpu_percent": 0.0,
            "memory_usage_mb": 0.0,
            "memory_limit_mb": float(ram_limit_mb),
            "memory_percent": 0.0,
            "status": "stopped"
        }

        if not container_id:
            return default_stats

        if not self.client or container_id.startswith("mock_"):
            return {
                "cpu_percent": 0.5,
                "memory_usage_mb": 6.8,
                "memory_limit_mb": float(ram_limit_mb),
                "memory_percent": round((6.8 / ram_limit_mb) * 100.0, 2) if ram_limit_mb > 0 else 0.0,
                "status": "running"
            }

        try:
            container = self.client.containers.get(container_id)
            container.reload()
            current_status = container.status.lower()

            if current_status != "running":
                default_stats["status"] = current_status
                return default_stats

            stats = container.stats(stream=False)

            # Cálculo preciso de CPU %
            cpu_stats = stats.get("cpu_stats", {})
            precpu_stats = stats.get("precpu_stats", {})
            cpu_usage_total = cpu_stats.get("cpu_usage", {}).get("total_usage", 0)
            precpu_usage_total = precpu_stats.get("cpu_usage", {}).get("total_usage", 0)
            cpu_delta = cpu_usage_total - precpu_usage_total

            system_cpu_usage = cpu_stats.get("system_cpu_usage", 0)
            pre_system_cpu_usage = precpu_stats.get("system_cpu_usage", 0)
            system_cpu_delta = system_cpu_usage - pre_system_cpu_usage

            online_cpus = cpu_stats.get("online_cpus")
            if not online_cpus:
                percpu_usage = cpu_stats.get("cpu_usage", {}).get("percpu_usage")
                online_cpus = len(percpu_usage) if percpu_usage else 1

            if system_cpu_delta > 0 and cpu_delta > 0:
                cpu_percent = round((cpu_delta / system_cpu_delta) * online_cpus * 100.0, 2)
            else:
                cpu_percent = 0.0

            # Cálculo preciso de memoria
            mem_stats = stats.get("memory_stats", {})
            raw_mem_usage = mem_stats.get("usage", 0)
            mem_details = mem_stats.get("stats", {})
            cache = mem_details.get("inactive_file", mem_details.get("cache", 0))
            active_usage = max(0, raw_mem_usage - cache) if raw_mem_usage > cache else raw_mem_usage
            memory_usage_mb = round(active_usage / (1024 * 1024), 2)

            resolved_limit_mb = float(ram_limit_mb)
            if "limit" in mem_stats and mem_stats["limit"] > 0:
                reported_limit_mb = round(mem_stats["limit"] / (1024 * 1024), 2)
                if reported_limit_mb < 200000:  # Descarta valores ilimitados de cgroup v1/v2 del host (> 200GB)
                    resolved_limit_mb = reported_limit_mb

            memory_percent = round((memory_usage_mb / resolved_limit_mb) * 100.0, 2) if resolved_limit_mb > 0 else 0.0

            return {
                "cpu_percent": cpu_percent,
                "memory_usage_mb": memory_usage_mb,
                "memory_limit_mb": resolved_limit_mb,
                "memory_percent": memory_percent,
                "status": "running"
            }
        except NotFound:
            return default_stats
        except Exception as e:
            logger.error(f"Error extrayendo telemetría de {container_id}: {e}")
            return default_stats

    def get_container_logs(self, container_id: Optional[str], tail: int = 100) -> list[str]:
        """
        Extrae las últimas líneas de logs de Nginx desde stdout/stderr (T4.2, RF-21).
        Decodifica UTF-8 de forma segura.
        """
        if not container_id:
            return []

        if not self.client or container_id.startswith("mock_"):
            return [
                "2026-10-04T00:00:01Z [notice] 1#1: using the \"epoll\" event method",
                "2026-10-04T00:00:01Z [notice] 1#1: nginx/1.27.0",
                "2026-10-04T00:00:01Z [notice] 1#1: start worker processes",
                "2026-10-04T00:00:02Z 127.0.0.1 - [04/Oct/2026:00:00:02 +0000] \"GET / HTTP/1.1\" 200 450 \"-\" \"CloudPaaS-Probe/1.0\""
            ]

        try:
            container = self.client.containers.get(container_id)
            raw_bytes = container.logs(tail=tail, timestamps=True, stdout=True, stderr=True)
            decoded_text = raw_bytes.decode("utf-8", errors="replace")
            lines = [line for line in decoded_text.splitlines() if line.strip()]
            return lines
        except NotFound:
            return ["[advertencia] El contenedor no se encuentra en el motor Docker."]
        except Exception as e:
            logger.error(f"Error obteniendo logs de {container_id}: {e}")
            return [f"[error] No se pudieron obtener los logs: {str(e)}"]

docker_service = DockerService()

