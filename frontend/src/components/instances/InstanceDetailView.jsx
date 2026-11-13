import React from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Globe,
  Calendar,
  Box,
  Sliders,
  Play,
  Square,
  RotateCcw,
  RefreshCw,
  Terminal,
  Trash2,
  AlertTriangle,
  Server,
  Layers,
} from 'lucide-react';

import SiteManagementPanel from './SiteManagementPanel';
import SiteToolsPanel from './SiteToolsPanel';
import StatusBadge from '../ui/StatusBadge';
import CopyButton from '../ui/CopyButton';
import LoadingButton from '../ui/LoadingButton';
import ServerMascot from '../mascot/ServerMascot';
import InstanceMetricsCard from './InstanceMetricsCard';

/**
 * InstanceDetailView: Vista dedicada de detalle para un proyecto desplegado.
 * Aplica el patrón Master-Detail con divulgación progresiva (progressive disclosure).
 *
 * Secciones:
 * 1. Cabecera de Navegación: Retorno a vista principal, nombre, estado, fecha de despliegue.
 * 2. Panel de Metadatos de Red: URL pública y Puerto TCP con copia rápida y feedback visual.
 * 3. Barra de Control Operativo: Iniciar/Detener, Reiniciar, Sincronizar y Logs.
 * 4. Telemetría de Recursos: Rendimiento en vivo (CPU y RAM cgroups).
 * 5. Zona de Peligro: Acción destructiva aislada para prevenir clics accidentales.
 */
