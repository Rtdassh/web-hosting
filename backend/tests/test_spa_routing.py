"""
Suite Extensa de Pruebas Unitarias para Soporte Nativo de SPAs (Single Page Applications)
Verifica el cumplimiento riguroso de la directiva Nginx:
    location / {
        try_files $uri $uri/ /index.html;
    }
Asegura que rutas de React Router, Vue Router, Angular, etc. (/dashboard, /contacto)
resuelvan a /index.html sin errores 404, protegiendo a la vez la integridad MIME
de assets estáticos y la seguridad del sistema de archivos.
"""
import pytest
from pathlib import Path
import tempfile
import shutil
from unittest.mock import MagicMock, patch

from app.services.spa_routing_service import (
    SpaRoutingService,
    ResolvedRoute,
    STATIC_ASSET_EXTENSIONS,
)


# ==============================================================================
# FIXTURES
# ==============================================================================

@pytest.fixture
def repo_root() -> Path:
    """Ruta raíz del repositorio del proyecto."""
    return Path(__file__).resolve().parents[3]


@pytest.fixture
def sample_spa_app(tmp_path: Path) -> Path:
    """
    Crea una estructura de archivos representativa de una SPA moderna
    (build de Vite / React / Vue con subcarpetas de assets y rutas estáticas).
    """
    app_dir = tmp_path / "spa_site"
    app_dir.mkdir(parents=True, exist_ok=True)

    # 1. index.html principal
    index_file = app_dir / "index.html"
    index_file.write_text(
        "<!DOCTYPE html><html><head><title>Codrop SPA</title></head>"
        "<body><div id='root'></div><script src='/assets/main.js'></script></body></html>",
        encoding="utf-8"
    )

    # 2. Carpeta de activos compilados /assets
    assets_dir = app_dir / "assets"
    assets_dir.mkdir()
    (assets_dir / "main.js").write_text("console.log('Codrop SPA loaded');", encoding="utf-8")
    (assets_dir / "main.css").write_text("body { background: #172838; }", encoding="utf-8")
    (assets_dir / "logo.svg").write_text("<svg><circle r='10'/></svg>", encoding="utf-8")

    # 3. Archivos estáticos en raíz
    (app_dir / "favicon.ico").write_bytes(b"\x00\x00\x01\x00")
    (app_dir / "manifest.json").write_text('{"name": "Codrop PWA"}', encoding="utf-8")

    # 4. Subdirectorio con su propio index (ej: /docs/)
    docs_dir = app_dir / "docs"
    docs_dir.mkdir()
    (docs_dir / "index.html").write_text("<h1>Documentación Estática</h1>", encoding="utf-8")

    return app_dir


# ==============================================================================
# GRUPO 1: AUDITORÍA DE ARCHIVOS DE CONFIGURACIÓN DE NGINX
# ==============================================================================

