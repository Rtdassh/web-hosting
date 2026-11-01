import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Code2,
  Eye,
  FileArchive,
  FileText,
  Globe2,
  Layers3,
  Loader2,
  PackageOpen,
  Rocket,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react';

import { instanceService, templateService } from '../../services/api';

const TEMPLATES = [
  {
    id: 'landing-business',
    name: 'Landing Page',
    subtitle: 'Landing Business',
    description:
      'Página comercial moderna para presentar una marca, producto o servicio.',
    category: 'Negocios',
    icon: Globe2,
    preview: {
      eyebrow: 'MODERN BUSINESS',
      title: 'Convierte visitas en oportunidades.',
      text: 'Hero comercial, beneficios, llamada a la acción y footer profesional.',
      sections: ['Hero', 'Beneficios', 'CTA'],
    },
  },
  {
    id: 'personal-portfolio',
    name: 'Portafolio',
    subtitle: 'Personal Portfolio',
    description:
      'Portafolio limpio para mostrar proyectos, habilidades y experiencia.',
    category: 'Personal',
    icon: UserRound,
    preview: {
      eyebrow: 'DEVELOPER PORTFOLIO',
      title: 'Diseño, código y proyectos.',
      text: 'Presentación personal, proyectos destacados y sección de contacto.',
      sections: ['Perfil', 'Proyectos', 'Contacto'],
    },
  },
  {
    id: 'html5-docs',
    name: 'Documentación',
    subtitle: 'HTML5 Docs',
    description:
      'Base estructurada para documentación técnica, guías y referencias.',
    category: 'Docs',
    icon: FileText,
    preview: {
      eyebrow: 'TECHNICAL DOCS',
      title: 'Documentación clara y ordenada.',
      text: 'Sidebar de navegación, contenido técnico y estructura preparada para crecer.',
      sections: ['Sidebar', 'Guías', 'Referencia'],
    },
  },
];

