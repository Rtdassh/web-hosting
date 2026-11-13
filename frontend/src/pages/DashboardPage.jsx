import ModalLayer from '../components/ui/ModalLayer';
import { getApiErrorMessage } from '../services/apiErrors';
import { createPortal } from 'react-dom';
import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  Globe,
  LayoutDashboard,
  Plus,
  Rocket,
  Server,
  Box,
  Activity,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Loader2,
  Terminal,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  CircleCheck,
  PackageOpen,
  Sparkles,
  ArrowRight,
  FileArchive,
  Link2,
  Layers3,
  Zap,
  Search,
  Check,
  X,
  ChevronRight,
} from 'lucide-react';

import { instanceService } from '../services/api';

import InstanceLogsModal from '../components/instances/InstanceLogsModal';
import InstanceMetricsCard from '../components/instances/InstanceMetricsCard';
import AccountNavigation from '../components/layout/AccountNavigation';
import InstanceDetailView from '../components/instances/InstanceDetailView';
import SystemStatusModal from '../components/system/SystemStatusModal';
import { toast } from '../components/ui/Toast';
import CopyButton from '../components/ui/CopyButton';
import Skeleton, { SkeletonInstanceCard } from '../components/ui/Skeleton';
import StatusBadge from '../components/ui/StatusBadge';

import ServerMascot, {
  mascotDestroying,
} from '../components/mascot/ServerMascot';


