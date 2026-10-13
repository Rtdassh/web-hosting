"""
Excepciones de dominio para la capa de servicios.
Desacoplan la lógica de negocio del framework HTTP (FastAPI).
Los routers traducen estas excepciones a HTTPException con el código apropiado.
"""


from fastapi import HTTPException, status


class DomainError(HTTPException):
    """Excepción base para errores de dominio."""
    def __init__(self, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR, detail: str = "Error de dominio"):
        super().__init__(status_code=status_code, detail=detail)


class DockerUnavailableError(DomainError):
    """El Docker daemon no está disponible o no respondió (503)."""
    def __init__(self, detail: str = "No hay conexión con Docker."):
        super().__init__(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)


class ContainerNotFoundError(DomainError):
    """El contenedor solicitado no existe en Docker Engine (404)."""
    def __init__(self, detail: str = "Contenedor no encontrado en Docker."):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ContainerMockError(DomainError):
    """Se intentó una operación real sobre un contenedor simulado (404)."""
    def __init__(self, detail: str = "La instancia simulada no tiene un contenedor real."):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class DockerOperationError(DomainError):
    """Error genérico al ejecutar una operación en Docker Engine (503)."""
    def __init__(self, detail: str = "No se pudieron consultar las métricas de Docker."):
        super().__init__(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)
