import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileArchive,
  AlertCircle,
  Loader2,
  Rocket,
} from 'lucide-react';
import { instanceService } from '../../services/api';

export default function DeployModal({
  isOpen,
  onClose,
  onInstanceDeployed,
}) {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const MAX_FILE_SIZE = 25 * 1024 * 1024;

  const validateFile = (selectedFile) => {
    if (!selectedFile) {
      return false;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
      setError('El archivo seleccionado debe tener formato .zip.');
      setFile(null);
      return false;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('El archivo .zip no puede superar los 25 MB.');
      setFile(null);
      return false;
    }

    setError('');
    setFile(selectedFile);
    return true;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      validateFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];

    if (droppedFile) {
      validateFile(droppedFile);
    }
  };

  const handleClose = () => {
    if (loading) return;

    setName('');
    setFile(null);
    setError('');
    setIsDragging(false);

    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Por favor indica un nombre para tu proyecto.');
      return;
    }

    if (!file) {
      setError('Por favor selecciona un paquete .zip.');
      return;
    }

    setLoading(true);

    try {
      const newInstance = await instanceService.deployInstance(
        name.trim(),
        file
      );

      onInstanceDeployed(newInstance);

      setName('');
      setFile(null);
      setError('');

      onClose();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No fue posible desplegar el sitio. Inténtalo nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 MB';

    const mb = bytes / (1024 * 1024);

    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      {/* Fondo */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[540px] bg-white border border-[#e2e8f0] rounded-[18px] shadow-2xl overflow-hidden">

        {/* Encabezado */}
        <div className="px-7 pt-7 pb-5 border-b border-[#e2e8f0]">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="Cerrar"
            className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-[#0f172a] hover:bg-slate-100 disabled:opacity-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-[#2563eb]" />
          </div>

          <h2 className="mt-5 text-[22px] font-semibold tracking-tight text-[#0f172a]">
            Nuevo despliegue
          </h2>

          <p className="mt-1.5 text-[14px] leading-6 text-[#64748b]">
            Sube los archivos de tu sitio y CloudPaaS se encargará de
            publicarlo.
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="px-7 py-6"
        >
          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-[10px] text-[13px]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />

              <span>
                {error}
              </span>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label
              htmlFor="project-name"
              className="block text-[13px] font-semibold text-[#0f172a] mb-2"
            >
              Nombre del proyecto
            </label>

            <input
              id="project-name"
              type="text"
              value={name}
              disabled={loading}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Mi portafolio"
              className="w-full h-11 bg-white border border-[#cbd5e1] rounded-[9px] px-3.5 text-[14px] text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2563eb] disabled:bg-slate-50 disabled:cursor-not-allowed transition"
            />

            <p className="mt-1.5 text-[12px] text-[#64748b]">
              Este nombre te ayudará a identificar el sitio en tu panel.
            </p>
          </div>

          {/* Archivo ZIP */}
          <div className="mt-6">
            <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
              Archivos del sitio
            </label>

            {!file ? (
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`block border-2 border-dashed rounded-[12px] px-6 py-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[#2563eb] bg-blue-50'
                    : 'border-[#cbd5e1] bg-[#f8fafc] hover:border-[#2563eb] hover:bg-blue-50/40'
                }`}
              >
                <input
                  type="file"
                  accept=".zip,application/zip"
                  disabled={loading}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-11 h-11 mx-auto rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center shadow-sm">
                  <UploadCloud className="w-5 h-5 text-[#2563eb]" />
                </div>

                <p className="mt-4 text-[14px] font-semibold text-[#0f172a]">
                  Arrastra tu archivo .zip aquí
                </p>

                <p className="mt-1 text-[13px] text-[#64748b]">
                  o haz clic para seleccionarlo
                </p>

                <p className="mt-3 text-[11px] text-[#94a3b8]">
                  Máximo 25 MB · Debe incluir un archivo index.html
                </p>
              </label>
            ) : (
              <div className="border border-[#e2e8f0] bg-[#f8fafc] rounded-[12px] p-4 flex items-center gap-4">

                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileArchive className="w-5 h-5 text-[#2563eb]" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#0f172a] truncate">
                    {file.name}
                  </p>

                  <p className="mt-0.5 text-[11px] text-[#64748b]">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setFile(null);
                    setError('');
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  aria-label="Eliminar archivo"
                >
                  <X className="w-4 h-4" />
                </button>

              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="mt-7 pt-5 border-t border-[#e2e8f0] flex items-center justify-end gap-3">

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="h-10 px-4 rounded-[9px] bg-white border border-[#e2e8f0] hover:bg-slate-50 text-[#0f172a] text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="min-w-[150px] h-10 px-5 rounded-[9px] bg-[#2563eb] hover:bg-blue-700 text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Desplegando...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Desplegar sitio
                </>
              )}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}