import os
import zipfile
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException, status

class ArtifactService:
    @staticmethod
    def sanitize_and_extract_zip(upload_file: UploadFile, destination_dir: str) -> None:
        """
        Extrae un paquete .zip aplicando mitigación rigurosa de Zip Slip (RNF-05),
        límite estricto de 25 MB en subida (RF-13) y validación de existencia de index.html.
        """
        MAX_ZIP_SIZE = 25 * 1024 * 1024       # 25 MB comprimido
        MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024  # 100 MB descomprimido (Anti-Zip Bomb)
        
        # Crear directorio destino
        dest_path = Path(destination_dir).resolve()
        dest_path.mkdir(parents=True, exist_ok=True)

        temp_zip_path = dest_path / "uploaded_package.zip"

        # 1. Guardar temporalmente el archivo subido verificando tamaño en stream
        file_size = 0
        try:
            with open(temp_zip_path, "wb") as buffer:
                while chunk := upload_file.file.read(1024 * 1024):
                    file_size += len(chunk)
                    if file_size > MAX_ZIP_SIZE:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail="El paquete .zip excede el límite máximo de 25 MB permitido (RF-13)."
                        )
                    buffer.write(chunk)
        except HTTPException:
            shutil.rmtree(dest_path, ignore_errors=True)
            raise

        # 2. Validar estructura interna y descomprimir con prevención de Zip Slip
        try:
            with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
                # Mitigación contra Zip Bomb
                total_uncompressed = sum(member.file_size for member in zip_ref.infolist())
                if total_uncompressed > MAX_UNCOMPRESSED_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="El contenido descomprimido excede la cuota de seguridad de 100 MB (Anti-Zip Bomb)."
                    )

                for member in zip_ref.infolist():
                    target_path = (dest_path / member.filename).resolve()
                    
                    # Comprobación canónica estricta Anti-Zip Slip (RNF-05)
                    if not target_path.is_relative_to(dest_path):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Intento de Directory Traversal detectado (Zip Slip) en: {member.filename}"
                        )
                
                # Extraer de forma segura
                zip_ref.extractall(dest_path)
                
            # 3. Normalización de estructura
            ArtifactService._normalize_extracted_structure(dest_path)

            # 4. Validación semántica obligatoria: index.html debe existir en la raíz
            has_index = (dest_path / "index.html").exists() or (dest_path / "index.htm").exists()
            if not has_index:
                shutil.rmtree(dest_path, ignore_errors=True)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El paquete web no es válido: debe contener un archivo 'index.html' en la raíz del proyecto."
                )

        except zipfile.BadZipFile:
            shutil.rmtree(dest_path, ignore_errors=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo proporcionado no es un paquete .zip válido o está corrupto."
            )
        except Exception:
            if not (dest_path / "index.html").exists() and not (dest_path / "index.htm").exists():
                shutil.rmtree(dest_path, ignore_errors=True)
            raise
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
        if (dest_path / "index.html").exists() or (dest_path / "index.htm").exists():
            return
            
        subdirs = [p for p in dest_path.iterdir() if p.is_dir() and not p.name.startswith(".")]
        if len(subdirs) == 1:
            nested_dir = subdirs[0]
            if (nested_dir / "index.html").exists() or (nested_dir / "index.htm").exists():
                for item in nested_dir.iterdir():
                    target = dest_path / item.name
                    if not target.exists():
                        shutil.move(str(item), str(target))
                try:
                    nested_dir.rmdir()
                except OSError:
                    pass

artifact_service = ArtifactService()
