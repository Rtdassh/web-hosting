"""In-process rate limits and security headers for sensitive API operations."""
import math
import re
import time
from collections import OrderedDict, deque
from threading import RLock

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

_REQUEST_COUNTS: OrderedDict[tuple[str, str], deque[float]] = OrderedDict()
_REQUEST_COUNTS_LOCK = RLock()
_MAX_TRACKED_KEYS = 10_000
_PRUNE_EVERY = 128
_requests_since_prune = 0

_RATE_LIMITS = (
    ("POST", re.compile(r"/instances/\d+/versions(?:/[a-f0-9]+/restore)?$"), "instance-publish", 10, 60),
    ("POST", re.compile(r"/auth/login$"), "login", 5, 60),
    ("POST", re.compile(r"/auth/register$"), "register", 5, 60),
    ("POST", re.compile(r"/auth/forgot-password$"), "forgot-password", 5, 60),
    ("POST", re.compile(r"/auth/reset-password$"), "reset-password", 5, 60),
    ("POST", re.compile(r"/auth/resend-verification$"), "resend-verification", 5, 60),
    ("GET", re.compile(r"/auth/verify-email$"), "verify-email", 10, 60),
    ("POST", re.compile(r"/instances/deploy$"), "instance-deploy", 30, 60),
    ("POST", re.compile(r"/instances/deploy-template$"), "instance-deploy-template", 30, 60),
    ("POST", re.compile(r"/instances/\d+/action$"), "instance-action", 30, 60),
    ("POST", re.compile(r"/instances/\d+/sync$"), "instance-sync", 30, 60),
    ("DELETE", re.compile(r"/instances/\d+$"), "instance-delete", 30, 60),
    ("POST", re.compile(r"/admin/instances/\d+/force-action$"), "admin-force-action", 30, 60),
    ("POST", re.compile(r"/billing/checkout$"), "billing-checkout", 30, 60),
    ("POST", re.compile(r"/subscriptions/change-plan$"), "subscription-change", 30, 60),
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)

    @classmethod
    def reset_limits(cls):
        """Clear counters for isolated tests."""
        global _requests_since_prune
        with _REQUEST_COUNTS_LOCK:
            _REQUEST_COUNTS.clear()
            _requests_since_prune = 0

    @staticmethod
    def _rule_for(request: Request) -> tuple[str, int, int] | None:
        path = request.url.path
        for method, pattern, key, limit, window in _RATE_LIMITS:
            if request.method == method and pattern.search(path):
                return key, limit, window
        return None

    @staticmethod
    def _security_headers(path: str) -> dict[str, str]:
        headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "no-referrer",
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
        }
        if path in {"/docs", "/redoc"}:
            headers["Content-Security-Policy"] = (
                "default-src 'self' https://cdn.jsdelivr.net; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data:; connect-src 'self'; "
                "base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
            )
        else:
            headers["Content-Security-Policy"] = (
                "default-src 'self'; base-uri 'self'; form-action 'self'; "
                "frame-ancestors 'none'; object-src 'none'"
            )
        return headers

    @staticmethod
    def _consume(
        key: tuple[str, str],
        limit: int,
        window_seconds: int,
        now: float,
    ) -> tuple[bool, int, int]:
        global _requests_since_prune
        with _REQUEST_COUNTS_LOCK:
            _requests_since_prune += 1
            timestamps = _REQUEST_COUNTS.get(key)
            if timestamps is None:
                timestamps = deque()
                _REQUEST_COUNTS[key] = timestamps
            else:
                _REQUEST_COUNTS.move_to_end(key)

            cutoff = now - window_seconds
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()

            if _requests_since_prune >= _PRUNE_EVERY:
                for tracked_key, tracked_times in list(_REQUEST_COUNTS.items()):
                    tracked_window = next(
                        (
                            configured_window
                            for _, _, rule_key, _, configured_window in _RATE_LIMITS
                            if rule_key == tracked_key[1]
                        ),
                        window_seconds,
                    )
                    while tracked_times and tracked_times[0] <= now - tracked_window:
                        tracked_times.popleft()
                    if not tracked_times:
                        _REQUEST_COUNTS.pop(tracked_key, None)
                _requests_since_prune = 0

            _REQUEST_COUNTS[key] = timestamps
            _REQUEST_COUNTS.move_to_end(key)
            if len(timestamps) >= limit:
                retry_after = max(1, math.ceil(timestamps[0] + window_seconds - now))
                return False, 0, retry_after

            timestamps.append(now)
            while len(_REQUEST_COUNTS) > _MAX_TRACKED_KEYS:
                _REQUEST_COUNTS.popitem(last=False)
            return True, limit - len(timestamps), 0

    async def dispatch(self, request: Request, call_next):
        rule = self._rule_for(request)
        if rule is not None:
            endpoint, limit, window_seconds = rule
            client_ip = request.client.host if request.client else "unknown"
            allowed, remaining, retry_after = self._consume(
                (client_ip, endpoint),
                limit,
                window_seconds,
                time.monotonic(),
            )
            rate_headers = {
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": str(remaining),
            }
            if not allowed:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": (
                            f"Límite de peticiones excedido. Espere {retry_after} "
                            "segundos antes de reintentar."
                        )
                    },
                    headers={
                        **self._security_headers(request.url.path),
                        **rate_headers,
                        "Retry-After": str(retry_after),
                    },
                )
        else:
            rate_headers = {}

        response = await call_next(request)
        response.headers.update(self._security_headers(request.url.path))
        response.headers.update(rate_headers)
        return response