export default function InstanceDetailView({
  instance,
  section = 'all',
  actionLoading = null,
  onBack,
  onAction,
  onSync,
  onOpenLogs,
  onDestroy,
  formatDate,
  onChanged,
}) {
  if (!instance) return null;

  const sectionLabel = { overview: 'Resumen del sitio', settings: 'Configuración y respaldo', files: 'Archivos', activity: 'Actividad', releases: 'Publicaciones y disponibilidad', server: 'Servidor y rendimiento', danger: 'Eliminar proyecto' }[section];

  const isRunning = instance.status === 'running';

  const defaultFormatDate = (date) => {
    if (!date) return 'Fecha no disponible';
    try {
      return new Intl.DateTimeFormat('es-GT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(date));
    } catch {
      return String(date);
    }
  };

  const formattedDate = formatDate
    ? formatDate(instance.created_at)
    : defaultFormatDate(instance.created_at);

  return (
    <div className="detail-view-enter space-y-6">

      {/* =====================================================
          1. CABECERA DE NAVEGACIÓN Y CONTEXTO
      ====================================================== */}
      <header className="bg-white border border-[#dfe7e4] rounded-[22px] p-6 sm:p-7 shadow-[0_10px_32px_rgba(23,40,56,0.035)] relative overflow-hidden">
        {/* Acento lateral de marca */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-[4px] ${
            isRunning ? 'bg-brand-500' : 'bg-slate-300'
          }`}
        />

        {/* Botón de retorno a la vista principal y Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 shadow-sm transition duration-150 btn-tactile cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-navy-900 group-hover:-translate-x-0.5 transition-transform duration-150" />
            <span>Volver a proyectos</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <span>Mis sitios</span>
            <span>/</span>
            <span className="text-slate-600 font-semibold truncate max-w-[200px]">
              {sectionLabel || instance.name}
            </span>
          </div>
        </div>

        {/* Fila principal: Mascota, Nombre, Estado y Metadatos secundarios */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <ServerMascot
              status={instance.status}
              action={actionLoading}
              size="lg"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy-900 truncate">
                  {instance.name}
                </h1>
                <StatusBadge status={instance.status} size="md" />
              </div>

              {/* Metadatos secundarios de despliegue */}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Desplegado el {formattedDate}
                </span>

                <span className="hidden sm:inline text-slate-300">•</span>

                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Box className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Entorno: <span className="font-semibold text-slate-700">Web Estática</span>
                </span>
              </div>
            </div>
          </div>

          {/* Enlace directo a abrir sitio si está en ejecución */}
          {isRunning && instance.public_url && (
            <a
              href={instance.public_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-xs font-bold transition duration-150 btn-tactile shrink-0"
            >
              <span>Abrir sitio web</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </header>

      {['all', 'settings', 'files', 'activity'].includes(section) && <SiteManagementPanel key={`${instance.id}-${section}`} instance={instance} onChanged={onChanged} section={section === 'all' ? undefined : section} />}

      {/* =====================================================
          2. PANEL DE ENLACES Y CONECTIVIDAD
      ====================================================== */}
      {['all', 'overview'].includes(section) && (
      <section className="bg-white border border-[#dfe7e4] rounded-[20px] p-6 sm:p-7 shadow-[0_8px_28px_rgba(23,40,56,0.035)]">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-5">
          <div className="w-9 h-9 rounded-[10px] bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-navy-900 tracking-tight">
              Enlaces y Conectividad
            </h2>
            <p className="text-[11px] text-[#64748b]">
              Puntos de acceso público y puertos de conexión de tu sitio web
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bloque URL Pública */}
          <div className="p-4 rounded-[14px] bg-[#f8fbfa] border border-[#e1ebe6] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-[#94a3b8]">
                  URL Pública
                </span>
                {instance.public_url && (
                  <CopyButton
                    textToCopy={instance.public_url}
                    label="Copiar URL"
                    className="!py-1 !px-2 text-[11px]"
                  />
                )}
              </div>

              <div className="mt-2.5">
                {instance.public_url ? (
                  <a
                    href={instance.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-brand-700 hover:text-brand-600 font-mono break-all transition-colors group"
                  >
                    <span>{instance.public_url}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                ) : (
                  <span className="text-xs text-[#94a3b8]">
                    No disponible (sitio detenido)
                  </span>
                )}
              </div>
            </div>

            <p className="mt-3 text-[10px] text-slate-400 font-medium">
              Enlace directo al sitio web publicado
            </p>
          </div>

          {/* Bloque Puerto TCP */}
          <div className="p-4 rounded-[14px] bg-[#f8fbfa] border border-[#e1ebe6] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-[#94a3b8]">
                  Puerto Asignado
                </span>
                {instance.assigned_port && (
                  <CopyButton
                    textToCopy={String(instance.assigned_port)}
                    label="Copiar puerto"
                    className="!py-1 !px-2 text-[11px]"
                  />
                )}
              </div>

              <div className="mt-2.5 flex items-center gap-3">
                <span className="text-base font-mono font-bold text-navy-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                  {instance.assigned_port || '—'}
                </span>
                <span className="text-xs font-mono text-slate-500 font-medium">
                  Puerto público activo
                </span>
              </div>
            </div>

            <p className="mt-3 text-[10px] text-slate-400 font-medium">
              Asignación automática y dedicada para tu proyecto
            </p>
          </div>
        </div>
      </section>
      )}

      {/* =====================================================
          3. BARRA DE CONTROL OPERATIVO (ACCIONES PRIMARIAS)
      ====================================================== */}
      {['all', 'overview', 'server'].includes(section) && (
      <section className="bg-white border border-[#dfe7e4] rounded-[20px] p-6 sm:p-7 shadow-[0_8px_28px_rgba(23,40,56,0.035)]">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-5">
          <div className="w-9 h-9 rounded-[10px] bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-navy-900 tracking-tight">
              Gestión del Proyecto
            </h2>
            <p className="text-[11px] text-[#64748b]">
              Administra el estado en vivo y consulta el historial de actividad
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Botón Iniciar / Detener */}
          {isRunning ? (
            <LoadingButton
              variant="amber"
              icon={Square}
              loading={actionLoading === 'stop'}
              loadingText="Deteniendo..."
              disabled={Boolean(actionLoading)}
              onClick={() => onAction(instance.id, 'stop')}
              size="md"
            >
              Detener proyecto
            </LoadingButton>
          ) : (
            <LoadingButton
              variant="primary"
              icon={Play}
              loading={actionLoading === 'start'}
              loadingText="Iniciando..."
              disabled={Boolean(actionLoading)}
              onClick={() => onAction(instance.id, 'start')}
              size="md"
            >
              Iniciar proyecto
            </LoadingButton>
          )}

          {/* Botón Reiniciar */}
          <LoadingButton
            variant="secondary"
            icon={RotateCcw}
            loading={actionLoading === 'restart'}
            loadingText="Reiniciando..."
            disabled={Boolean(actionLoading)}
            onClick={() => onAction(instance.id, 'restart')}
            size="md"
          >
            Reiniciar
          </LoadingButton>

          {/* Botón Sincronizar logs / estado */}
          <LoadingButton
            variant="secondary"
            icon={RefreshCw}
            loading={actionLoading === 'sync'}
            loadingText="Sincronizando..."
            disabled={Boolean(actionLoading)}
            onClick={() => onSync(instance.id)}
            size="md"
          >
            Actualizar estado
          </LoadingButton>

          {/* Botón Ver Registros (Logs) */}
          <LoadingButton
            variant="navy"
            icon={Terminal}
            disabled={Boolean(actionLoading)}
            onClick={() => onOpenLogs(instance)}
            size="md"
          >
            Ver actividad (Logs)
          </LoadingButton>
        </div>

        {/* =====================================================
            4. TELEMETRÍA EN VIVO (MÉTRICAS)
        ====================================================== */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Métricas de Rendimiento
            </h3>
          </div>
          <InstanceMetricsCard
            instanceId={instance.id}
            isRunning={isRunning}
          />
        </div>
      </section>
      )}

      {section === 'overview' && <SiteToolsPanel key={`insights-${instance.id}`} instance={instance} insightsOnly />}

      {['all', 'releases'].includes(section) && <SiteToolsPanel key={instance.id} instance={instance} onChanged={onChanged} />}

      {/* =====================================================
          5. ZONA DE PELIGRO / ACCIÓN DESTRUCTIVA
      ====================================================== */}
      {['all', 'danger'].includes(section) && (
      <section className="bg-red-50/50 border border-red-200 rounded-[20px] p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-[12px] bg-red-100/70 border border-red-200 flex items-center justify-center text-red-600 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="max-w-[580px]">
              <h2 className="text-sm font-bold text-red-950">
                Zona de Peligro
              </h2>
              <p className="mt-1 text-xs text-red-800/80 leading-relaxed">
                Eliminar este proyecto detendrá el servicio y borrará de forma permanente todos sus archivos y configuraciones asociadas. Esta acción no se puede revertir.
              </p>
            </div>
          </div>

          <div className="shrink-0 self-start md:self-center">
            <LoadingButton
              variant="danger"
              icon={Trash2}
              loading={actionLoading === 'destroy'}
              loadingText="Eliminando..."
              disabled={Boolean(actionLoading)}
              onClick={() => onDestroy(instance)}
              size="md"
            >
              Eliminar proyecto
            </LoadingButton>
          </div>
        </div>
      </section>
      )}

    </div>
  );
}