export default function DashboardPage({
  onDeployClick,
  onNavigateAccount,
  accountRole,
  sidebarTarget,
  embedded = false,
  refreshKey,
  deployment,
  onDismissDeployment,
}) {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [selectedLogInstance, setSelectedLogInstance] = useState(null);
  const [destroyConfirmInstance, setDestroyConfirmInstance] = useState(null);
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState(null);
  const [siteSection, setSiteSection] = useState('overview');

  useEffect(() => {
    setSiteSection('overview');
  }, [selectedInstanceId]);

  useEffect(() => {
    if (deployment?.status === 'creating') {
      setSelectedInstanceId(null);
      setStatusFilter('all');
      setSearchQuery('');
    }
  }, [deployment?.status]);

  const selectedInstance =
    instances.find((inst) => inst.id === selectedInstanceId) || null;

  useEffect(() => {
    if (selectedInstanceId && !loading && !selectedInstance) {
      setSelectedInstanceId(null);
    }
  }, [
    instances,
    selectedInstanceId,
    loading,
    selectedInstance,
  ]);


  /* =========================================================
     DATA
  ========================================================= */

  const fetchInstances = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await instanceService.getInstances();
      setInstances(data);
    } catch (err) {
      console.error('Error al cargar instancias:', err);

      setError(
        getApiErrorMessage(
          err,
          'No fue posible cargar tus sitios.'
        )
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchInstances();
  }, [refreshKey]);


  /* =========================================================
     ACTIONS
  ========================================================= */

  const handleAction = async (id, action) => {
    setActionLoading((prev) => ({
      ...prev,
      [id]: action,
    }));

    try {
      await instanceService.triggerAction(id, action);
      await fetchInstances();

      const labels = {
        start: 'iniciado',
        stop: 'detenido',
        restart: 'reiniciado',
      };

      toast.success(
        `Proyecto ${labels[action] || 'actualizado'} correctamente.`
      );
    } catch (err) {
      const msg = getApiErrorMessage(
        err,
        'Error al ejecutar acción'
      );

      toast.error(
        `Error al ejecutar acción: ${msg}`
      );
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [id]: null,
      }));
    }
  };


  const handleSync = async (id) => {
    setActionLoading((prev) => ({
      ...prev,
      [id]: 'sync',
    }));

    try {
      await instanceService.syncStatus(id);
      await fetchInstances();

      toast.success(
        'Estado del proyecto actualizado.'
      );
    } catch (err) {
      const msg = getApiErrorMessage(
        err,
        'Error al sincronizar'
      );

      toast.error(
        `Error al sincronizar estado: ${msg}`
      );
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [id]: null,
      }));
    }
  };


  const handleDestroy = async (id) => {
    const targetName = destroyConfirmInstance?.name;

    setActionLoading((prev) => ({
      ...prev,
      [id]: 'destroy',
    }));

    try {
      await instanceService.destroyInstance(id);

      setDestroyConfirmInstance(null);

      if (selectedInstanceId === id) {
        setSelectedInstanceId(null);
      }

      await fetchInstances();

      toast.success(
        `Proyecto ${
          targetName ? `"${targetName}"` : ''
        } eliminado definitivamente.`
      );
    } catch (err) {
      const msg = getApiErrorMessage(
        err,
        'Error al eliminar'
      );

      toast.error(
        `No se pudo eliminar el proyecto: ${msg}`
      );
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [id]: null,
      }));
    }
  };


  /* =========================================================
     HELPERS
  ========================================================= */

  const formatDate = (date) => {
    if (!date) {
      return 'Fecha no disponible';
    }

    return new Intl.DateTimeFormat('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };


  const runningInstances = instances.filter(
    (instance) =>
      instance.status === 'running'
  ).length;

  const stoppedInstances =
    instances.length - runningInstances;

  const filteredInstances = instances.filter((inst) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'running'
          ? inst.status === 'running'
          : inst.status !== 'running';

    const query =
      searchQuery.trim().toLowerCase();

    const matchesSearch =
      !query ||
      inst.name?.toLowerCase().includes(query) ||
      String(inst.assigned_port || '').includes(query);

    return matchesStatus && matchesSearch;
  });


  /* =========================================================
     SIDEBAR
  ========================================================= */

  const siteNavigation = (
    <div className="space-y-5">

      <div className="space-y-6 pb-3">

        {selectedInstance && (
          <div className="border-t border-[#dfe7e4] pt-5">

            <label
              htmlFor="managed-site"
              className="mb-2 block px-3 text-[13px] font-bold uppercase tracking-[0.14em] text-slate-400"
            >
              Administrar sitio
            </label>

            <select
              id="managed-site"
              value={selectedInstanceId ?? ''}
              onChange={(event) =>
                setSelectedInstanceId(
                  instances.find(
                    (site) =>
                      String(site.id) ===
                      event.target.value
                  )?.id ?? null
                )
              }
              className="h-12 w-full rounded-xl border border-[#d6dfdb] bg-white px-3 text-[15px] font-semibold text-navy-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
            >
              <option value="">
                Todos mis proyectos
              </option>

              {instances.map((site) => (
                <option
                  key={site.id}
                  value={site.id}
                >
                  {site.name}
                </option>
              ))}
            </select>

            {selectedInstance && (
              <nav
                aria-label={`Administración de ${selectedInstance.name}`}
                className="mt-3 grid grid-cols-2 gap-1 lg:grid-cols-1"
              >
                {[
                  ['overview', 'Resumen del sitio'],
                  ['settings', 'Configuración y respaldo'],
                  ['files', 'Archivos'],
                  ['activity', 'Actividad'],
                  [
                    'releases',
                    'Publicaciones y disponibilidad',
                  ],
                  [
                    'server',
                    'Servidor y rendimiento',
                  ],
                  [
                    'danger',
                    'Eliminar proyecto',
                  ],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setSiteSection(id)
                    }
                    aria-current={
                      siteSection === id
                        ? 'page'
                        : undefined
                    }
                    className={`btn-tactile min-h-11 rounded-[10px] border px-3 py-2.5 text-left text-[14px] font-semibold transition focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      id === 'danger'
                        ? siteSection === id
                          ? 'border-red-300 bg-red-50 text-red-800'
                          : 'border-red-200 text-red-700 hover:bg-red-50'
                        : siteSection === id
                          ? 'border-brand-100 bg-brand-50 text-brand-700'
                          : 'border-transparent text-slate-500 hover:bg-white hover:text-navy-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            )}

          </div>
        )}

        <button
          type="button"
          onClick={() =>
            setIsSystemModalOpen(true)
          }
          className="flex w-full items-center gap-3 rounded-xl border border-[#dfe7e4] bg-white p-3.5 text-left text-[14px] font-semibold text-slate-600 hover:border-brand-200"
        >
          <Activity className="h-5 w-5 text-brand-600" />
          Estado de la plataforma
        </button>

      </div>

    </div>
  );


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="relative min-w-0 flex-1">

      <div className="relative z-10 mx-auto flex max-w-[1380px] flex-col lg:flex-row">

        {/* =====================================================
            SIDEBAR
        ====================================================== */}

        {sidebarTarget
          ? createPortal(
              siteNavigation,
              sidebarTarget
            )
          : !embedded && (
              <aside className="w-full shrink-0 px-5 pt-6 lg:w-[260px] lg:px-6 lg:py-8">

                <AccountNavigation
                  role={accountRole}
                  onNavigate={onNavigateAccount}
                />

                {siteNavigation}

              </aside>
            )}

        {/* =====================================================
            CONTENT
        ====================================================== */}

        <div className="min-w-0 flex-1 px-5 py-8 sm:px-6 lg:px-8 xl:px-10">

          {selectedInstance ? (
            <InstanceDetailView
              section={siteSection}
              instance={selectedInstance}
              onChanged={fetchInstances}
              actionLoading={
                actionLoading[
                  selectedInstance.id
                ]
              }
              onBack={() => {
                setSelectedInstanceId(null);

                window.scrollTo({
                  top: 0,
                  behavior: 'smooth',
                });
              }}
              onAction={handleAction}
              onSync={handleSync}
              onOpenLogs={(inst) =>
                setSelectedLogInstance(inst)
              }
              onDestroy={(inst) =>
                setDestroyConfirmInstance(inst)
              }
              formatDate={formatDate}
            />
          ) : (
            <div className="master-view-enter space-y-5">

              {/* =================================================
                  HERO
              ================================================== */}

              <section className="relative overflow-hidden rounded-[24px] border border-brand-100 bg-gradient-to-br from-white via-white to-brand-50 px-6 py-7 shadow-[0_12px_40px_rgba(23,40,56,0.04)] sm:px-8">

                <div
                  className="absolute inset-y-0 right-0 w-[42%] opacity-[0.035]"
                  style={{
                    backgroundImage:
                      'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
                    backgroundSize:
                      '24px 24px',
                  }}
                />

                <div className="absolute right-[5%] top-[-90px] h-[260px] w-[260px] rounded-full bg-brand-100/60 blur-[70px]" />

                <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

                  <div className="max-w-[650px]">

                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5">

                      <span className="h-2 w-2 rounded-full bg-brand-500" />

                      <span className="text-[12px] font-bold uppercase tracking-[0.13em] text-brand-700">
                        Workspace Codrop
                      </span>

                    </div>

                    <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.035em] text-navy-900 sm:text-[36px]">
                      Tus proyectos, listos para{' '}
                      <span className="text-brand-500">
                        despegar.
                      </span>
                    </h1>

                    <p className="mt-3 max-w-[560px] text-[16px] leading-7 text-[#64748b]">
                      Administra, monitorea y publica
                      tus sitios desde un solo lugar.
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-3">

                      <div className="inline-flex items-center gap-2 rounded-[9px] border border-[#dfe7e4] bg-white/80 px-3 py-2">

                        <FileArchive className="h-4 w-4 text-brand-600" />

                        <span className="text-[13px] font-semibold text-navy-900">
                          .zip
                        </span>

                        <ArrowRight className="h-4 w-4 text-[#94a3b8]" />

                        <span className="text-[13px] font-semibold text-brand-700">
                          URL pública
                        </span>

                      </div>

                      <div className="inline-flex items-center gap-2 text-[13px] font-medium text-[#789087]">

                        <Zap className="h-4 w-4 text-brand-500" />

                        Despliegue simple y rápido

                      </div>

                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={onDeployClick}
                    className="btn-tactile h-[50px] flex-shrink-0 cursor-pointer rounded-[11px] bg-brand-500 px-6 text-[15px] font-semibold text-white shadow-[0_12px_28px_rgba(40,181,134,0.22)] transition duration-150 hover:bg-brand-600 flex items-center justify-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Nuevo despliegue
                  </button>

                </div>

              </section>

              {/* =================================================
                  ERROR
              ================================================== */}

              {error && (
                <div className="mt-5 rounded-[12px] border border-red-200 bg-red-50 p-4 text-[14px] leading-6 text-red-700">

                  {error}

                  <button
                    type="button"
                    onClick={fetchInstances}
                    className="ml-2 font-semibold hover:underline"
                  >
                    Reintentar
                  </button>

                </div>
              )}

              {/* =================================================
                  STATS
              ================================================== */}

              <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

                <EnhancedStatCard
                  label="Sitios desplegados"
                  value={instances.length}
                  description="Proyectos registrados"
                  icon={Globe}
                />

                <EnhancedStatCard
                  label="Sitios activos"
                  value={runningInstances}
                  description="Ejecutándose ahora"
                  icon={Activity}
                  active
                />

                <EnhancedStatCard
                  label="Total proyectos"
                  value={instances.length}
                  description="Sitios en tu cuenta"
                  icon={Box}
                  className="sm:col-span-2 xl:col-span-1"
                />

              </section>

              {/* =================================================
                  PROJECTS
              ================================================== */}

              <section
                id="projects-section"
                className="mt-5 overflow-hidden rounded-[20px] border border-[#dfe7e4] bg-white shadow-[0_12px_38px_rgba(23,40,56,0.04)]"
              >

                {/* Header */}
                <div className="relative flex flex-col gap-4 border-b border-[#e8eeeb] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

                  <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-brand-500" />

                  <div>

                    <div className="flex items-center gap-2">

                      <h2 className="text-[21px] font-bold tracking-[-0.02em] text-navy-900">
                        Mis proyectos
                      </h2>

                      {instances.length > 0 && (
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700">
                          {instances.length}
                        </span>
                      )}

                    </div>

                    <p className="mt-1 text-[14px] leading-6 text-[#64748b]">
                      Sitios publicados y administrados
                      desde Codrop.
                    </p>

                  </div>

                  {instances.length > 0 && (
                    <button
                      type="button"
                      onClick={onDeployClick}
                      className="btn-tactile flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-brand-100 bg-brand-50 px-4 text-[14px] font-semibold text-brand-700 transition duration-150 hover:bg-brand-100"
                    >
                      <Plus className="h-4 w-4" />
                      Nuevo proyecto
                    </button>
                  )}

                </div>

                {/* Filters */}
                {instances.length > 0 && (
                  <div className="flex flex-col items-stretch justify-between gap-3 border-b border-[#e8eeeb] bg-[#fbfdfc] px-6 py-3 sm:flex-row sm:items-center">

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">

                      <button
                        type="button"
                        onClick={() =>
                          setStatusFilter('all')
                        }
                        className={`btn-tactile cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-[14px] font-bold transition duration-150 ${
                          statusFilter === 'all'
                            ? 'bg-navy-900 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Todos ({instances.length})
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setStatusFilter('running')
                        }
                        className={`btn-tactile cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-[14px] font-bold transition duration-150 ${
                          statusFilter ===
                          'running'
                            ? 'bg-brand-500 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        En ejecución ({runningInstances})
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setStatusFilter('stopped')
                        }
                        className={`btn-tactile cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-[14px] font-bold transition duration-150 ${
                          statusFilter ===
                          'stopped'
                            ? 'bg-slate-700 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Detenidos ({stoppedInstances})
                      </button>

                    </div>

                    <div className="relative min-w-[230px]">

                      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />

                      <input
                        type="text"
                        placeholder="Buscar por nombre o puerto..."
                        value={searchQuery}
                        onChange={(e) =>
                          setSearchQuery(
                            e.target.value
                          )
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 transition duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                      />

                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() =>
                            setSearchQuery('')
                          }
                          aria-label="Limpiar búsqueda"
                          className="absolute right-2 top-2.5 cursor-pointer rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}

                    </div>

                  </div>
                )}

                {/* Deployment */}
                {deployment && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="m-5 rounded-2xl border border-brand-100 bg-brand-50/60 p-5"
                  >

                    <div className="flex items-center gap-3">

                      {deployment.status ===
                        'creating' && (
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-600" />
                      )}

                      <div className="min-w-0">

                        <h3 className="truncate text-[16px] font-bold text-navy-900">
                          {deployment.name}
                        </h3>

                        <p className="mt-1 text-[14px] leading-6 text-slate-600">
                          {deployment.status ===
                          'creating'
                            ? 'Creando tu sitio. Estamos enviando y validando los archivos y preparando el servidor.'
                            : deployment.message}
                        </p>

                      </div>

                    </div>

                    {deployment.status ===
                    'creating' ? (
                      <div
                        role="progressbar"
                        aria-label="Creación del sitio en curso"
                        className="mt-4 h-2 overflow-hidden rounded-full bg-brand-100"
                      >
                        <div className="h-full w-full animate-pulse rounded-full bg-brand-500 motion-reduce:animate-none" />
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-4 text-[14px] font-bold">

                        <button
                          type="button"
                          onClick={onDeployClick}
                          className="text-brand-700"
                        >
                          Revisar y volver a intentar
                        </button>

                        <button
                          type="button"
                          onClick={
                            onDismissDeployment
                          }
                          className="text-slate-600"
                        >
                          Descartar aviso
                        </button>

                      </div>
                    )}

                    {deployment.status ===
                      'creating' && (
                      <p className="mt-2 text-[13px] leading-5 text-slate-500">
                        Puedes explorar el dashboard.
                        Mantén esta pestaña abierta
                        hasta recibir la confirmación.
                      </p>
                    )}

                  </div>
                )}

                {/* Content states */}
                {loading ? (
                  <div className="divide-y divide-[#edf1ef]">

                    <SkeletonInstanceCard />
                    <SkeletonInstanceCard />

                  </div>
                ) : instances.length === 0 &&
                  deployment?.status ===
                    'creating' ? null
                : instances.length === 0 ? (
                  <div className="scale-pop-in px-6 py-14 text-center">

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[18px] border border-brand-100 bg-brand-50 shadow-sm">

                      <PackageOpen className="h-7 w-7 text-brand-600" />

                    </div>

                    <h3 className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-navy-900">
                      Tu primer proyecto empieza aquí
                    </h3>

                    <p className="mx-auto mt-2 max-w-[500px] text-[15px] leading-7 text-[#64748b]">

                      Empaqueta tu sitio en un archivo{' '}

                      <code className="font-semibold text-navy-900">
                        .zip
                      </code>{' '}

                      con un{' '}

                      <code className="font-semibold text-navy-900">
                        index.html
                      </code>{' '}

                      y Codrop lo convertirá en una URL
                      pública.

                    </p>

                    <button
                      type="button"
                      onClick={onDeployClick}
                      className="btn-tactile mt-6 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[9px] bg-brand-500 px-5 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(40,181,134,0.18)] transition-colors hover:bg-brand-600"
                    >
                      <Rocket className="h-5 w-5" />
                      Desplegar mi primer sitio
                    </button>

                  </div>
                ) : filteredInstances.length ===
                  0 ? (
                  <div className="scale-pop-in px-6 py-12 text-center">

                    <p className="text-[15px] font-semibold text-slate-700">
                      No hay proyectos que coincidan
                      con los filtros aplicados.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('all');
                        setSearchQuery('');
                      }}
                      className="btn-tactile mt-3 cursor-pointer text-[14px] font-bold text-brand-600 hover:underline"
                    >
                      Restablecer filtros
                    </button>

                  </div>
                ) : (
                  <div className="divide-y divide-[#edf1ef]">

                    {filteredInstances.map(
                      (inst) => (
                        <article
                          key={inst.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedInstanceId(
                              inst.id
                            );

                            window.scrollTo({
                              top: 0,
                              behavior: 'smooth',
                            });
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === 'Enter' ||
                              e.key === ' '
                            ) {
                              e.preventDefault();

                              setSelectedInstanceId(
                                inst.id
                              );

                              window.scrollTo({
                                top: 0,
                                behavior:
                                  'smooth',
                              });
                            }
                          }}
                          className={`btn-tactile group relative cursor-pointer select-none px-5 transition-colors duration-150 hover:bg-[#fbfdfc] focus:bg-brand-50/20 focus:outline-none sm:px-6 ${
                            localStorage.getItem(
                              'codrop_compact_projects'
                            ) === 'true'
                              ? 'py-3'
                              : 'py-4'
                          }`}
                        >

                          <div className="absolute inset-y-3 left-0 w-[2.5px] rounded-r-full bg-transparent transition-colors duration-150 group-hover:bg-brand-500" />

                          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                            {/* Nombre */}
                            <div className="flex min-w-0 items-center gap-3.5 sm:w-[30%]">

                              <ServerMascot
                                status={inst.status}
                                action={
                                  actionLoading[
                                    inst.id
                                  ]
                                }
                                size="md"
                              />

                              <div className="min-w-0">

                                <h3 className="truncate text-[15px] font-bold text-navy-900 transition-colors duration-150 group-hover:text-brand-700 sm:text-[16px]">
                                  {inst.name}
                                </h3>

                              </div>

                            </div>

                            {/* Estado */}
                            <div className="shrink-0 sm:w-[15%]">
                              <StatusBadge
                                status={inst.status}
                                size="sm"
                              />
                            </div>

                            {/* Puerto */}
                            <div className="shrink-0 sm:w-[14%]">

                              <span className="inline-block rounded-md border border-slate-200/80 bg-slate-100/90 px-2.5 py-1.5 font-mono text-[13px] font-bold text-navy-900">
                                {inst.assigned_port ||
                                  '—'}
                              </span>

                            </div>

                            {/* URL */}
                            <div className="min-w-0 flex-1">

                              {inst.public_url ? (
                                <div className="flex flex-wrap items-center gap-2">

                                  <a
                                    href={
                                      inst.public_url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) =>
                                      e.stopPropagation()
                                    }
                                    className="group/link inline-flex max-w-full items-center gap-1.5 truncate text-[14px] font-medium text-brand-700 transition-colors hover:text-brand-600"
                                    title="Abrir sitio web en nueva pestaña"
                                  >
                                    <span className="truncate">
                                      {
                                        inst.public_url
                                      }
                                    </span>

                                    <ArrowUpRight className="h-4 w-4 flex-shrink-0 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                                  </a>

                                  <div
                                    onClick={(e) =>
                                      e.stopPropagation()
                                    }
                                  >
                                    <CopyButton
                                      textToCopy={
                                        inst.public_url
                                      }
                                      iconOnly
                                      title="Copiar URL pública"
                                      className="!px-1.5 !py-0.5 text-[12px]"
                                    />
                                  </div>

                                </div>
                              ) : (
                                <span className="text-[14px] text-[#94a3b8]">
                                  No disponible
                                </span>
                              )}

                            </div>

                            {/* Detalle */}
                            <div className="flex shrink-0 items-center gap-1.5 self-end text-[#94a3b8] transition-colors duration-150 group-hover:text-brand-600 sm:self-center">

                              <span className="hidden text-[13px] font-semibold xl:inline">
                                Ver detalle
                              </span>

                              <ChevronRight className="h-5 w-5 transition-transform duration-150 group-hover:translate-x-0.5" />

                            </div>

                          </div>

                        </article>
                      )
                    )}

                  </div>
                )}

              </section>

            </div>
          )}

        </div>

      </div>

      {/* =====================================================
          LOGS
      ====================================================== */}

      {selectedLogInstance && (
        <InstanceLogsModal
          instance={selectedLogInstance}
          onClose={() =>
            setSelectedLogInstance(null)
          }
        />
      )}

      {/* =====================================================
          DESTROY MODAL
      ====================================================== */}

      {destroyConfirmInstance && (
        <ModalLayer className="p-4">

          <div
            className="modal-backdrop-animate absolute inset-0 bg-transparent"
            onClick={() =>
              setDestroyConfirmInstance(null)
            }
          />

          <div className="modal-dialog-animate relative w-full max-w-[470px] rounded-[22px] border border-red-200 bg-white p-7 shadow-[0_30px_80px_rgba(23,40,56,0.2)]">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[16px] border border-red-100 bg-red-50 p-1">

                <img
                  src={mascotDestroying}
                  alt="Cocodrilo fuera de servicio"
                  className="h-full w-full select-none object-contain"
                />

              </div>

              <div>

                <h3 className="text-[19px] font-bold text-navy-900">
                  ¿Eliminar proyecto definitivamente?
                </h3>

                <p className="mt-1 text-[12px] font-semibold uppercase leading-5 tracking-[0.08em] text-red-500">
                  Acción irreversible • Esta operación
                  no se puede deshacer
                </p>

              </div>

            </div>

            <p className="mt-5 text-[15px] leading-7 text-[#64748b]">

              Estás a punto de eliminar{' '}

              <strong className="font-semibold text-navy-900">
                {destroyConfirmInstance.name}
              </strong>.

              {' '}Esta acción detendrá el sitio web y
              eliminará de forma permanente todos sus
              archivos y configuraciones asociadas.

            </p>

            <div className="mt-7 flex items-center justify-end gap-3">

              <button
                type="button"
                disabled={Boolean(
                  actionLoading[
                    destroyConfirmInstance.id
                  ]
                )}
                onClick={() =>
                  setDestroyConfirmInstance(null)
                }
                className="btn-tactile h-11 cursor-pointer rounded-[9px] px-4 text-[14px] font-semibold text-[#64748b] transition duration-150 hover:bg-[#f5f8f7]"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={Boolean(
                  actionLoading[
                    destroyConfirmInstance.id
                  ]
                )}
                onClick={() =>
                  handleDestroy(
                    destroyConfirmInstance.id
                  )
                }
                className="btn-tactile flex h-11 cursor-pointer items-center gap-2 rounded-[9px] bg-red-600 px-4 text-[14px] font-semibold text-white transition duration-150 hover:bg-red-700 disabled:opacity-50"
              >

                {actionLoading[
                  destroyConfirmInstance.id
                ] === 'destroy' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}

                Eliminar proyecto

              </button>

            </div>

          </div>

        </ModalLayer>
      )}

      {/* Modal de Telemetría */}
      <SystemStatusModal
        isOpen={isSystemModalOpen}
        onClose={() =>
          setIsSystemModalOpen(false)
        }
        instances={instances}
      />

    </main>
  );
}


