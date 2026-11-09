"""
Middleware de Rate Limiting y Hardening de Seguridad API (RNF-06 - Hito 100% - Rol 3).
Protege contra ataques de fuerza bruta en endpoints sensibles (ej. /auth/login) y añade cabeceras HTTP seguras.
"""
import time
from collections import defaultdict
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Registro en memoria de peticiones por IP: ip -> [timestamp1, timestamp2, ...]
_request_counts = defaultdict(list)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 5, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    @classmethod
    def reset_limits(cls):
        """Limpia el registro de peticiones (útil para pruebas unitarias)."""
        _request_counts.clear()

    async def dispatch(self, request: Request, call_next):
        # Aplicar Rate Limit estricto únicamente en endpoints de autenticación
        if request.url.path.endswith("/auth/login") and request.method == "POST":
            client_ip = request.client.host if request.client else "unknown"
            now = time.time()

            # Purgar timestamps fuera de la ventana
            _request_counts[client_ip] = [
                ts for ts in _request_counts[client_ip] if now - ts < self.window_seconds
            ]

            if len(_request_counts[client_ip]) >= self.max_requests:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": f"Límite de peticiones excedido. Espere {self.window_seconds} segundos antes de reintentar."
                    },
                    headers={
                        "X-Content-Type-Options": "nosniff",
                        "X-Frame-Options": "DENY",
                        "X-XSS-Protection": "1; mode=block",
                    }
                )

            _request_counts[client_ip].append(now)

        response = await call_next(request)

        # Inyección de Cabeceras HTTP de Seguridad (RNF-06 / Hardening)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        return response
