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

import codropIsotipo from '../assets/codrop-isotipo.png';
import ServerMascot, { mascotDestroying } from '../components/mascot/ServerMascot';


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
  useEffect(() => { setSiteSection('overview'); }, [selectedInstanceId]);

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
  }, [instances, selectedInstanceId, loading, selectedInstance]);


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
        getApiErrorMessage(err, 'No fue posible cargar tus sitios.')
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
      toast.success(`Proyecto ${labels[action] || 'actualizado'} correctamente.`);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Error al ejecutar acción');
      toast.error(`Error al ejecutar acción: ${msg}`);
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
      toast.success('Estado del proyecto actualizado.');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Error al sincronizar');
      toast.error(`Error al sincronizar estado: ${msg}`);
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
      toast.success(`Proyecto ${targetName ? `"${targetName}"` : ''} eliminado definitivamente.`);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Error al eliminar');
      toast.error(`No se pudo eliminar el proyecto: ${msg}`);
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
    (instance) => instance.status === 'running'
  ).length;

  const stoppedInstances = instances.length - runningInstances;

  const filteredInstances = instances.filter((inst) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'running'
          ? inst.status === 'running'
          : inst.status !== 'running';
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      inst.name?.toLowerCase().includes(query) ||
      String(inst.assigned_port || '').includes(query);
    return matchesStatus && matchesSearch;
  });


  /* =========================================================
     RENDER
  ========================================================= */

  const siteNavigation = (
        <div className="space-y-5">
          <div className="space-y-6 pb-3">
            {selectedInstance && <div className="border-t border-[#dfe7e4] pt-5">
              <label htmlFor="managed-site" className="mb-2 block px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Administrar sitio</label>
              <select id="managed-site" value={selectedInstanceId ?? ''} onChange={(event) => setSelectedInstanceId(instances.find((site) => String(site.id) === event.target.value)?.id ?? null)} className="h-11 w-full rounded-xl border border-[#d6dfdb] bg-white px-3 text-xs font-semibold text-navy-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10">
                <option value="">Todos mis proyectos</option>
                {instances.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
              {selectedInstance && <nav aria-label={`Administración de ${selectedInstance.name}`} className="mt-3 grid grid-cols-2 gap-1 lg:grid-cols-1">
                {[['overview', 'Resumen del sitio'], ['settings', 'Configuración y respaldo'], ['files', 'Archivos'], ['activity', 'Actividad'], ['releases', 'Publicaciones y disponibilidad'], ['server', 'Servidor y rendimiento'], ['danger', 'Eliminar proyecto']].map(([id, label]) => <button key={id} type="button" onClick={() => setSiteSection(id)} aria-current={siteSection === id ? 'page' : undefined} className={`min-h-10 rounded-[10px] border px-3 py-2 text-left text-xs font-semibold transition btn-tactile focus-visible:ring-2 focus-visible:ring-brand-500 ${id === 'danger' ? (siteSection === id ? 'border-red-300 bg-red-50 text-red-800' : 'border-red-200 text-red-700 hover:bg-red-50') : siteSection === id ? 'border-brand-100 bg-brand-50 text-brand-700' : 'border-transparent text-slate-500 hover:bg-white hover:text-navy-900'}`}>{label}</button>)}
              </nav>}
            </div>}
            <button type="button" onClick={() => setIsSystemModalOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-[#dfe7e4] bg-white p-3 text-left text-xs font-semibold text-slate-600 hover:border-brand-200"><Activity className="h-4 w-4 text-brand-600" />Estado de la plataforma</button>
          </div>
        </div>

  );

  return (
    <main className="min-w-0 flex-1 relative">

      <div className="relative z-10 max-w-[1380px] mx-auto flex flex-col lg:flex-row">


        {/* =====================================================
            SIDEBAR
        ====================================================== */}
        {sidebarTarget ? createPortal(siteNavigation, sidebarTarget) : !embedded && <aside className="w-full shrink-0 px-5 pt-6 lg:w-[260px] lg:px-6 lg:py-8"><AccountNavigation role={accountRole} onNavigate={onNavigateAccount} />{siteNavigation}</aside>}
        {/* =====================================================
            CONTENT
        ====================================================== */}
        <div className="flex-1 min-w-0 px-5 sm:px-6 lg:px-8 xl:px-10 py-8">

          {selectedInstance ? (
            <InstanceDetailView
              section={siteSection}
              instance={selectedInstance}
              onChanged={fetchInstances}
              actionLoading={actionLoading[selectedInstance.id]}
              onBack={() => {
                setSelectedInstanceId(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onAction={handleAction}
              onSync={handleSync}
              onOpenLogs={(inst) => setSelectedLogInstance(inst)}
              onDestroy={(inst) => setDestroyConfirmInstance(inst)}
              formatDate={formatDate}
            />
          ) : (
            <div className="master-view-enter space-y-5">

              {/* =================================================
                  HERO
              ================================================== */}
              <section className="relative overflow-hidden rounded-[24px] border border-brand-100 bg-gradient-to-br from-white via-white to-brand-50 px-6 sm:px-8 py-7 shadow-[0_12px_40px_rgba(23,40,56,0.04)]">

            {/* Grid */}
            <div
              className="absolute inset-y-0 right-0 w-[42%] opacity-[0.035]"
              style={{
                backgroundImage:
                  'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />


            {/* Glow */}
            <div className="absolute top-[-90px] right-[5%] w-[260px] h-[260px] rounded-full bg-brand-100/60 blur-[70px]" />


            {/* Mascota */}
            <img
              src={codropIsotipo}
              alt=""
              aria-hidden="true"
              className="absolute right-[35px] bottom-[-22px] w-[220px] opacity-[0.11] hidden xl:block"
            />


            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">

              <div className="max-w-[650px]">

                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-100">

                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />

                  <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-brand-700">
                    Workspace Codrop
                  </span>

                </div>


                <h1 className="mt-3 text-[30px] sm:text-[34px] leading-[1.1] font-bold tracking-[-0.035em] text-navy-900">
                  Tus proyectos, listos para{' '}
                  <span className="text-brand-500">
                    despegar.
                  </span>
                </h1>


                <p className="mt-2 text-[13px] leading-6 text-[#64748b] max-w-[560px]">
                  Administra, monitorea y publica tus sitios desde un solo lugar.
                </p>


                <div className="mt-5 flex flex-wrap items-center gap-3">

                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-[9px] bg-white/80 border border-[#dfe7e4]">

                    <FileArchive className="w-3.5 h-3.5 text-brand-600" />

                    <span className="text-[10px] font-semibold text-navy-900">
                      .zip
                    </span>

                    <ArrowRight className="w-3 h-3 text-[#94a3b8]" />

                    <span className="text-[10px] font-semibold text-brand-700">
                      URL pública
                    </span>

                  </div>


                  <div className="inline-flex items-center gap-2 text-[10px] text-[#789087]">

                    <Zap className="w-3.5 h-3.5 text-brand-500" />

                    Despliegue simple y rápido

                  </div>

                </div>

              </div>


              <button
                type="button"
                onClick={onDeployClick}
                className="h-[46px] px-5 rounded-[11px] bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_12px_28px_rgba(40,181,134,0.22)] transition duration-150 btn-tactile cursor-pointer flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                Nuevo despliegue
              </button>

            </div>

          </section>


          {/* =================================================
              ERROR
          ================================================== */}
          {error && (
            <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-[12px] text-[12px] text-red-700">

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
          <section className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

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
          <section id="projects-section" className="mt-5 bg-white border border-[#dfe7e4] rounded-[20px] shadow-[0_12px_38px_rgba(23,40,56,0.04)] overflow-hidden">


            {/* Header */}
            <div className="relative px-6 py-5 border-b border-[#e8eeeb] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-500" />


              <div>

                <div className="flex items-center gap-2">

                  <h2 className="text-[18px] font-bold tracking-[-0.02em] text-navy-900">
                    Mis proyectos
                  </h2>


                  {instances.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-semibold">
                      {instances.length}
                    </span>
                  )}

                </div>


                <p className="mt-1 text-[11px] text-[#64748b]">
                  Sitios publicados y administrados desde Codrop.
                </p>

              </div>


              {instances.length > 0 && (
                <button
                  type="button"
                  onClick={onDeployClick}
                  className="h-9 px-4 rounded-[9px] bg-brand-50 hover:bg-brand-100 border border-brand-100 text-brand-700 text-[12px] font-semibold flex items-center justify-center gap-2 transition duration-150 btn-tactile cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nuevo proyecto
                </button>
              )}

            </div>

            {/* Filters & Search Toolbar */}
            {instances.length > 0 && (
              <div className="px-6 py-3 bg-[#fbfdfc] border-b border-[#e8eeeb] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 btn-tactile whitespace-nowrap cursor-pointer ${statusFilter === 'all'
                        ? 'bg-navy-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    Todos ({instances.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('running')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 btn-tactile whitespace-nowrap cursor-pointer ${statusFilter === 'running'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    En ejecución ({runningInstances})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('stopped')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 btn-tactile whitespace-nowrap cursor-pointer ${statusFilter === 'stopped'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    Detenidos ({stoppedInstances})
                  </button>
                </div>

                <div className="relative min-w-[210px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o puerto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-7 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 font-medium transition duration-150"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpiar búsqueda"
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}


            {/* CONTENT STATES */}
            {deployment && (
              <div role="status" aria-live="polite" className="m-5 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
                <div className="flex items-center gap-3">
                  {deployment.status === 'creating' && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-600" />}
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-navy-900">{deployment.name}</h3>
                    <p className="mt-1 text-xs text-slate-600">
                      {deployment.status === 'creating' ? 'Creando tu sitio. Estamos enviando y validando los archivos y preparando el servidor.' : deployment.message}
                    </p>
                  </div>
                </div>
                {deployment.status === 'creating' ? (
                  <div role="progressbar" aria-label="Creación del sitio en curso" className="mt-4 h-2 overflow-hidden rounded-full bg-brand-100">
                    <div className="h-full w-full animate-pulse rounded-full bg-brand-500 motion-reduce:animate-none" />
                  </div>
                ) : (
                  <div className="mt-3 flex gap-4 text-xs font-bold">
                    <button type="button" onClick={onDeployClick} className="text-brand-700">Revisar y volver a intentar</button>
                    <button type="button" onClick={onDismissDeployment} className="text-slate-600">Descartar aviso</button>
                  </div>
                )}
                {deployment.status === 'creating' && <p className="mt-2 text-xs text-slate-500">Puedes explorar el dashboard. Mantén esta pestaña abierta hasta recibir la confirmación.</p>}
              </div>
            )}
            {loading ? (
              <div className="divide-y divide-[#edf1ef]">
                <SkeletonInstanceCard />
                <SkeletonInstanceCard />
              </div>
            ) : instances.length === 0 && deployment?.status === 'creating' ? null : instances.length === 0 ? (

              <div className="px-6 py-14 text-center scale-pop-in">

                <div className="w-16 h-16 mx-auto rounded-[18px] bg-brand-50 border border-brand-100 flex items-center justify-center shadow-sm">
                  <PackageOpen className="w-7 h-7 text-brand-600" />
                </div>


                <h3 className="mt-5 text-[20px] font-bold tracking-[-0.02em] text-navy-900">
                  Tu primer proyecto empieza aquí
                </h3>


                <p className="mt-2 max-w-[470px] mx-auto text-[12px] leading-6 text-[#64748b]">
                  Empaqueta tu sitio en un archivo{' '}
                  <code className="font-semibold text-navy-900">
                    .zip
                  </code>{' '}
                  con un{' '}
                  <code className="font-semibold text-navy-900">
                    index.html
                  </code>{' '}
                  y Codrop lo convertirá en una URL pública.
                </p>


                <button
                  type="button"
                  onClick={onDeployClick}
                  className="mt-6 h-10 px-5 rounded-[9px] bg-brand-500 hover:bg-brand-600 text-white text-[12px] font-semibold inline-flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(40,181,134,0.18)] transition-colors btn-tactile cursor-pointer"
                >
                  <Rocket className="w-4 h-4" />
                  Desplegar mi primer sitio
                </button>

              </div>

            ) : filteredInstances.length === 0 ? (

              <div className="py-12 px-6 text-center scale-pop-in">
                <p className="text-xs font-semibold text-slate-700">
                  No hay proyectos que coincidan con los filtros aplicados.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="mt-3 text-xs font-bold text-brand-600 hover:underline cursor-pointer btn-tactile"
                >
                  Restablecer filtros
                </button>
              </div>

            ) : (

              <div className="divide-y divide-[#edf1ef]">

                {filteredInstances.map((inst) => {

                  return (
                    <article
                      key={inst.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedInstanceId(inst.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedInstanceId(inst.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className={`group px-5 sm:px-6 ${localStorage.getItem('codrop_compact_projects') === 'true' ? 'py-2' : 'py-4'} hover:bg-[#fbfdfc] transition-colors duration-150 relative cursor-pointer btn-tactile focus:outline-none focus:bg-brand-50/20 select-none`}
                    >

                      <div className="absolute inset-y-3 left-0 w-[2.5px] rounded-r-full bg-transparent group-hover:bg-brand-500 transition-colors duration-150" />

                      {/* Main row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                        {/* 1. Nombre del proyecto (jerarquía primaria) */}
                        <div className="flex items-center gap-3.5 sm:w-[30%] min-w-0">
                          <ServerMascot
                            status={inst.status}
                            action={actionLoading[inst.id]}
                            size="md"
                          />

                          <div className="min-w-0">
                            <h3 className="text-[13px] sm:text-sm font-bold text-navy-900 group-hover:text-brand-700 transition-colors duration-150 truncate">
                              {inst.name}
                            </h3>
                          </div>
                        </div>

                        {/* 2. Indicador visual de estado discreto */}
                        <div className="sm:w-[15%] shrink-0">
                          <StatusBadge status={inst.status} size="sm" />
                        </div>

                        {/* 3. Puerto asignado (formato monoespaciado) */}
                        <div className="sm:w-[14%] shrink-0">
                          <span className="text-[11px] font-mono font-bold text-navy-900 bg-slate-100/90 px-2.5 py-1 rounded-md border border-slate-200/80 inline-block">
                            {inst.assigned_port || '—'}
                          </span>
                        </div>

                        {/* 4. URL pública (con acción rápida de copiar o abrir en pestaña sin disparar detalle) */}
                        <div className="flex-1 min-w-0">
                          {inst.public_url ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <a
                                href={inst.public_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-600 transition-colors truncate group/link"
                                title="Abrir sitio web en nueva pestaña"
                              >
                                <span className="truncate">
                                  {inst.public_url}
                                </span>
                                <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                              </a>

                              <div onClick={(e) => e.stopPropagation()}>
                                <CopyButton
                                  textToCopy={inst.public_url}
                                  iconOnly
                                  title="Copiar URL pública"
                                  className="!py-0.5 !px-1.5 text-[10px]"
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[#94a3b8]">
                              No disponible
                            </span>
                          )}
                        </div>

                        {/* Indicador de divulgación interactiva hacia detalle */}
                        <div className="flex items-center gap-1.5 text-[#94a3b8] group-hover:text-brand-600 transition-colors duration-150 shrink-0 self-end sm:self-center">
                          <span className="text-[11px] font-semibold hidden xl:inline">Ver detalle</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
                        </div>

                      </div>

                    </article>
                  );
                })}

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
          onClose={() => setSelectedLogInstance(null)}
        />
      )}


      {/* =====================================================
          DESTROY MODAL
      ====================================================== */}
      {destroyConfirmInstance && (

        <ModalLayer className="p-4">

          <div
            className="absolute inset-0 bg-transparent modal-backdrop-animate"
            onClick={() => setDestroyConfirmInstance(null)}
          />


          <div className="relative bg-white rounded-[22px] border border-red-200 max-w-[470px] w-full p-7 shadow-[0_30px_80px_rgba(23,40,56,0.2)] modal-dialog-animate">


            <div className="flex items-center gap-4">

              <div className="w-14 h-14 rounded-[16px] bg-red-50 border border-red-100 p-1 flex items-center justify-center flex-shrink-0">
                <img
                  src={mascotDestroying}
                  alt="Cocodrilo fuera de servicio"
                  className="w-full h-full object-contain select-none"
                />
              </div>

              <div>

                <h3 className="font-bold text-[16px] text-navy-900">
                  ¿Eliminar proyecto definitivamente?
                </h3>

                <p className="mt-0.5 text-[10px] text-red-500 font-semibold uppercase tracking-[0.08em]">
                  Acción irreversible • Esta operación no se puede deshacer
                </p>

              </div>

            </div>


            <p className="mt-5 text-[12px] text-[#64748b] leading-6">

              Estás a punto de eliminar{' '}

              <strong className="text-navy-900 font-semibold">
                {destroyConfirmInstance.name}
              </strong>.

              {' '}Esta acción detendrá el sitio web y eliminará de forma permanente todos sus archivos y configuraciones asociadas.

            </p>


            <div className="mt-7 flex items-center justify-end gap-3">

              <button
                type="button"
                disabled={Boolean(
                  actionLoading[destroyConfirmInstance.id]
                )}
                onClick={() => setDestroyConfirmInstance(null)}
                className="h-10 px-4 rounded-[9px] text-[12px] font-semibold text-[#64748b] hover:bg-[#f5f8f7] transition duration-150 btn-tactile cursor-pointer"
              >
                Cancelar
              </button>


              <button
                type="button"
                disabled={Boolean(
                  actionLoading[destroyConfirmInstance.id]
                )}
                onClick={() =>
                  handleDestroy(destroyConfirmInstance.id)
                }
                className="h-10 px-4 rounded-[9px] text-[12px] font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition duration-150 btn-tactile cursor-pointer disabled:opacity-50"
              >

                {actionLoading[destroyConfirmInstance.id] === 'destroy' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}

                Eliminar proyecto

              </button>

            </div>

          </div>

        </ModalLayer>
      )}

      {/* Modal de Telemetría e Infraestructura de Sistema */}
      <SystemStatusModal
        isOpen={isSystemModalOpen}
        onClose={() => setIsSystemModalOpen(false)}
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

      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-500 via-brand-100 to-transparent opacity-70" />


      <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-brand-50 opacity-70 group-hover:scale-110 transition-transform" />


      <div className="relative z-10">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-[11px] font-medium text-[#64748b]">
              {label}
            </p>


            <p className="mt-2 text-[29px] leading-none font-bold tracking-[-0.035em] text-navy-900">
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
              ${active
                ? 'bg-brand-500 text-white shadow-[0_10px_20px_rgba(40,181,134,0.2)]'
                : 'bg-brand-50 border border-brand-100 text-brand-600'
              }
            `}
          >
            <Icon className="w-5 h-5" />
          </div>

        </div>


        <div className="mt-5 flex items-center justify-between">

          <div className="flex items-center gap-1.5">

            {active && (
              <CircleCheck className="w-3.5 h-3.5 text-brand-500" />
            )}

            <p
              className={`
                text-[10px]
                ${active
                  ? 'text-brand-700 font-medium'
                  : 'text-[#94a3b8]'
                }
              `}
            >
              {description}
            </p>

          </div>


          <Layers3 className="w-3.5 h-3.5 text-brand-100" />

        </div>

      </div>

    </article>
  );
}