/* =========================================================
   STAT CARD
========================================================= */

function EnhancedStatCard({
  label,
  value,
  description,
  icon: Icon,
  active = false,
  className = '',
}) {
  return (
    <article
      className={`
        relative
        overflow-hidden
        bg-white
        border
        border-[#dfe7e4]
        rounded-[18px]
        p-5
        shadow-[0_8px_28px_rgba(23,40,56,0.035)]
        group
        ${className}
      `}
    >

      <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-brand-500 via-brand-100 to-transparent opacity-70" />

      <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-brand-50 opacity-70 transition-transform group-hover:scale-110" />

      <div className="relative z-10">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-[14px] font-medium text-[#64748b]">
              {label}
            </p>

            <p className="mt-2 text-[31px] font-bold leading-none tracking-[-0.035em] text-navy-900">
              {value}
            </p>

          </div>

          <div
            className={`
              w-11
              h-11
              rounded-[12px]
              flex
              items-center
              justify-center
              ${
                active
                  ? 'bg-brand-500 text-white shadow-[0_10px_20px_rgba(40,181,134,0.2)]'
                  : 'bg-brand-50 border border-brand-100 text-brand-600'
              }
            `}
          >
            <Icon className="h-5 w-5" />
          </div>

        </div>

        <div className="mt-5 flex items-center justify-between">

          <div className="flex items-center gap-1.5">

            {active && (
              <CircleCheck className="h-4 w-4 text-brand-500" />
            )}

            <p
              className={`
                text-[13px]
                ${
                  active
                    ? 'text-brand-700 font-medium'
                    : 'text-[#94a3b8]'
                }
              `}
            >
              {description}
            </p>

          </div>

          <Layers3 className="h-4 w-4 text-brand-100" />

        </div>

      </div>

    </article>
  );
}