class TestNginxSpaConfigurationAudit:
    """Verifica que las plantillas Nginx del sistema contengan las directivas exactas."""

    def test_nginx_nonroot_conf_contains_spa_try_files(self, repo_root: Path):
        """Valida que nginx-nonroot.conf implemente try_files $uri $uri/ /index.html."""
        config_file = repo_root / "web-hosting" / "infra" / "docker" / "instance-nginx" / "nginx-nonroot.conf"
        assert config_file.is_file(), f"No existe el archivo de configuración: {config_file}"

        audit = SpaRoutingService.audit_config_file(config_file)
        assert audit["is_valid"] is True
        assert audit["has_try_files"] is True
        assert audit["has_root"] is True
        assert audit["has_index"] is True
        assert audit["has_static_cache"] is True
        assert audit["has_security_tokens"] is True

    def test_nginx_standard_conf_contains_spa_try_files(self, repo_root: Path):
        """Valida que nginx.conf estándar implemente try_files $uri $uri/ /index.html."""
        config_file = repo_root / "web-hosting" / "infra" / "docker" / "instance-nginx" / "nginx.conf"
        assert config_file.is_file(), f"No existe el archivo: {config_file}"

        audit = SpaRoutingService.audit_config_file(config_file)
        assert audit["is_valid"] is True
        assert audit["has_try_files"] is True
        assert audit["has_root"] is True

    def test_frontend_nginx_prod_conf_contains_spa_try_files(self, repo_root: Path):
        """Valida que nginx.prod.conf del frontend de Codrop también soporte SPA routing."""
        config_file = repo_root / "web-hosting" / "frontend" / "nginx.prod.conf"
        assert config_file.is_file(), f"No existe el archivo: {config_file}"

        content = config_file.read_text(encoding="utf-8")
        assert "try_files $uri $uri/ /index.html;" in content
        assert "gzip on;" in content

    def test_gzip_compression_enabled_in_nginx_configs(self, repo_root: Path):
        """Valida que la compresión gzip esté activa para acelerar el envío de bundles SPA."""
        config_file = repo_root / "web-hosting" / "infra" / "docker" / "instance-nginx" / "nginx-nonroot.conf"
        content = config_file.read_text(encoding="utf-8")
        assert "gzip on;" in content
        assert "gzip_types" in content


# ==============================================================================
# GRUPO 2: RESOLUCIÓN DE ARCHIVOS FÍSICOS DIRECTOS ($uri)
# ==============================================================================

class TestSpaDirectFileResolution:
    """Verifica que los archivos existentes en disco se sirvan directamente sin ir a index.html."""

    def test_root_index_html_direct_access(self, sample_spa_app: Path):
        route = SpaRoutingService.resolve_uri(sample_spa_app, "/index.html")
        assert route.status_code == 200
        assert route.route_type == "file"
        assert route.is_spa_fallback is False
        assert "text/html" in route.content_type
        assert route.resolved_path == sample_spa_app / "index.html"

    def test_existing_javascript_bundle(self, sample_spa_app: Path):
        route = SpaRoutingService.resolve_uri(sample_spa_app, "/assets/main.js")
        assert route.status_code == 200
        assert route.route_type == "file"
        assert route.is_spa_fallback is False
        assert route.content_type == "application/javascript"
        assert route.resolved_path == sample_spa_app / "assets" / "main.js"

    def test_existing_css_stylesheet(self, sample_spa_app: Path):
        route = SpaRoutingService.resolve_uri(sample_spa_app, "/assets/main.css")
        assert route.status_code == 200
        assert route.route_type == "file"
        assert route.is_spa_fallback is False
        assert route.content_type == "text/css"
        assert route.resolved_path == sample_spa_app / "assets" / "main.css"

    def test_existing_svg_icon(self, sample_spa_app: Path):
        route = SpaRoutingService.resolve_uri(sample_spa_app, "/assets/logo.svg")
        assert route.status_code == 200
        assert route.content_type == "image/svg+xml"

    def test_existing_manifest_json(self, sample_spa_app: Path):
        route = SpaRoutingService.resolve_uri(sample_spa_app, "/manifest.json")
        assert route.status_code == 200
        assert route.content_type == "application/json"


# ==============================================================================
# GRUPO 3: RESOLUCIÓN DE SUBDIRECTORIOS CON ÍNDICE ($uri/)
# ==============================================================================

class TestSpaSubdirectoryResolution:
    """Verifica que los subdirectorios con su propio index.html se sirvan adecuadamente."""

    def test_subdirectory_with_trailing_slash(self, sample_spa_app: Path):
        route = SpaRoutingService.resolve_uri(sample_spa_app, "/docs/")
        assert route.status_code == 200
        assert route.route_type == "directory_index"
        assert route.is_spa_fallback is False
        assert route.resolved_path == sample_spa_app / "docs" / "index.html"

    def test_subdirectory_without_trailing_slash(self, sample_spa_app: Path):
        route = SpaRoutingService.resolve_uri(sample_spa_app, "/docs")
        assert route.status_code == 200
        assert route.route_type == "directory_index"
        assert route.resolved_path == sample_spa_app / "docs" / "index.html"


