import os
import zipfile
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException

class ArtifactService:
    @staticmethod
    def sanitize_and_extract_zip(upload_file: UploadFile, destination_dir: str) -> None:
        """
        Extrae un paquete .zip aplicando técnicas de mitigación de vulnerabilidad
        Zip Slip Attack (RNF-05) y verificando que el tamaño no exceda 25 MB.
        """
        MAX_ZIP_SIZE = 25 * 1024 * 1024  # 25 MB
        
        # Crear directorio destino
        dest_path = Path(destination_dir).resolve()
        dest_path.mkdir(parents=True, exist_ok=True)

        temp_zip_path = dest_path / "uploaded_package.zip"

        # Guardar temporalmente el archivo subido
        file_size = 0
        with open(temp_zip_path, "wb") as buffer:
            while chunk := upload_file.file.read(1024 * 1024):
                file_size += len(chunk)
                if file_size > MAX_ZIP_SIZE:
                    temp_zip_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail="El paquete .zip excede el límite máximo de 25 MB permitido (RF-13)."
                    )
                buffer.write(chunk)

        # Validar y descomprimir con prevención de Zip Slip
        try:
            with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
                for member in zip_ref.infolist():
                    target_path = (dest_path / member.filename).resolve()
                    
                    # Comprobación estricta Anti-Zip Slip: la ruta resultante DEBE estar dentro de dest_path
                    if not str(target_path).startswith(str(dest_path)):
                        raise HTTPException(
                            status_code=400,
                            detail=f"Intento de escape de directorio detectado (Zip Slip) en: {member.filename}"
                        )
                
                # Extraer de forma segura
                zip_ref.extractall(dest_path)
                
            # [ESTRUCTURA BASE]: Normalización de extracción
            # Si el usuario comprimió una carpeta que contiene index.html en vez del contenido directo,
            # desanidar para que nginx lo encuentre directamente en la raíz de su document root.
            ArtifactService._normalize_extracted_structure(dest_path)
            
            # [PUNTO DE EXTENSIÓN]: Futuras validaciones (ej. escaneo de malware, comprobación de tamaño total descomprimido)
            # pueden implementarse aquí por el equipo.

        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="El archivo proporcionado no es un .zip válido.")
        finally:
            # Eliminar el archivo .zip temporal conservando solo los archivos extraídos
            if temp_zip_path.exists():
                temp_zip_path.unlink()

    @staticmethod
    def _normalize_extracted_structure(dest_path: Path) -> None:
        """
        Si los archivos se extrajeron dentro de un subdirectorio único y no hay index.html en la raíz,
        mueve el contenido al nivel superior para evitar errores 403/404 en Nginx.
        """
        if (dest_path / "index.html").exists():
            return
            
        subdirs = [p for p in dest_path.iterdir() if p.is_dir() and not p.name.startswith(".")]
        if len(subdirs) == 1 and (subdirs[0] / "index.html").exists():
            nested_dir = subdirs[0]
            for item in nested_dir.iterdir():
                target = dest_path / item.name
                if not target.exists():
                    shutil.move(str(item), str(target))
            try:
                nested_dir.rmdir()
            except OSError:
                pass

artifact_service = ArtifactService()

