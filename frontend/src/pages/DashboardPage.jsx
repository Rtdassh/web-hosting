import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  Globe,
  LayoutDashboard,
  Plus,
  Rocket,
  Server,
  ServerOff,
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
} from 'lucide-react';
import { instanceService } from '../services/api';
import InstanceLogsModal from '../components/instances/InstanceLogsModal';
import InstanceMetricsCard from '../components/instances/InstanceMetricsCard';

export default function DashboardPage({ onDeployClick, refreshKey }) {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [selectedLogInstance, setSelectedLogInstance] = useState(null);
  const [destroyConfirmInstance, setDestroyConfirmInstance] = useState(null);


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

  const handleAction = async (id, action) => {
    setActionLoading((prev) => ({ ...prev, [id]: action }));
    try {
      await instanceService.triggerAction(id, action);
      await fetchInstances();
    } catch (err) {
      alert('Error al ejecutar acción: ' + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleSync = async (id) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'sync' }));
    try {
      await instanceService.syncStatus(id);
      await fetchInstances();
    } catch (err) {
      alert('Error al sincronizar estado: ' + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleDestroy = async (id) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'destroy' }));
    try {
      await instanceService.destroyInstance(id);
      setDestroyConfirmInstance(null);
      await fetchInstances();
    } catch (err) {
      alert('Error al eliminar instancia: ' + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };


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

  return (
    <main className="flex-1 bg-[#f7f9fc]">

      <div className="max-w-7xl mx-auto flex">

        {/* Sidebar */}
        <aside className="hidden lg:block w-[220px] flex-shrink-0 px-5 py-8">
          <div className="sticky top-[104px]">

            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
              Navegación
            </p>

            <nav className="mt-3 space-y-1">

              {/* Dashboard activo */}
              <div className="h-10 px-3 rounded-[9px] bg-blue-50 text-[#2563eb] flex items-center gap-3 text-[13px] font-semibold">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </div>

              {/* Elementos informativos */}
              <div className="h-10 px-3 rounded-[9px] text-[#64748b] flex items-center gap-3 text-[13px]">
                <Rocket className="w-4 h-4" />
                Despliegues
              </div>

              <div className="h-10 px-3 rounded-[9px] text-[#64748b] flex items-center gap-3 text-[13px]">
                <Server className="w-4 h-4" />
                Instancias
              </div>

            </nav>

            <div className="mt-8 pt-6 border-t border-[#e2e8f0]">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                Plataforma
              </p>

              <div className="mt-4 px-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-green-600" />
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-[#0f172a]">
                    Sistema
                  </p>

                  <p className="text-[11px] text-green-600">
                    Operativo
                  </p>
                </div>
              </div>
            </div>

          </div>
        </aside>

        {/* Contenido */}
        <div className="flex-1 min-w-0 px-6 lg:px-8 xl:px-10 py-10">

          {/* Encabezado */}
          <div>
            <h1 className="text-[30px] leading-tight font-semibold tracking-tight text-[#0f172a]">
              Resumen
            </h1>

            <p className="mt-2 text-[14px] text-[#64748b]">
              Consulta el estado general de tus sitios desplegados.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-7 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
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

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />

              <p className="mt-4 text-sm text-[#64748b]">
                Cargando tu dashboard...
              </p>
            </div>
          ) : (
            <>
              {/* Tarjetas resumen */}
              <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

                {/* Sitios */}
                <article className="bg-white border border-[#e2e8f0] rounded-[14px] p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[12px] font-medium text-[#64748b]">
                        Sitios desplegados
                      </p>

                      <p className="mt-2 text-[26px] font-semibold tracking-tight text-[#0f172a]">
                        {instances.length}
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-[#2563eb]" />
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] text-[#64748b]">
                    Total de proyectos registrados
                  </p>
                </article>

                {/* Running */}
                <article className="bg-white border border-[#e2e8f0] rounded-[14px] p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[12px] font-medium text-[#64748b]">
                        Sitios activos
                      </p>

                      <p className="mt-2 text-[26px] font-semibold tracking-tight text-[#0f172a]">
                        {runningInstances}
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-green-600" />
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] text-green-600">
                    Running
                  </p>
                </article>

                {/* Contenedores */}
                <article className="bg-white border border-[#e2e8f0] rounded-[14px] p-5 shadow-sm sm:col-span-2 xl:col-span-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[12px] font-medium text-[#64748b]">
                        Contenedores
                      </p>

                      <p className="mt-2 text-[26px] font-semibold tracking-tight text-[#0f172a]">
                        {instances.length}
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                      <Box className="w-5 h-5 text-violet-600" />
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] text-[#64748b]">
                    Instancias registradas
                  </p>
                </article>

              </section>

              {/* Mis instancias */}
              <section className="mt-6 bg-white border border-[#e2e8f0] rounded-[16px] shadow-sm overflow-hidden">

                {/* Encabezado de sección */}
                <div className="px-6 py-5 border-b border-[#e2e8f0] flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#0f172a]">
                      Mis instancias
                    </h2>

                    <p className="mt-1 text-[12px] text-[#64748b]">
                      Sitios web desplegados en CloudPaaS.
                    </p>
                  </div>

                  {/* Solo aparece aquí si ya existen proyectos */}
                  {instances.length > 0 && (
                    <button
                      type="button"
                      onClick={onDeployClick}
                      className="h-10 px-4 rounded-[9px] bg-[#2563eb] hover:bg-blue-700 text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />

                      <span className="hidden sm:inline">
                        Nuevo despliegue
                      </span>

                      <span className="sm:hidden">
                        Nuevo
                      </span>
                    </button>
                  )}
                </div>

                {instances.length === 0 ? (
                  /* Estado vacío */
                  <div className="px-6 py-14 text-center">

                    <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center">
                      <ServerOff className="w-6 h-6 text-[#2563eb]" />
                    </div>

                    <h3 className="mt-5 text-[19px] font-semibold tracking-tight text-[#0f172a]">
                      Aún no tienes sitios desplegados
                    </h3>

                    <p className="mt-2 max-w-[450px] mx-auto text-[13px] leading-6 text-[#64748b]">
                      Empaqueta un archivo{' '}
                      <code className="text-[#0f172a] font-medium">
                        index.html
                      </code>{' '}
                      en un{' '}
                      <code className="text-[#0f172a] font-medium">
                        .zip
                      </code>{' '}
                      y lanza tu primer servidor en segundos.
                    </p>

                    <button
                      type="button"
                      onClick={onDeployClick}
                      className="mt-6 h-10 px-5 rounded-[9px] bg-[#2563eb] hover:bg-blue-700 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Nuevo despliegue
                    </button>

                  </div>
                ) : (
                  /* Lista de instancias */
                  <div className="divide-y divide-[#e2e8f0]">
                    {instances.map((inst) => {
                      const isRunning = inst.status === 'running';

                      return (
                        <article
                          key={inst.id}
                          className="px-6 py-5 hover:bg-[#f8fafc] transition-colors"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center gap-5">

                            {/* Proyecto */}
                            <div className="flex items-center gap-4 lg:w-[25%] min-w-0">

                              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <Server className="w-5 h-5 text-[#2563eb]" />
                              </div>

                              <div className="min-w-0">
                                <h3 className="text-[14px] font-semibold text-[#0f172a] truncate">
                                  {inst.name}
                                </h3>

                                <p className="mt-1 text-[11px] text-[#64748b]">
                                  {formatDate(inst.created_at)}
                                </p>
                              </div>

                            </div>

                            {/* Estado */}
                            <div className="lg:w-[14%]">
                              <span
                                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                  isRunning
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isRunning
                                      ? 'bg-green-500'
                                      : 'bg-slate-400'
                                  }`}
                                />

                                {isRunning ? 'Running' : 'Stopped'}
                              </span>
                            </div>

                            {/* Puerto */}
                            <div className="lg:w-[10%]">
                              <p className="text-[11px] text-[#94a3b8]">
                                Puerto
                              </p>

                              <p className="mt-1 text-[13px] font-medium text-[#0f172a]">
                                {inst.assigned_port || '—'}
                              </p>
                            </div>

                            {/* URL */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-[#94a3b8]">
                                URL pública
                              </p>

                              {inst.public_url ? (
                                <a
                                  href={inst.public_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 flex items-center gap-2 text-[13px] font-medium text-[#2563eb] hover:text-blue-700"
                                >
                                  <span className="truncate">
                                    {inst.public_url}
                                  </span>

                                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                </a>
                              ) : (
                                <p className="mt-1 text-[13px] text-[#64748b]">
                                  No disponible
                                </p>
                              )}
                            </div>

                            {/* Controles de ciclo de vida (RF-16, RF-17) */}
                            <div className="lg:w-[22%] flex items-center justify-end gap-1.5">
                              {isRunning ? (
                                <button
                                  type="button"
                                  title="Detener servidor"
                                  disabled={Boolean(actionLoading[inst.id])}
                                  onClick={() => handleAction(inst.id, 'stop')}
                                  className="h-9 px-2.5 rounded-[8px] bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[12px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                >
                                  {actionLoading[inst.id] === 'stop' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5" />
                                  )}
                                  <span className="hidden sm:inline">Detener</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  title="Iniciar servidor"
                                  disabled={Boolean(actionLoading[inst.id])}
                                  onClick={() => handleAction(inst.id, 'start')}
                                  className="h-9 px-2.5 rounded-[8px] bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-[12px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                >
                                  {actionLoading[inst.id] === 'start' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5" />
                                  )}
                                  <span className="hidden sm:inline">Iniciar</span>
                                </button>
                              )}

                              <button
                                type="button"
                                title="Reiniciar servidor"
                                disabled={Boolean(actionLoading[inst.id])}
                                onClick={() => handleAction(inst.id, 'restart')}
                                className="h-9 px-2.5 rounded-[8px] bg-blue-50 hover:bg-blue-100 text-[#2563eb] border border-blue-200 text-[12px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                              >
                                <RotateCcw className={`w-3.5 h-3.5 ${actionLoading[inst.id] === 'restart' ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Reiniciar</span>
                              </button>

                              {/* Sincronización (T3.3) */}
                              <button
                                type="button"
                                title="Sincronizar estado con Docker Engine"
                                disabled={Boolean(actionLoading[inst.id])}
                                onClick={() => handleSync(inst.id)}
                                className="h-9 px-2.5 rounded-[8px] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[12px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${actionLoading[inst.id] === 'sync' ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Sync</span>
                              </button>

                              {/* Visor de logs (T2.1, RF-21) */}
                              <button
                                type="button"
                                title="Ver registros de acceso y errores de Nginx"
                                onClick={() => setSelectedLogInstance(inst)}
                                className="h-9 px-2.5 rounded-[8px] bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                              >
                                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="hidden sm:inline">Logs</span>
                              </button>

                              {/* Botón modal Destroy (T2.3, RF-17) */}
                              <button
                                type="button"
                                title="Eliminar y liberar recursos"
                                disabled={Boolean(actionLoading[inst.id])}
                                onClick={() => setDestroyConfirmInstance(inst)}
                                className="h-9 w-9 rounded-[8px] bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center transition-colors disabled:opacity-50"
                              >
                                {actionLoading[inst.id] === 'destroy' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                          </div>

                          {/* Telemetría en tiempo real (T2.2, RF-20) */}
                          <InstanceMetricsCard instanceId={inst.id} isRunning={isRunning} />
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

      {/* Modal de logs en vivo (T2.1) */}
      {selectedLogInstance && (
        <InstanceLogsModal
          instance={selectedLogInstance}
          onClose={() => setSelectedLogInstance(null)}
        />
      )}

      {/* Modal de confirmación destructiva Destroy (T2.3, RF-17) */}
      {destroyConfirmInstance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-red-200 max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">¿Eliminar sitio web definitivamente?</h3>
                <p className="text-xs text-slate-500">Acción permanente e irreversible</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Estás a punto de destruir la instancia <strong className="text-slate-900 font-semibold">{destroyConfirmInstance.name}</strong>. Esta operación detendrá y eliminará el contenedor Docker, liberará el puerto TCP <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono font-bold">{destroyConfirmInstance.assigned_port}</code> y purgará de forma segura los archivos en disco del host.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={Boolean(actionLoading[destroyConfirmInstance.id])}
                onClick={() => setDestroyConfirmInstance(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={Boolean(actionLoading[destroyConfirmInstance.id])}
                onClick={() => handleDestroy(destroyConfirmInstance.id)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                {actionLoading[destroyConfirmInstance.id] === 'destroy' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Confirmar y Destruir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>

  );
}