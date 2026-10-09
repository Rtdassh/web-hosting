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
} from 'lucide-react';

import { instanceService } from '../services/api';

import InstanceLogsModal from '../components/instances/InstanceLogsModal';
import InstanceMetricsCard from '../components/instances/InstanceMetricsCard';

import codropIsotipo from '../assets/codrop-isotipo.png';


export default function DashboardPage({
  onDeployClick,
  refreshKey,
}) {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [selectedLogInstance, setSelectedLogInstance] = useState(null);
  const [destroyConfirmInstance, setDestroyConfirmInstance] = useState(null);


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
        err.response?.data?.detail ||
        'No fue posible cargar tus sitios.'
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
    } catch (err) {
      alert(
        'Error al ejecutar acción: ' +
        (err.response?.data?.detail || err.message)
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
    } catch (err) {
      alert(
        'Error al sincronizar estado: ' +
        (err.response?.data?.detail || err.message)
      );
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [id]: null,
      }));
    }
  };


  const handleDestroy = async (id) => {
    setActionLoading((prev) => ({
      ...prev,
      [id]: 'destroy',
    }));

    try {
      await instanceService.destroyInstance(id);

      setDestroyConfirmInstance(null);

      await fetchInstances();
    } catch (err) {
      alert(
        'Error al eliminar instancia: ' +
        (err.response?.data?.detail || err.message)
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
    (instance) => instance.status === 'running'
  ).length;


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="flex-1 bg-[#f5f9f7] relative overflow-hidden">

      {/* Fondo sutil */}
      <div className="absolute inset-0 pointer-events-none">

        <div className="absolute top-[40px] right-[-120px] w-[360px] h-[360px] rounded-full bg-brand-100/30 blur-[110px]" />

        <div className="absolute bottom-[-140px] left-[20%] w-[420px] h-[420px] rounded-full bg-brand-50 blur-[120px]" />

      </div>


      <div className="relative z-10 max-w-[1380px] mx-auto flex">


        {/* =====================================================
            SIDEBAR
        ====================================================== */}
        <aside className="hidden lg:block w-[235px] flex-shrink-0 px-6 py-8">

          <div className="sticky top-[106px]">

            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
              Workspace
            </p>


            <nav className="mt-3 space-y-1.5">

              <div className="h-10 px-3 rounded-[10px] bg-brand-50 border border-brand-100 text-brand-700 flex items-center gap-3 text-[13px] font-semibold shadow-[0_4px_14px_rgba(40,181,134,0.05)]">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </div>


              <div className="h-10 px-3 rounded-[10px] text-[#64748b] flex items-center gap-3 text-[13px]">
                <Rocket className="w-4 h-4" />
                Despliegues
              </div>


              <div className="h-10 px-3 rounded-[10px] text-[#64748b] flex items-center gap-3 text-[13px]">
                <Server className="w-4 h-4" />
                Instancias
              </div>

            </nav>


            {/* Plataforma */}
            <div className="mt-8 pt-6 border-t border-[#dfe7e4]">

              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
                Plataforma
              </p>


              <div className="mt-4 p-3 rounded-[13px] bg-white border border-[#e2e8f0] shadow-[0_5px_20px_rgba(23,40,56,0.025)]">

                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-[10px] bg-brand-50 border border-brand-100 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-brand-600" />
                  </div>


                  <div>
                    <p className="text-[11px] font-semibold text-navy-900">
                      Sistema
                    </p>

                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />

                      <p className="text-[10px] text-brand-700">
                        Operativo
                      </p>
                    </div>
                  </div>

                </div>

              </div>

            </div>


            {/* Codrop flow */}
            <div className="mt-5 p-4 rounded-[15px] border border-brand-100 bg-gradient-to-br from-white to-brand-50/70 relative overflow-hidden">

              <div className="absolute -right-5 -bottom-4 opacity-[0.08]">
                <img
                  src={codropIsotipo}
                  alt=""
                  aria-hidden="true"
                  className="w-[110px]"
                />
              </div>


              <div className="relative z-10">

                <div className="flex items-center gap-2">

                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />

                  <p className="text-[9px] uppercase tracking-[0.14em] font-bold text-brand-700">
                    Codrop flow
                  </p>

                </div>


                <div className="mt-4 space-y-2.5">

                  <FlowItem
                    icon={FileArchive}
                    label=".zip"
                  />

                  <div className="ml-[13px] h-3 border-l border-dashed border-brand-200" />

                  <FlowItem
                    icon={Rocket}
                    label="Deploy"
                  />

                  <div className="ml-[13px] h-3 border-l border-dashed border-brand-200" />

                  <FlowItem
                    icon={Link2}
                    label="URL pública"
                  />

                </div>


                <p className="mt-4 text-[9px] leading-4 text-[#789087]">
                  De tu código a la web, sin complicaciones.
                </p>

              </div>

            </div>

          </div>

        </aside>


        {/* =====================================================
            CONTENT
        ====================================================== */}
        <div className="flex-1 min-w-0 px-5 sm:px-6 lg:px-8 xl:px-10 py-8">


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
                className="h-[46px] px-5 rounded-[11px] bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_12px_28px_rgba(40,181,134,0.22)] transition-all hover:-translate-y-[1px] flex-shrink-0"
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
              LOADING
          ================================================== */}
          {loading ? (

            <div className="flex flex-col items-center justify-center py-24">

              <div className="w-9 h-9 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />

              <p className="mt-4 text-[12px] text-[#64748b]">
                Cargando tu workspace...
              </p>

            </div>

          ) : (

            <>

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
                  label="Contenedores"
                  value={instances.length}
                  description="Instancias Docker"
                  icon={Box}
                  className="sm:col-span-2 xl:col-span-1"
                />

              </section>


              {/* =================================================
                  PROJECTS
              ================================================== */}
              <section className="mt-5 bg-white border border-[#dfe7e4] rounded-[20px] shadow-[0_12px_38px_rgba(23,40,56,0.04)] overflow-hidden">


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
                      className="h-9 px-4 rounded-[9px] bg-brand-50 hover:bg-brand-100 border border-brand-100 text-brand-700 text-[12px] font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nuevo proyecto
                    </button>
                  )}

                </div>


                {/* EMPTY */}
                {instances.length === 0 ? (

                  <div className="px-6 py-14 text-center">

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
                      className="mt-6 h-10 px-5 rounded-[9px] bg-brand-500 hover:bg-brand-600 text-white text-[12px] font-semibold inline-flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(40,181,134,0.18)] transition-colors"
                    >
                      <Rocket className="w-4 h-4" />
                      Desplegar mi primer sitio
                    </button>

                  </div>

                ) : (

                  <div className="divide-y divide-[#edf1ef]">

                    {instances.map((inst) => {

                      const isRunning = inst.status === 'running';

                      return (
                        <article
                          key={inst.id}
                          className="group px-5 sm:px-6 py-5 hover:bg-[#fbfdfc] transition-colors relative"
                        >

                          <div className="absolute inset-y-4 left-0 w-[2px] rounded-r-full bg-transparent group-hover:bg-brand-500 transition-colors" />


                          {/* Main row */}
                          <div className="flex flex-col xl:flex-row xl:items-center gap-5">


                            {/* Proyecto */}
                            <div className="flex items-center gap-3.5 xl:w-[23%] min-w-0">

                              <div className="w-11 h-11 rounded-[13px] bg-gradient-to-br from-brand-50 to-white border border-brand-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Globe className="w-5 h-5 text-brand-600" />
                              </div>


                              <div className="min-w-0">

                                <div className="flex items-center gap-2">

                                  <h3 className="text-[13px] font-semibold text-navy-900 truncate">
                                    {inst.name}
                                  </h3>

                                  {isRunning && (
                                    <span className="hidden 2xl:inline-flex items-center gap-1 text-[9px] text-brand-700 font-medium">
                                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                                      live
                                    </span>
                                  )}

                                </div>


                                <p className="mt-1 text-[10px] text-[#94a3b8]">
                                  Creado {formatDate(inst.created_at)}
                                </p>

                              </div>

                            </div>


                            {/* Estado */}
                            <div className="xl:w-[13%]">

                              <span
                                className={`
                                  inline-flex
                                  items-center
                                  gap-2
                                  px-2.5
                                  py-1
                                  rounded-full
                                  text-[10px]
                                  font-semibold
                                  border
                                  ${
                                    isRunning
                                      ? 'bg-brand-50 text-brand-700 border-brand-100'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }
                                `}
                              >

                                <span
                                  className={`
                                    w-1.5
                                    h-1.5
                                    rounded-full
                                    ${
                                      isRunning
                                        ? 'bg-brand-500'
                                        : 'bg-slate-400'
                                    }
                                  `}
                                />

                                {isRunning ? 'Running' : 'Stopped'}

                              </span>

                            </div>


                            {/* Puerto */}
                            <div className="xl:w-[9%]">

                              <p className="text-[9px] uppercase tracking-[0.12em] font-semibold text-[#94a3b8]">
                                Puerto
                              </p>

                              <p className="mt-1 text-[12px] font-mono font-semibold text-navy-900">
                                {inst.assigned_port || '—'}
                              </p>

                            </div>


                            {/* URL */}
                            <div className="flex-1 min-w-0">

                              <p className="text-[9px] uppercase tracking-[0.12em] font-semibold text-[#94a3b8]">
                                URL pública
                              </p>


                              {inst.public_url ? (

                                <a
                                  href={inst.public_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[12px] font-medium text-brand-700 hover:text-brand-600"
                                >

                                  <span className="truncate">
                                    {inst.public_url}
                                  </span>

                                  <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />

                                </a>

                              ) : (

                                <p className="mt-1 text-[12px] text-[#64748b]">
                                  No disponible
                                </p>

                              )}

                            </div>


                            {/* Acciones */}
                            <div className="flex items-center xl:justify-end gap-1.5 flex-wrap">

                              {isRunning ? (

                                <button
                                  type="button"
                                  title="Detener servidor"
                                  disabled={Boolean(actionLoading[inst.id])}
                                  onClick={() => handleAction(inst.id, 'stop')}
                                  className="h-8 px-2.5 rounded-[8px] bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                >
                                  {actionLoading[inst.id] === 'stop' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5" />
                                  )}

                                  <span className="hidden sm:inline">
                                    Detener
                                  </span>
                                </button>

                              ) : (

                                <button
                                  type="button"
                                  title="Iniciar servidor"
                                  disabled={Boolean(actionLoading[inst.id])}
                                  onClick={() => handleAction(inst.id, 'start')}
                                  className="h-8 px-2.5 rounded-[8px] bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-100 text-[11px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                >

                                  {actionLoading[inst.id] === 'start' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5" />
                                  )}

                                  <span className="hidden sm:inline">
                                    Iniciar
                                  </span>

                                </button>

                              )}


                              <button
                                type="button"
                                title="Reiniciar servidor"
                                disabled={Boolean(actionLoading[inst.id])}
                                onClick={() => handleAction(inst.id, 'restart')}
                                className="h-8 px-2.5 rounded-[8px] bg-[#f5f8f7] hover:bg-[#edf3f0] text-[#47675b] border border-[#dce7e2] text-[11px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                              >

                                <RotateCcw
                                  className={`
                                    w-3.5 h-3.5
                                    ${
                                      actionLoading[inst.id] === 'restart'
                                        ? 'animate-spin'
                                        : ''
                                    }
                                  `}
                                />

                                <span className="hidden sm:inline">
                                  Reiniciar
                                </span>

                              </button>


                              <button
                                type="button"
                                title="Sincronizar estado con Docker Engine"
                                disabled={Boolean(actionLoading[inst.id])}
                                onClick={() => handleSync(inst.id)}
                                className="h-8 px-2.5 rounded-[8px] bg-white hover:bg-[#f8faf9] text-[#64748b] border border-[#dfe7e4] text-[11px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                              >

                                <RefreshCw
                                  className={`
                                    w-3.5 h-3.5
                                    ${
                                      actionLoading[inst.id] === 'sync'
                                        ? 'animate-spin'
                                        : ''
                                    }
                                  `}
                                />

                                <span className="hidden sm:inline">
                                  Sync
                                </span>

                              </button>


                              <button
                                type="button"
                                title="Ver registros"
                                onClick={() => setSelectedLogInstance(inst)}
                                className="h-8 px-2.5 rounded-[8px] bg-navy-900 hover:bg-navy-800 text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors shadow-[0_5px_14px_rgba(23,40,56,0.15)]"
                              >

                                <Terminal className="w-3.5 h-3.5 text-brand-500" />

                                <span className="hidden sm:inline">
                                  Logs
                                </span>

                              </button>


                              <button
                                type="button"
                                title="Eliminar proyecto"
                                disabled={Boolean(actionLoading[inst.id])}
                                onClick={() => setDestroyConfirmInstance(inst)}
                                className="h-8 w-8 rounded-[8px] bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center transition-colors disabled:opacity-50"
                              >

                                {actionLoading[inst.id] === 'destroy' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}

                              </button>

                            </div>

                          </div>


                          {/* Métricas */}
                          <InstanceMetricsCard
                            instanceId={inst.id}
                            isRunning={isRunning}
                          />

                        </article>
                      );
                    })}

                  </div>

                )}

              </section>

            </>
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

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-[3px]" />


          <div className="relative bg-white rounded-[22px] border border-red-200 max-w-[470px] w-full p-7 shadow-[0_30px_80px_rgba(23,40,56,0.2)]">


            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-[13px] bg-red-50 border border-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>


              <div>

                <h3 className="font-bold text-[16px] text-navy-900">
                  ¿Eliminar proyecto definitivamente?
                </h3>

                <p className="mt-0.5 text-[10px] text-red-500 font-semibold uppercase tracking-[0.08em]">
                  Acción irreversible
                </p>

              </div>

            </div>


            <p className="mt-5 text-[12px] text-[#64748b] leading-6">

              Estás a punto de eliminar{' '}

              <strong className="text-navy-900 font-semibold">
                {destroyConfirmInstance.name}
              </strong>.

              {' '}Codrop detendrá y eliminará el contenedor, liberará el puerto{' '}

              <code className="bg-[#f1f5f4] px-1.5 py-0.5 rounded text-navy-900 font-mono font-bold">
                {destroyConfirmInstance.assigned_port}
              </code>

              {' '}y eliminará sus archivos asociados.

            </p>


            <div className="mt-7 flex items-center justify-end gap-3">

              <button
                type="button"
                disabled={Boolean(
                  actionLoading[destroyConfirmInstance.id]
                )}
                onClick={() => setDestroyConfirmInstance(null)}
                className="h-10 px-4 rounded-[9px] text-[12px] font-semibold text-[#64748b] hover:bg-[#f5f8f7] transition-colors"
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
                className="h-10 px-4 rounded-[9px] text-[12px] font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-colors disabled:opacity-50"
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

        </div>
      )}

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
              ${
                active
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


          <Layers3 className="w-3.5 h-3.5 text-brand-100" />

        </div>

      </div>

    </article>
  );
}


/* =========================================================
   FLOW ITEM
========================================================= */

function FlowItem({
  icon: Icon,
  label,
}) {
  return (
    <div className="flex items-center gap-2.5">

      <div className="w-7 h-7 rounded-[8px] bg-white border border-brand-100 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-brand-600" />
      </div>

      <span className="text-[10px] font-semibold text-navy-900">
        {label}
      </span>

    </div>
  );
}