# ==============================================================================
# GRUPO 4: RUTAS VIRTUALES DEL CLIENTE (EL CASO CORE DE SPAs)
# ==============================================================================

class TestSpaClientSideRoutesFallback:
    """
    Verifica que al navegar o recargar en rutas virtuales de React Router / Vue Router,
    el servidor responda con /index.html y HTTP 200 en vez de un error 404.
    """

    @pytest.mark.parametrize("route_path", [
        "/dashboard",
        "/contacto",
        "/acerca-de",
        "/planes",
        "/checkout",
        "/login",
        "/registro",
        "/terminos-y-condiciones",
    ])
    def test_single_level_client_routes_resolve_to_index_html(
        self, sample_spa_app: Path, route_path: str
    ):
        """Rutas de un solo nivel deben recibir el fallback /index.html."""
        route = SpaRoutingService.resolve_uri(sample_spa_app, route_path)
        assert route.status_code == 200
        assert route.route_type == "spa_fallback"
        assert route.is_spa_fallback is True
        assert "text/html" in route.content_type
        assert route.resolved_path == sample_spa_app / "index.html"

    @pytest.mark.parametrize("nested_path", [
        "/users/42/profile",
        "/projects/codrop-paas/deployments/v2",
        "/billing/invoices/2026/01/INV-9001",
        "/settings/security/two-factor",
        "/analytics/realtime/traffic/overview",
    ])
    def test_deeply_nested_client_routes_resolve_to_index_html(
        self, sample_spa_app: Path, nested_path: str
    ):
        """Rutas profundamente anidadas deben resolver limpiamente a /index.html."""
        route = SpaRoutingService.resolve_uri(sample_spa_app, nested_path)
        assert route.status_code == 200
        assert route.route_type == "spa_fallback"
        assert route.is_spa_fallback is True
        assert route.resolved_path == sample_spa_app / "index.html"

    def test_client_route_with_query_parameters(self, sample_spa_app: Path):
        """Parámetros de búsqueda en la URL (?q=test&page=2) deben ignorarse al resolver $uri."""
        route = SpaRoutingService.resolve_uri(sample_spa_app, "/dashboard/search?q=codrop&sort=desc")
        assert route.status_code == 200
        assert route.route_type == "spa_fallback"
        assert route.is_spa_fallback is True
        assert route.resolved_path == sample_spa_app / "index.html"

    def test_client_route_with_hash_and_query_string(self, sample_spa_app: Path):
        """Rutas con query y fragmento (#pricing-cards) deben resolver a /index.html."""
        route = SpaRoutingService.resolve_uri(sample_spa_app, "/pricing?coupon=PROMO2026#plans")
        assert route.status_code == 200
        assert route.is_spa_fallback is True

    def test_client_route_with_url_encoded_characters(self, sample_spa_app: Path):
        """Rutas con acentos y caracteres UTF-8 codificados en URL."""
        route = SpaRoutingService.resolve_uri(sample_spa_app, "/art%C3%ADculos/gu%C3%ADa-spa-2026")
        assert route.status_code == 200
        assert route.is_spa_fallback is True
        assert route.resolved_path == sample_spa_app / "index.html"


# ==============================================================================
# GRUPO 5: PROTECCIÓN CONTRA EL ERROR CRÍTICO DE MIME TYPE EN ASSETS
# ==============================================================================

