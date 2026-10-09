import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileArchive,
  AlertCircle,
  Loader2,
  Rocket,
  CheckCircle2,
  PackageOpen,
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
        className="absolute inset-0 bg-navy-900/45 backdrop-blur-[3px]"
        onClick={handleClose}
      />


      {/* Modal */}
      <div className="relative w-full max-w-[560px] bg-white border border-[#dfe7e4] rounded-[24px] shadow-[0_30px_90px_rgba(23,40,56,0.22)] overflow-hidden">


        {/* =====================================================
            HEADER
        ====================================================== */}
        <div className="relative px-7 pt-7 pb-6 bg-brand-50/70 border-b border-brand-100">

          <div className="absolute top-0 right-0 w-[78px] h-[78px] bg-brand-100 rounded-bl-[78px]" />

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="Cerrar"
            className="absolute top-5 right-5 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-navy-900 hover:bg-white/70 disabled:opacity-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>


          <div className="flex items-start gap-4">

            <div className="w-12 h-12 rounded-[14px] bg-white border border-brand-100 flex items-center justify-center shadow-sm flex-shrink-0">
              <Rocket className="w-5 h-5 text-brand-600" />
            </div>


            <div className="pr-10">

              <div className="inline-flex items-center gap-2">

                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />

                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-700">
                  Nuevo despliegue
                </span>

              </div>


              <h2 className="mt-2 text-[24px] font-bold tracking-[-0.025em] text-navy-900">
                Publica tu proyecto
              </h2>


              <p className="mt-1.5 text-[13px] leading-6 text-[#64748b]">
                Sube tu archivo <strong className="font-semibold text-navy-900">.zip</strong> y Codrop se encargará de convertirlo en una URL pública.
              </p>

            </div>

          </div>

        </div>


        {/* =====================================================
            FORM
        ====================================================== */}
        <form
          onSubmit={handleSubmit}
          className="px-7 py-6"
        >


          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-[11px] text-[12px]">

              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />

              <span>
                {error}
              </span>

            </div>
          )}


          {/* =================================================
              NOMBRE
          ================================================== */}
          <div>

            <label
              htmlFor="project-name"
              className="block text-[12px] font-semibold text-navy-900 mb-2"
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
              className="w-full h-11 bg-white border border-[#cbd5e1] rounded-[10px] px-3.5 text-[13px] text-navy-900 placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition"
            />


            <p className="mt-1.5 text-[11px] text-[#64748b]">
              Este nombre te ayudará a identificar el sitio dentro de tu workspace.
            </p>

          </div>


          {/* =================================================
              FILE
          ================================================== */}
          <div className="mt-6">

            <div className="flex items-center justify-between mb-2">

              <label className="block text-[12px] font-semibold text-navy-900">
                Archivo del proyecto
              </label>


              <span className="text-[10px] font-medium text-[#94a3b8]">
                Máx. 25 MB
              </span>

            </div>


            {!file ? (

              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  block
                  border-2
                  border-dashed
                  rounded-[16px]
                  px-6
                  py-8
                  text-center
                  cursor-pointer
                  transition-all
                  ${
                    isDragging
                      ? 'border-brand-500 bg-brand-50 scale-[1.01]'
                      : 'border-[#cddbd5] bg-[#fbfdfc] hover:border-brand-500 hover:bg-brand-50/60'
                  }
                `}
              >

                <input
                  type="file"
                  accept=".zip,application/zip"
                  disabled={loading}
                  onChange={handleFileChange}
                  className="hidden"
                />


                <div className="w-12 h-12 mx-auto rounded-[14px] bg-white border border-brand-100 flex items-center justify-center shadow-sm">
                  <UploadCloud className="w-5 h-5 text-brand-600" />
                </div>


                <p className="mt-4 text-[13px] font-semibold text-navy-900">
                  Arrastra tu archivo .zip aquí
                </p>


                <p className="mt-1 text-[12px] text-[#64748b]">
                  o haz clic para seleccionarlo
                </p>


                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#e2e8f0]">

                  <PackageOpen className="w-3.5 h-3.5 text-brand-600" />

                  <span className="text-[10px] text-[#64748b]">
                    Debe incluir un archivo index.html
                  </span>

                </div>

              </label>

            ) : (

              <div className="border border-brand-100 bg-brand-50/60 rounded-[14px] p-4 flex items-center gap-4">

                <div className="w-11 h-11 rounded-[12px] bg-white border border-brand-100 flex items-center justify-center flex-shrink-0">
                  <FileArchive className="w-5 h-5 text-brand-600" />
                </div>


                <div className="min-w-0 flex-1">

                  <div className="flex items-center gap-2">

                    <p className="text-[12px] font-semibold text-navy-900 truncate">
                      {file.name}
                    </p>


                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />

                  </div>


                  <p className="mt-1 text-[10px] text-[#64748b]">
                    {formatFileSize(file.size)} · Listo para desplegar
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


          {/* =================================================
              RESUMEN DE FLUJO
          ================================================== */}
          <div className="mt-5 px-4 py-3 rounded-[12px] bg-[#f8fbfa] border border-[#e2ebe7]">

            <div className="flex items-center justify-center gap-3 text-[10px] font-semibold text-[#64748b]">

              <span className="text-navy-900">
                .zip
              </span>

              <span className="text-brand-500">
                →
              </span>

              <span>
                Codrop
              </span>

              <span className="text-brand-500">
                →
              </span>

              <span className="text-brand-700">
                URL pública
              </span>

            </div>

          </div>


          {/* =================================================
              ACTIONS
          ================================================== */}
          <div className="mt-6 pt-5 border-t border-[#e8eeeb] flex items-center justify-end gap-3">

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="h-10 px-4 rounded-[9px] bg-white border border-[#dfe7e4] hover:bg-[#f8faf9] text-navy-900 text-[12px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>


            <button
              type="submit"
              disabled={loading}
              className="min-w-[155px] h-10 px-5 rounded-[9px] bg-brand-500 hover:bg-brand-600 text-white text-[12px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(40,181,134,0.2)] disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:-translate-y-[1px]"
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