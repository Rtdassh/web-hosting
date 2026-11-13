"""
Servicio de Enrutamiento y Validación de Soporte Nativo para SPAs (Rol 3 / Rol 4).
Modela e inspecciona el comportamiento de la directiva Nginx:
    location / {
        try_files $uri $uri/ /index.html;
    }
Permite garantizar que aplicaciones basadas en React Router, Vue Router, Angular, etc.
no sufran errores 404 al recargar rutas internas (/dashboard, /contacto, /settings),
evitando a la vez la corrupción de tipos MIME en assets estáticos faltantes.
"""
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
import re
import urllib.parse


# Extensiones estáticas que NO deben degradarse al fallback HTML para evitar
# el error común: "Uncaught SyntaxError: Unexpected token '<'"
STATIC_ASSET_EXTENSIONS = {
    ".js", ".mjs", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg",
    ".ico", ".webp", ".woff", ".woff2", ".ttf", ".eot", ".json",
    ".map", ".wasm", ".xml", ".txt"
}


@dataclass
class ResolvedRoute:
    status_code: int
    route_type: str  # 'file', 'directory_index', 'spa_fallback', 'asset_not_found', 'error'
    resolved_path: Optional[Path]
    content_type: str
    is_spa_fallback: bool = False
    detail: Optional[str] = None


class SpaRoutingService:
    """
    Servicio de resolución y auditoría de rutas SPA conforme a la especificación Nginx.
    """

    MIME_TYPES = {
        ".html": "text/html; charset=utf-8",
        ".htm": "text/html; charset=utf-8",
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".txt": "text/plain",
    }

    @classmethod
    def get_mime_type(cls, file_path: Path) -> str:
        ext = file_path.suffix.lower()
        return cls.MIME_TYPES.get(ext, "application/octet-stream")

    @classmethod
    def resolve_uri(cls, document_root: Path, raw_uri: str) -> ResolvedRoute:
        """
        Simula el algoritmo de resolución de Nginx para la directiva:
            try_files $uri $uri/ /index.html;

        1. $uri: Archivo exacto en disco.
        2. $uri/: Directorio con index.html / index.htm.
        3. /index.html: Fallback SPA para rutas cliente (ej. /dashboard, /perfil).
        4. Excepción de seguridad: Assets con extensión estática (.js, .css, etc.)
           no encontrados devuelven 404 para no servir HTML por error.
        """
        doc_root = document_root.resolve()

        # Normalizar y extraer solo la ruta sin query string ni fragmentos ($uri de Nginx)
        parsed = urllib.parse.urlparse(raw_uri)
        decoded_path = urllib.parse.unquote(parsed.path)

        # Prevenir directory traversal
        clean_rel_path = decoded_path.lstrip("/\\")
        target_path = (doc_root / clean_rel_path).resolve()

        if not target_path.is_relative_to(doc_root):
            return ResolvedRoute(
                status_code=400,
                route_type="error",
                resolved_path=None,
                content_type="text/plain",
                detail="Directory Traversal detectado."
            )

        # Caso 1: Archivo estático existente ($uri)
        if target_path.is_file():
            return ResolvedRoute(
                status_code=200,
                route_type="file",
                resolved_path=target_path,
                content_type=cls.get_mime_type(target_path),
                is_spa_fallback=False
            )

        # Caso 2: Directorio físico existente con index ($uri/)
        if target_path.is_dir():
            for idx in ["index.html", "index.htm"]:
                idx_path = target_path / idx
                if idx_path.is_file():
                    return ResolvedRoute(
                        status_code=200,
                        route_type="directory_index",
                        resolved_path=idx_path,
                        content_type="text/html; charset=utf-8",
                        is_spa_fallback=False
                    )

        # Caso 3: Es un recurso estático (extensión de asset) pero NO existe
        suffix = target_path.suffix.lower()
        if suffix in STATIC_ASSET_EXTENSIONS:
            return ResolvedRoute(
                status_code=404,
                route_type="asset_not_found",
                resolved_path=None,
                content_type="text/plain",
                detail=f"Asset estático '{decoded_path}' no encontrado en el servidor."
            )

        # Caso 4: Ruta virtual SPA (ej. /dashboard, /contacto, /settings/billing)
        # Nginx aplica el fallback /index.html
        root_index = doc_root / "index.html"
        if root_index.is_file():
            return ResolvedRoute(
                status_code=200,
                route_type="spa_fallback",
                resolved_path=root_index,
                content_type="text/html; charset=utf-8",
                is_spa_fallback=True
            )

        root_htm = doc_root / "index.htm"
        if root_htm.is_file():
            return ResolvedRoute(
                status_code=200,
                route_type="spa_fallback",
                resolved_path=root_htm,
                content_type="text/html; charset=utf-8",
                is_spa_fallback=True
            )

        # Si no existe index.html en la raíz, Nginx arrojaría 500 al no poder cumplir try_files
        return ResolvedRoute(
            status_code=500,
            route_type="error",
            resolved_path=None,
            content_type="text/plain",
            detail="Fallo crítico de SPA: el archivo raíz 'index.html' no existe en el almacenamiento."
        )

    @classmethod
    def validate_nginx_config_content(cls, config_content: str) -> Dict[str, Any]:
        """
        Inspecciona el contenido de un archivo de configuración de Nginx
        y valida que cumpla con los estándares de soporte SPA y seguridad de Codrop.
        """
        has_try_files = bool(
            re.search(
                r"try_files\s+\$uri\s+\$uri/\s+/index\.html\s*;",
                config_content
            )
        )
        has_root = bool(
            re.search(r"root\s+/usr/share/nginx/html\s*;", config_content)
        )
        has_index = bool(
            re.search(r"index\s+index\.html\s+index\.htm\s*;", config_content)
        )
        has_static_cache = bool(
            re.search(r"location\s+~\*\s+\\\.\([^\)]+\)", config_content)
        )
        has_security_tokens = "server_tokens off;" in config_content
        has_nosniff = "X-Content-Type-Options" in config_content

        is_valid = has_try_files and has_root and has_index

        return {
            "is_valid": is_valid,
            "has_try_files": has_try_files,
            "has_root": has_root,
            "has_index": has_index,
            "has_static_cache": has_static_cache,
            "has_security_tokens": has_security_tokens,
            "has_nosniff": has_nosniff,
        }

    @classmethod
    def audit_config_file(cls, config_path: Path) -> Dict[str, Any]:
        """Audita un archivo físico de configuración de Nginx."""
        if not config_path.is_file():
            return {
                "exists": False,
                "is_valid": False,
                "error": f"Archivo no encontrado: {config_path}"
            }

        content = config_path.read_text(encoding="utf-8")
        result = cls.validate_nginx_config_content(content)
        result["exists"] = True
        result["path"] = str(config_path)
        return result