export default function DeployModal({
  isOpen,
  onClose,
  onInstanceDeployed,
}) {
  const [activeTab, setActiveTab] = useState('zip');
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(
    'landing-business'
  );
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const MAX_FILE_SIZE = 25 * 1024 * 1024;

  const currentTemplate = useMemo(
    () =>
      TEMPLATES.find((template) => template.id === selectedTemplate) ||
      TEMPLATES[0],
    [selectedTemplate]
  );

  if (!isOpen) return null;

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;

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

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      validateFile(selectedFile);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];

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
    setActiveTab('zip');
    setSelectedTemplate('landing-business');
    setPreviewTemplate(null);

    onClose();
  };

  const extractErrorMessage = (requestError) => {
    const detail = requestError.response?.data?.detail;

    if (!detail) {
      return 'No fue posible desplegar el sitio. Inténtalo nuevamente.';
    }

    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          typeof item === 'string'
            ? item
            : item.msg || item.detail || JSON.stringify(item)
        )
        .join('. ');
    }

    if (typeof detail === 'object') {
      return detail.message || JSON.stringify(detail);
    }

    return String(detail);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Indica un nombre para tu proyecto.');
      return;
    }

    if (activeTab === 'zip' && !file) {
      setError('Selecciona un paquete .zip.');
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

      if (onInstanceDeployed) {
        onInstanceDeployed(newInstance);
      }

      setName('');
      setFile(null);
      setError('');
      setPreviewTemplate(null);

      onClose();
    } catch (requestError) {
      setError(extractErrorMessage(requestError));
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#10202d]/70 p-3 backdrop-blur-md sm:p-4">
        <div className="relative my-auto flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_35px_90px_rgba(9,24,34,0.32)]">
          {/* Header */}
          <div className="relative shrink-0 overflow-hidden border-b border-[#dce7e2] bg-[#172838] px-6 py-5 text-white">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.055]"
              style={{
                backgroundImage:
                  'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />

            <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#28B586]/20 blur-3xl" />

            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#28B586]/25 bg-[#28B586]/10 text-[#7de0bd]">
                  <Rocket className="h-5 w-5" />
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#7de0bd]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#28B586]" />
                    Nuevo despliegue
                  </div>

                  <h2 className="text-xl font-black tracking-[-0.02em]">
                    Publica con Codrop
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                aria-label="Cerrar modal"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 space-y-5 overflow-y-auto bg-[#fbfdfc] px-6 py-5"
          >
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Project name */}
            <div>
              <label
                htmlFor="project-name"
                className="mb-1.5 block text-xs font-black text-[#334e5e]"
              >
                Nombre del proyecto
              </label>

              <input
                id="project-name"
                type="text"
                value={name}
                disabled={loading}
                onChange={(event) => {
                  setName(event.target.value);
                  setError('');
                }}
                placeholder="Ej. Mi portafolio"
                required
                className="h-11 w-full rounded-xl border border-[#d6dfdb] bg-white px-4 text-sm font-semibold text-[#172838] outline-none transition placeholder:text-[#94A3B8] focus:border-[#28B586] focus:ring-2 focus:ring-[#28B586]/10 disabled:bg-slate-50"
              />
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 rounded-xl border border-[#dce7e2] bg-[#f2f6f4] p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('zip');
                  setError('');
                }}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-black transition ${
                  activeTab === 'zip'
                    ? 'bg-white text-[#172838] shadow-sm'
                    : 'text-[#64748B] hover:text-[#172838]'
                }`}
              >
                <FileArchive className="h-4 w-4" />
                Subir .ZIP
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('template');
                  setError('');
                }}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-black transition ${
                  activeTab === 'template'
                    ? 'bg-white text-[#1C7F62] shadow-sm'
                    : 'text-[#64748B] hover:text-[#172838]'
                }`}
              >
                <Layers3 className="h-4 w-4" />
                Plantillas 1-Clic
              </button>
            </div>

            {activeTab === 'template' ? (
              <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#94A3B8]">
                      Catálogo Codrop
                    </p>

                    <h3 className="mt-1 text-sm font-black text-[#172838]">
                      Elige un punto de partida
                    </h3>
                  </div>

                  <span className="text-[10px] font-bold text-[#94A3B8]">
                    3 disponibles
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    const isSelected =
                      selectedTemplate === template.id;

                    return (
                      <article
                        key={template.id}
                        className={`relative overflow-hidden rounded-2xl border bg-white transition ${
                          isSelected
                            ? 'border-[#28B586] shadow-[0_12px_30px_rgba(40,181,134,0.12)]'
                            : 'border-[#dce7e2] hover:border-[#b9d8ca]'
                        }`}
                      >
                        {/* Mini preview */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTemplate(template.id)
                          }
                          className="block w-full text-left"
                        >
                          <div className="relative h-28 overflow-hidden border-b border-[#e5ece8] bg-[#172838] p-3">
                            <div
                              className="absolute inset-0 opacity-[0.06]"
                              style={{
                                backgroundImage:
                                  'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
                                backgroundSize: '20px 20px',
                              }}
                            />

                            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[#28B586]/25 blur-2xl" />

                            <div className="relative">
                              <div className="flex items-center justify-between">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#28B586]/15 text-[#7de0bd]">
                                  <Icon className="h-3.5 w-3.5" />
                                </span>

                                {isSelected && (
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#28B586] text-white">
                                    <Check className="h-3.5 w-3.5" />
                                  </span>
                                )}
                              </div>

                              <div className="mt-4 h-2 w-20 rounded-full bg-white/80" />
                              <div className="mt-2 h-1.5 w-28 rounded-full bg-white/25" />
                              <div className="mt-1.5 h-1.5 w-20 rounded-full bg-white/15" />
                            </div>
                          </div>

                          <div className="p-3.5">
                            <span className="rounded-full bg-[#EAF7F1] px-2 py-1 text-[8px] font-black uppercase tracking-wide text-[#1C7F62]">
                              {template.category}
                            </span>

                            <h4 className="mt-2.5 text-sm font-black text-[#172838]">
                              {template.name}
                            </h4>

                            <p className="mt-1 min-h-[48px] text-[10px] font-medium leading-4 text-[#64748B]">
                              {template.description}
                            </p>
                          </div>
                        </button>

                        <div className="grid grid-cols-2 border-t border-[#edf1ef]">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewTemplate(template)
                            }
                            className="inline-flex items-center justify-center gap-1.5 border-r border-[#edf1ef] px-2 py-2.5 text-[10px] font-black text-[#64748B] transition hover:bg-[#f8fbf9] hover:text-[#1C7F62]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Vista previa
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedTemplate(template.id)
                            }
                            className={`inline-flex items-center justify-center gap-1.5 px-2 py-2.5 text-[10px] font-black transition ${
                              isSelected
                                ? 'bg-[#EAF7F1] text-[#1C7F62]'
                                : 'text-[#64748B] hover:bg-[#f8fbf9] hover:text-[#1C7F62]'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                Seleccionada
                              </>
                            ) : (
                              <>
                                <ArrowRight className="h-3.5 w-3.5" />
                                Elegir
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-black text-[#334e5e]">
                    Archivo del proyecto
                  </label>

                  <span className="text-[10px] font-bold text-[#94A3B8]">
                    Máx. 25 MB
                  </span>
                </div>

                {!file ? (
                  <label
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`block cursor-pointer rounded-2xl border-2 border-dashed px-5 py-7 text-center transition ${
                      isDragging
                        ? 'scale-[1.01] border-[#28B586] bg-[#EAF7F1]'
                        : 'border-[#cddbd5] bg-white hover:border-[#28B586] hover:bg-[#f8fbf9]'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".zip,application/zip"
                      disabled={loading}
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-[#CFE4D6] bg-[#EAF7F1] text-[#1C7F62]">
                      <UploadCloud className="h-5 w-5" />
                    </div>

                    <p className="mt-3 text-sm font-black text-[#172838]">
                      Arrastra tu archivo .zip
                    </p>

                    <p className="mt-1 text-xs font-medium text-[#64748B]">
                      o haz clic para buscarlo en tu equipo
                    </p>

                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#e2e8e5] bg-[#f8fbf9] px-3 py-1.5">
                      <PackageOpen className="h-3 w-3 text-[#28B586]" />

                      <span className="text-[10px] font-semibold text-[#64748B]">
                        Debe contener{' '}
                        <code className="font-mono font-black text-[#172838]">
                          index.html
                        </code>{' '}
                        en la raíz
                      </span>
                    </div>
                  </label>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-[#b9ddcd] bg-[#edf9f3] p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#1C7F62]">
                      <FileArchive className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-black text-[#172838]">
                          {file.name}
                        </p>

                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#28B586]" />
                      </div>

                      <p className="mt-1 text-[10px] font-semibold text-[#64748B]">
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
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] transition hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Flow */}
            <div className="rounded-2xl border border-[#e5ece8] bg-white px-4 py-3">
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.15em] text-[#94A3B8]">
                Flujo Codrop
              </p>

              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black">
                <span className="inline-flex items-center gap-1.5 text-[#172838]">
                  {activeTab === 'template' ? (
                    <>
                      <Layers3 className="h-3.5 w-3.5 text-[#28B586]" />
                      {currentTemplate.name}
                    </>
                  ) : (
                    <>
                      <Code2 className="h-3.5 w-3.5 text-[#28B586]" />
                      Archivo .zip
                    </>
                  )}
                </span>

                <ArrowRight className="h-3.5 w-3.5 text-[#28B586]" />

                <span className="text-[#64748B]">Deploy aislado</span>

                <ArrowRight className="h-3.5 w-3.5 text-[#28B586]" />

                <span className="text-[#1C7F62]">URL pública</span>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e8eeeb] bg-white px-6 py-4">
            <div className="hidden text-[10px] font-semibold text-[#94A3B8] sm:block">
              {activeTab === 'template'
                ? 'Sin necesidad de preparar un archivo .zip'
                : 'Tu proyecto se desplegará en un contenedor aislado'}
            </div>

            <div className="ml-auto flex gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="rounded-xl border border-[#dfe7e4] bg-white px-4 py-2.5 text-xs font-black text-[#64748B] transition hover:bg-[#f8fbf9]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-xl bg-[#28B586] px-4 py-2.5 text-xs font-black text-white shadow-[0_10px_25px_rgba(40,181,134,0.2)] transition hover:bg-[#239C76] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Desplegando...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    {activeTab === 'template'
                      ? 'Desplegar plantilla'
                      : 'Desplegar sitio'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Template Preview */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onSelect={() => {
            setSelectedTemplate(previewTemplate.id);
            setPreviewTemplate(null);
          }}
        />
      )}
    </>
  );
}

function TemplatePreviewModal({ template, onClose, onSelect }) {
  const Icon = template.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#10202d]/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-[720px] overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_35px_90px_rgba(9,24,34,0.38)]">
        <div className="flex items-center justify-between border-b border-[#e5ece8] px-6 py-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#28B586]">
              Vista previa
            </p>

            <h3 className="mt-1 text-lg font-black text-[#172838]">
              {template.name}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f6f4] text-[#64748B] transition hover:text-[#172838]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-[#eef5f2] p-5 sm:p-7">
          <div className="overflow-hidden rounded-[22px] border border-[#dce7e2] bg-white shadow-[0_18px_45px_rgba(23,40,56,0.09)]">
            <div className="relative overflow-hidden bg-[#172838] px-6 py-8 text-white sm:px-9 sm:py-10">
              <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                  backgroundImage:
                    'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
                  backgroundSize: '26px 26px',
                }}
              />

              <div className="relative max-w-lg">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#28B586]/30 bg-[#28B586]/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#7de0bd]">
                  <Icon className="h-3.5 w-3.5" />
                  {template.preview.eyebrow}
                </span>

                <h4 className="mt-5 text-3xl font-black tracking-[-0.035em]">
                  {template.preview.title}
                </h4>

                <p className="mt-3 max-w-md text-xs font-medium leading-5 text-slate-300">
                  {template.preview.text}
                </p>

                <div className="mt-6 inline-flex rounded-xl bg-[#28B586] px-4 py-2.5 text-xs font-black text-white">
                  Empezar ahora
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-3">
              {template.preview.sections.map((section, index) => (
                <div
                  key={section}
                  className="rounded-xl border border-[#e5ece8] bg-[#f8fbf9] p-4"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAF7F1] text-[10px] font-black text-[#1C7F62]">
                    0{index + 1}
                  </span>

                  <p className="mt-3 text-xs font-black text-[#172838]">
                    {section}
                  </p>

                  <div className="mt-2 h-1.5 w-full rounded-full bg-[#e2ebe7]" />
                  <div className="mt-1.5 h-1.5 w-2/3 rounded-full bg-[#edf2ef]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#e5ece8] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-black text-[#64748B] transition hover:bg-[#f3f6f4]"
          >
            Volver
          </button>

          <button
            type="button"
            onClick={onSelect}
            className="inline-flex items-center gap-2 rounded-xl bg-[#28B586] px-5 py-2.5 text-xs font-black text-white transition hover:bg-[#239C76]"
          >
            <Check className="h-4 w-4" />
            Usar esta plantilla
          </button>
        </div>
      </div>
    </div>
  );
}