class TestSpaMissingAssetMimeProtection:
    """
    Verifica que los archivos estáticos faltantes (.js, .css, .png, etc.)
    NO se degraden a /index.html, evitando que el navegador arroje:
    'Uncaught SyntaxError: Unexpected token <'
    """

    @pytest.mark.parametrize("missing_asset", [
        "/assets/missing_chunk.js",
        "/static/vendor.bundle.mjs",
        "/css/styles-non-existent.css",
        "/images/banner_not_found.png",
        "/img/icon.svg",
        "/fonts/inter.woff2",
        "/bundle.js.map",
    ])
    def test_missing_static_assets_return_404_not_html(
        self, sample_spa_app: Path, missing_asset: str
    ):
        """Archivos con extensiones de assets deben devolver 404, no el fallback de SPA."""
        route = SpaRoutingService.resolve_uri(sample_spa_app, missing_asset)
        assert route.status_code == 404
        assert route.route_type == "asset_not_found"
        assert route.is_spa_fallback is False
        assert route.resolved_path is None
        assert "no encontrado" in (route.detail or "")


# ==============================================================================
# GRUPO 6: SEGURIDAD, DIRECTORY TRAVERSAL Y FALLAS DE INTEGRIDAD
# ==============================================================================

class TestSpaSecurityAndIntegrity:
    """Verifica el comportamiento ante ataques de escape y directorios sin index.html."""

    def test_directory_traversal_attempts_are_blocked(self, sample_spa_app: Path):
        """Rutas maliciosas con ../ no deben escapar del document root."""
        traversal_routes = [
            "/../../etc/passwd",
            "/..\\..\\windows\\system32\\cmd.exe",
            "/dashboard/../../sensitive_config.env",
        ]
        for malicious_uri in traversal_routes:
            route = SpaRoutingService.resolve_uri(sample_spa_app, malicious_uri)
            assert route.status_code == 400
            assert route.route_type == "error"
            assert "Directory Traversal" in (route.detail or "")

    def test_spa_returns_500_when_root_index_is_missing(self, tmp_path: Path):
        """
        Si un directorio de hosting no tiene index.html, try_files no puede resolver
        y debe reportar un error crítico de configuración en lugar de colgarse.
        """
        empty_dir = tmp_path / "empty_site"
        empty_dir.mkdir()

        route = SpaRoutingService.resolve_uri(empty_dir, "/dashboard")
        assert route.status_code == 500
        assert route.route_type == "error"
        assert "index.html' no existe" in (route.detail or "")

    def test_index_htm_supported_as_fallback_if_html_absent(self, tmp_path: Path):
        """Si un usuario sube index.htm (tres letras), debe operar como fallback válido."""
        site_dir = tmp_path / "htm_site"
        site_dir.mkdir()
        (site_dir / "index.htm").write_text("<h1>Index HTM</h1>", encoding="utf-8")

        route = SpaRoutingService.resolve_uri(site_dir, "/perfil")
        assert route.status_code == 200
        assert route.is_spa_fallback is True
        assert route.resolved_path == site_dir / "index.htm"


# ==============================================================================
# GRUPO 7: INTEGRACIÓN CON ARTIFACT SERVICE Y DOCKER ENGINE
# ==============================================================================

class TestSpaDeploymentIntegration:
    """Verifica que el servicio de despliegue y Docker respeten el contrato de SPA."""

    def test_artifact_service_validates_index_html_existence(self):
        """
        Verifica que ArtifactService.sanitize_and_extract_zip requiera obligatoriamente
        index.html, garantizando que todo despliegue sea 100% SPA-ready.
        """
        from app.services.artifact_service import ArtifactService
        import inspect

        source = inspect.getsource(ArtifactService.sanitize_and_extract_zip)
        assert "index.html" in source
        assert "index.htm" in source

    def test_docker_service_mounts_correct_nginx_spa_document_root(self):
        """
        Verifica que DockerService configure el volumen en modo sólo lectura (:ro)
        hacia /usr/share/nginx/html, coincidiendo con la directiva root de Nginx.
        """
        from app.services.docker_service import DockerService
        import inspect

        source = inspect.getsource(DockerService.run_nginx_instance)
        assert "/usr/share/nginx/html" in source
        assert "'mode': 'ro'" in source or '"mode": "ro"' in source

