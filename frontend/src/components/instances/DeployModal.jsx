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

import { instanceService, templateService } from '../../services/api';

/**
 * DeployModal: Ventana modal compacta y ergonómica para el aprovisionamiento de sitios web.
 * Soporta carga directa de paquetes .ZIP y catálogo de plantillas 1-clic (RF-14).
 * Dimensionada con max-h y scroll inteligente para visualizarse correctamente en cualquier resolución.
 */
export default function DeployModal({
  isOpen,
  onClose,
  onInstanceDeployed,
}) {
  const [activeTab, setActiveTab] = useState('zip'); // 'zip' | 'template'
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('landing-business');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const templates = [
    { id: 'landing-business', name: 'Landing Business', desc: 'Sitio comercial moderno con Tailwind', tag: 'Negocios' },
    { id: 'personal-portfolio', name: 'Portafolio Dev', desc: 'Página personal minimalista para ingenieros', tag: 'Personal' },
    { id: 'html5-docs', name: 'Doc Técnica', desc: 'Estructura limpia con sidebar para documentación', tag: 'Docs' },
  ];

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

  const extractErrorMessage = (err) => {
    const detail = err.response?.data?.detail;
    if (!detail) return 'No fue posible desplegar el sitio. Inténtalo nuevamente.';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => (typeof d === 'string' ? d : d.msg || d.detail || JSON.stringify(d))).join('. ');
    }
    if (typeof detail === 'object') {
      return detail.message || JSON.stringify(detail);
    }
    return String(detail);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Por favor indica un nombre para tu proyecto.');
      return;
    }

    if (activeTab === 'zip' && !file) {
      setError('Por favor selecciona un paquete .zip.');
      return;
    }

    setLoading(true);

    try {
      let newInstance;
      if (activeTab === 'template') {
        newInstance = await templateService.deployTemplate(
          name.trim(),
          selectedTemplate
        );
      } else {
        newInstance = await instanceService.deployInstance(
          name.trim(),
          file
        );
      }

      onInstanceDeployed(newInstance);
      setName('');
      setFile(null);
      setError('');
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-900/60 backdrop-blur-[2px] animate-fade-in">
      {/* Contenedor Modal de tamaño ergonómico */}
      <div className="relative w-full max-w-[490px] max-h-[90vh] bg-white border border-[#dfe7e4] rounded-[20px] shadow-[0_20px_60px_rgba(23,40,56,0.18)] flex flex-col overflow-hidden text-slate-900">
        
        {/* Header Compacto */}
        <div className="relative px-5 py-4 bg-gradient-to-r from-brand-50/80 to-white border-b border-brand-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-200 flex items-center justify-center shadow-sm shrink-0">
              <Rocket className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-700">
                  Nuevo Despliegue
                </span>
              </div>
              <h2 className="text-[17px] font-bold text-navy-900 leading-tight">
                Publica tu proyecto web
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-navy-900 hover:bg-slate-100 disabled:opacity-50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario con Scroll Interno si es necesario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre del proyecto */}
          <div>
            <label
              htmlFor="project-name"
              className="block text-xs font-bold text-slate-800 mb-1.5"
            >
              Nombre del proyecto
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              disabled={loading}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Mi sitio comercial"
              required
              className="w-full h-10 bg-white border border-[#cbd5e1] rounded-xl px-3.5 text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:bg-slate-50 transition"
            />
          </div>

          {/* Selector de Método (ZIP vs Plantilla) */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('zip')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'zip'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Subir Archivo .ZIP
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('template')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'template'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Plantillas en 1 Clic
            </button>
          </div>

          {activeTab === 'template' ? (
            /* Plantillas */
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Selecciona una Plantilla
              </label>
              <div className="space-y-2">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      selectedTemplate === tmpl.id
                        ? 'border-brand-500 bg-brand-50/50 shadow-sm'
                        : 'border-[#e2e8f0] bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-navy-900">{tmpl.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          {tmpl.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-normal">{tmpl.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      selectedTemplate === tmpl.id
                        ? 'border-brand-500 bg-brand-500'
                        : 'border-slate-300'
                    }`}>
                      {selectedTemplate === tmpl.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Zona de Carga de Archivo ZIP Compacta */
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Archivo del proyecto
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  Máx. 25 MB (.zip)
                </span>
              </div>

              {!file ? (
                <label
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    block border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer transition-all
                    ${
                      isDragging
                        ? 'border-brand-500 bg-brand-50 scale-[1.01]'
                        : 'border-[#cddbd5] bg-[#fbfdfc] hover:border-brand-500 hover:bg-brand-50/50'
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
                  <div className="w-9 h-9 mx-auto rounded-xl bg-white border border-brand-100 flex items-center justify-center shadow-sm">
                    <UploadCloud className="w-4 h-4 text-brand-600" />
                  </div>
                  <p className="mt-2 text-xs font-bold text-navy-900">
                    Arrastra tu archivo .zip aquí
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                    o haz clic para explorar en tu equipo
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#e2e8f0]">
                    <PackageOpen className="w-3 h-3 text-brand-600" />
                    <span className="text-[10px] text-slate-600 font-medium">
                      Debe contener un <code className="font-mono text-slate-800 font-semibold">index.html</code> en la raíz
                    </span>
                  </div>
                </label>
              ) : (
                <div className="border border-brand-200 bg-brand-50/50 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-brand-100 flex items-center justify-center shrink-0">
                    <FileArchive className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-navy-900 truncate">
                        {file.name}
                      </p>
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
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
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    aria-label="Remover archivo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resumen del Flujo Codrop */}
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-600">
            <span className="text-navy-900">Código .zip</span>
            <span className="text-brand-500">→</span>
            <span>Nginx Aislado (:ro)</span>
            <span className="text-brand-500">→</span>
            <span className="text-brand-700">URL Pública Automática</span>
          </div>
        </form>

        {/* Footer Fijo con Acciones */}
        <div className="px-5 py-3.5 border-t border-[#e8eeeb] bg-[#fafcfb] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="h-9 px-4 rounded-xl bg-white border border-[#dfe7e4] hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="min-w-[135px] h-9 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Desplegando...
              </>
            ) : (
              <>
                <Rocket className="w-3.5 h-3.5" />
                Desplegar sitio
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
