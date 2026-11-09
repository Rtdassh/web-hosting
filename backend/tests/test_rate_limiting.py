from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.rate_limit import RateLimitMiddleware


def build_limited_app():
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware)

    @app.post("/api/v1/auth/login")
    def login():
        return {"ok": True}

    @app.post("/api/v1/auth/forgot-password")
    def forgot_password():
        return {"ok": True}

    @app.post("/api/v1/auth/reset-password")
    def reset_password():
        return {"ok": True}

    @app.post("/api/v1/auth/resend-verification")
    def resend_verification():
        return {"ok": True}

    @app.get("/api/v1/auth/verify-email")
    def verify_email():
        return {"ok": True}

    @app.post("/api/v1/instances/42/action")
    def instance_action():
        return {"ok": True}

    @app.post("/api/v1/admin/instances/42/force-action")
    def admin_force_action():
        return {"ok": True}

    @app.post("/api/v1/billing/checkout")
    def checkout():
        return {"ok": True}

    @app.post("/api/v1/subscriptions/change-plan")
    def change_plan():
        return {"ok": True}

    return app


def test_sensitive_auth_endpoints_are_limited_independently_per_operation():
    RateLimitMiddleware.reset_limits()
    try:
        with TestClient(build_limited_app()) as client:
            for path in (
                "/api/v1/auth/login",
                "/api/v1/auth/forgot-password",
                "/api/v1/auth/reset-password",
                "/api/v1/auth/resend-verification",
            ):
                for _ in range(5):
                    response = client.post(path)
                    assert response.status_code == 200
                blocked = client.post(path)
                assert blocked.status_code == 429
                assert blocked.headers["Retry-After"].isdigit()
                assert blocked.headers["X-RateLimit-Limit"] == "5"
                assert blocked.headers["X-Content-Type-Options"] == "nosniff"
                assert "default-src 'self'" in blocked.headers["Content-Security-Policy"]
                assert blocked.headers["Cache-Control"] == "no-store"
                assert blocked.headers["Referrer-Policy"] == "no-referrer"

            for _ in range(5):
                assert client.post("/api/v1/auth/login").status_code == 429
            assert client.get("/api/v1/auth/verify-email").status_code == 200
    finally:
        RateLimitMiddleware.reset_limits()


def test_instance_actions_have_a_separate_30_per_minute_limit():
    RateLimitMiddleware.reset_limits()
    try:
        with TestClient(build_limited_app()) as client:
            for _ in range(30):
                assert client.post("/api/v1/instances/42/action").status_code == 200
            blocked = client.post("/api/v1/instances/42/action")
            assert blocked.status_code == 429
            assert blocked.headers["X-RateLimit-Limit"] == "30"
    finally:
        RateLimitMiddleware.reset_limits()


def test_sensitive_billing_and_admin_actions_have_30_per_minute_limits():
    RateLimitMiddleware.reset_limits()
    try:
        with TestClient(build_limited_app()) as client:
            for path in (
                "/api/v1/admin/instances/42/force-action",
                "/api/v1/billing/checkout",
                "/api/v1/subscriptions/change-plan",
            ):
                for _ in range(30):
                    assert client.post(path).status_code == 200
                blocked = client.post(path)
                assert blocked.status_code == 429
                assert blocked.headers["X-RateLimit-Limit"] == "30"
    finally:
        RateLimitMiddleware.reset_limits()


def test_openapi_documents_verification_contract_and_security_responses():
    from app.main import app

    schema = app.openapi()
    assert schema["info"]["version"] == "1.0.0"
    verify = schema["paths"]["/api/v1/auth/verify-email"]["get"]
    assert verify["summary"] == "Verificar una dirección de correo"
    assert "400" in verify["responses"]
    assert "429" in verify["responses"]
    token_parameter = next(
        parameter
        for parameter in verify["parameters"]
        if parameter["name"] == "token"
    )
    assert token_parameter["in"] == "query"
    resend = schema["paths"]["/api/v1/auth/resend-verification"]["post"]
    assert "429" in resend["responses"]
    assert "503" in resend["responses"]
    assert "429" in schema["paths"]["/api/v1/instances/{instance_id}/action"]["post"]["responses"]
    assert "429" in schema["paths"]["/api/v1/admin/instances/{instance_id}/force-action"]["post"]["responses"]

    with TestClient(app) as client:
        docs = client.get("/docs")
        redoc = client.get("/redoc")
    assert docs.status_code == redoc.status_code == 200
    assert "cdn.jsdelivr.net" in docs.headers["Content-Security-Policy"]
