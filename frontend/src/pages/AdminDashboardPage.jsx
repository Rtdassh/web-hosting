import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  DollarSign,
  Gauge,
  HardDrive,
  Loader2,
  MemoryStick,
  RefreshCw,
  Server,
  ShieldCheck,
  Square,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import { adminService } from '../services/api';

export default function AdminDashboardPage({ onBack }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [instances, setInstances] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [selectedInstanceForAction, setSelectedInstanceForAction] =
    useState(null);
  const [actionType, setActionType] = useState('force_stop');
  const [actionReason, setActionReason] = useState(
    'Intervención administrativa por uso anómalo de recursos'
  );

  const [notification, setNotification] = useState(null);

  const extractErrorMessage = (requestError) => {
    const detail = requestError.response?.data?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    return 'No fue posible cargar la consola administrativa. Verifica que la API de administración esté disponible y que la sesión tenga rol admin.';
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboardResponse, instancesResponse] = await Promise.all([
        adminService.getDashboard(),
        adminService.getInstances(),
      ]);

      setDashboardData(dashboardResponse);
      setInstances(
        Array.isArray(instancesResponse) ? instancesResponse : []
      );
    } catch (requestError) {
      console.error(
        'Error cargando datos de administración:',
        requestError
      );

      setDashboardData(null);
      setInstances([]);
      setError(extractErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const users = useMemo(() => {
    if (Array.isArray(dashboardData?.users)) {
      return dashboardData.users;
    }

    const map = new Map();

    instances.forEach((instance) => {
      const email = instance.owner_email;

      if (!email || map.has(email)) return;

      map.set(email, {
        id: instance.owner_id || email,
        name: instance.owner_name || 'Usuario Codrop',
        email,
        plan_name: instance.plan_name || 'Free',
        created_at:
          instance.owner_created_at ||
          instance.user_created_at ||
          instance.created_at ||
          null,
      });
    });

    return Array.from(map.values());
  }, [dashboardData, instances]);

  const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  };

  const formatMetric = (value, suffix = '') => {
    if (value === undefined || value === null) {
      return '—';
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return '—';
    }

    return `${number.toFixed(1)}${suffix}`;
  };

  const handleExecuteAction = async () => {
    if (!selectedInstanceForAction) return;

    setActionLoading(true);

    try {
      await adminService.forceAction(
        selectedInstanceForAction.id,
        actionType,
        actionReason
      );

      setNotification(
        `${actionType === 'force_destroy' ? 'Eliminación' : 'Detención'} forzosa ejecutada sobre ${selectedInstanceForAction.name}.`
      );

      setSelectedInstanceForAction(null);
      await fetchData();
    } catch (requestError) {
      setNotification(null);
      setError(extractErrorMessage(requestError));
    } finally {
      setActionLoading(false);
    }
  };

  const openForceAction = (instance, type) => {
    setActionType(type);
    setSelectedInstanceForAction(instance);

    setActionReason(
      type === 'force_destroy'
        ? 'Eliminación administrativa de instancia por incumplimiento o anomalía'
        : 'Detención administrativa preventiva por uso anómalo de recursos'
    );
  };

  const summary = dashboardData?.summary || {};
  const host = dashboardData?.host_resources || {};

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f9f7] px-5 py-8 text-[#172838] sm:px-6 lg:px-10">
      {/* Background Codrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-24 h-80 w-80 rounded-full bg-[#28B586]/[0.07] blur-3xl" />
        <div className="absolute -right-28 top-20 h-96 w-96 rounded-full bg-[#172838]/[0.05] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
            backgroundSize: '34px 34px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1380px]">
        {/* Top bar */}
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#dce7e2] bg-white px-4 py-2.5 text-xs font-black text-[#334e5e] shadow-sm transition hover:border-[#b9d8ca] hover:text-[#1C7F62]"
          >
            <ArrowLeft className="h-4 w-4" />
            Salir de administración
          </button>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#CFE4D6] bg-[#EAF7F1] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#1C7F62]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Rol administrador
            </span>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              title="Actualizar consola"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dce7e2] bg-white text-[#1C7F62] shadow-sm transition hover:bg-[#f8fbf9] disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Hero */}
        <section className="relative mb-7 overflow-hidden rounded-[28px] border border-[#dce7e2] bg-[#172838] px-6 py-8 text-white shadow-[0_22px_60px_rgba(23,40,56,0.13)] md:px-9">
          <div
            className="absolute inset-0 opacity-[0.055]"
            style={{
              backgroundImage:
                'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />

          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#28B586]/20 blur-3xl" />

          <div className="relative max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#28B586]/30 bg-[#28B586]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.17em] text-[#7de0bd]">
              <Gauge className="h-3.5 w-3.5" />
              Gobernanza Codrop
            </div>

            <h1 className="text-3xl font-black tracking-[-0.035em] sm:text-4xl lg:text-[44px]">
              Visibilidad global para
              <span className="text-[#55d3a6]"> mantener el control.</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-300">
              Supervisa usuarios, facturación simulada, contenedores y
              recursos del host desde una única consola administrativa.
            </p>
          </div>
        </section>

        {notification && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-[#b9ddcd] bg-[#edf9f3] p-4 text-xs font-bold text-[#176c53]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {notification}
            </div>

            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-[#64748B]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-[#dce7e2] bg-white">
            <Loader2 className="h-7 w-7 animate-spin text-[#28B586]" />

            <p className="mt-4 text-sm font-black text-[#172838]">
              Consultando la plataforma
            </p>

            <p className="mt-1 text-xs font-medium text-[#94A3B8]">
              Cargando métricas y recursos administrativos...
            </p>
          </div>
        ) : error ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-[#dce7e2] bg-white px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <AlertCircle className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-lg font-black text-[#172838]">
              Consola administrativa no disponible
            </h2>

            <p className="mt-2 max-w-lg text-sm leading-6 text-[#64748B]">
              {error}
            </p>

            <button
              type="button"
              onClick={fetchData}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#172838] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#1F3141]"
            >
              <RefreshCw className="h-4 w-4" />
              Intentar nuevamente
            </button>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                icon={Users}
                label="Usuarios"
                value={summary.total_users ?? 0}
                caption="registrados"
              />

              <KpiCard
                icon={DollarSign}
                label="Ingresos simulados"
                value={`$${Number(
                  summary.total_revenue_simulated || 0
                ).toFixed(2)}`}
                caption="acumulados"
                accent
              />

              <KpiCard
                icon={Server}
                label="Contenedores"
                value={`${summary.active_instances ?? 0} / ${
                  summary.total_instances ?? 0
                }`}
                caption="activos / totales"
              />

              <KpiCard
                icon={Cpu}
                label="CPU host"
                value={formatMetric(host.cpu_usage_percent, '%')}
                caption="uso global"
              />

              <KpiCard
                icon={MemoryStick}
                label="RAM host"
                value={formatMetric(
                  host.memory_usage_percent,
                  '%'
                )}
                caption={
                  host.memory_used_mb !== undefined &&
                  host.memory_total_mb !== undefined
                    ? `${(
                        Number(host.memory_used_mb) / 1024
                      ).toFixed(1)} / ${(
                        Number(host.memory_total_mb) / 1024
                      ).toFixed(1)} GB`
                    : 'uso global'
                }
              />
            </div>

            {/* Instances */}
            <section className="mb-7 overflow-hidden rounded-[24px] border border-[#dce7e2] bg-white shadow-[0_16px_45px_rgba(23,40,56,0.055)]">
              <div className="flex flex-col gap-3 border-b border-[#e9efec] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#28B586]">
                    Supervisión multi-inquilino
                  </p>

                  <h2 className="mt-1 text-lg font-black text-[#172838]">
                    Instancias de la plataforma
                  </h2>

                  <p className="mt-1 text-xs font-medium text-[#64748B]">
                    Estado, propietario, recursos y acciones administrativas.
                  </p>
                </div>

                <span className="rounded-full bg-[#f3f6f4] px-3 py-1.5 text-[10px] font-black text-[#64748B]">
                  {instances.length} instancias
                </span>
              </div>

              {instances.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <Server className="mx-auto h-6 w-6 text-[#94A3B8]" />

                  <p className="mt-3 text-sm font-black text-[#172838]">
                    No hay instancias registradas
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#e9efec] bg-[#f8fbf9] text-[10px] font-black uppercase tracking-[0.13em] text-[#94A3B8]">
                        <th className="px-5 py-4">Instancia</th>
                        <th className="px-5 py-4">Propietario</th>
                        <th className="px-5 py-4">Plan</th>
                        <th className="px-5 py-4">Puerto</th>
                        <th className="px-5 py-4">CPU</th>
                        <th className="px-5 py-4">RAM</th>
                        <th className="px-5 py-4">Estado</th>
                        <th className="px-5 py-4 text-right">
                          Contingencia
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#edf1ef]">
                      {instances.map((instance) => (
                        <tr
                          key={instance.id}
                          className="transition hover:bg-[#f9fcfa]"
                        >
                          <td className="px-5 py-4">
                            <div className="font-black text-[#172838]">
                              {instance.name}
                            </div>

                            <div className="mt-1 font-mono text-[10px] text-[#94A3B8]">
                              #{instance.id}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="text-xs font-bold text-[#475569]">
                              {instance.owner_name ||
                                'Usuario Codrop'}
                            </div>

                            <div className="mt-1 text-[10px] font-medium text-[#94A3B8]">
                              {instance.owner_email || '—'}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full border border-[#CFE4D6] bg-[#EAF7F1] px-2.5 py-1 text-[10px] font-black text-[#1C7F62]">
                              {instance.plan_name || 'Free'}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-mono text-xs font-black text-[#334e5e]">
                            {instance.assigned_port || '—'}
                          </td>

                          <td className="px-5 py-4 text-xs font-black text-[#334e5e]">
                            {formatMetric(
                              instance.cpu_usage_percent ??
                                instance.cpu_percent,
                              '%'
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs font-black text-[#334e5e]">
                            {instance.memory_usage_mb !== undefined
                              ? `${Number(
                                  instance.memory_usage_mb
                                ).toFixed(1)} MB`
                              : instance.ram_usage_mb !== undefined
                              ? `${Number(
                                  instance.ram_usage_mb
                                ).toFixed(1)} MB`
                              : '—'}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                                instance.status === 'running'
                                  ? 'border border-[#b9ddcd] bg-[#edf9f3] text-[#176c53]'
                                  : 'border border-[#e2e8e5] bg-[#f3f6f4] text-[#64748B]'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  instance.status === 'running'
                                    ? 'bg-[#28B586]'
                                    : 'bg-[#94A3B8]'
                                }`}
                              />

                              {instance.status || 'unknown'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openForceAction(
                                    instance,
                                    'force_stop'
                                  )
                                }
                                disabled={
                                  instance.status !== 'running'
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-black text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Square className="h-3 w-3" />
                                Forzar detención
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openForceAction(
                                    instance,
                                    'force_destroy'
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-black text-red-600 transition hover:bg-red-100"
                              >
                                <Trash2 className="h-3 w-3" />
                                Forzar eliminación
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Users */}
            <section className="overflow-hidden rounded-[24px] border border-[#dce7e2] bg-white shadow-[0_16px_45px_rgba(23,40,56,0.055)]">
              <div className="border-b border-[#e9efec] px-6 py-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#28B586]">
                  Usuarios
                </p>

                <h2 className="mt-1 text-lg font-black text-[#172838]">
                  Clientes observados
                </h2>

                <p className="mt-1 text-xs font-medium text-[#64748B]">
                  Vista construida con los datos disponibles en la consola
                  administrativa.
                </p>
              </div>

              {users.length === 0 ? (
                <div className="px-6 py-12 text-center text-xs font-semibold text-[#94A3B8]">
                  No hay información de usuarios disponible.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#e9efec] bg-[#f8fbf9] text-[10px] font-black uppercase tracking-[0.13em] text-[#94A3B8]">
                        <th className="px-5 py-4">Usuario</th>
                        <th className="px-5 py-4">Correo</th>
                        <th className="px-5 py-4">Plan actual</th>
                        <th className="px-5 py-4">Registro</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#edf1ef]">
                      {users.map((user) => (
                        <tr
                          key={user.id || user.email}
                          className="hover:bg-[#f9fcfa]"
                        >
                          <td className="px-5 py-4 text-xs font-black text-[#172838]">
                            {user.name || 'Usuario Codrop'}
                          </td>

                          <td className="px-5 py-4 text-xs font-semibold text-[#64748B]">
                            {user.email || '—'}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full border border-[#CFE4D6] bg-[#EAF7F1] px-2.5 py-1 text-[10px] font-black text-[#1C7F62]">
                              {user.plan_name ||
                                user.plan?.name ||
                                'Free'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs font-semibold text-[#64748B]">
                            {formatDate(user.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {/* Force action modal */}
        {selectedInstanceForAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10202d]/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-[500px] overflow-hidden rounded-[26px] border border-white/10 bg-white shadow-[0_35px_90px_rgba(9,24,34,0.4)]">
              <div className="relative bg-[#172838] px-6 py-5 text-white">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedInstanceForAction(null)
                  }
                  disabled={actionLoading}
                  className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-start gap-3 pr-12">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
                    <AlertTriangle className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-300">
                      Acción administrativa
                    </p>

                    <h3 className="mt-1 text-lg font-black">
                      {actionType === 'force_destroy'
                        ? 'Forzar eliminación'
                        : 'Forzar detención'}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm leading-6 text-[#64748B]">
                  Vas a intervenir la instancia{' '}
                  <strong className="text-[#172838]">
                    {selectedInstanceForAction.name}
                  </strong>{' '}
                  perteneciente a{' '}
                  <strong className="text-[#172838]">
                    {selectedInstanceForAction.owner_email ||
                      'un usuario Codrop'}
                  </strong>.
                </p>

                {actionType === 'force_destroy' && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold leading-5 text-red-700">
                    La eliminación forzosa es destructiva y puede liberar
                    definitivamente los recursos asociados a esta instancia.
                  </div>
                )}

                <div className="mt-5">
                  <label className="mb-1.5 block text-xs font-black text-[#334e5e]">
                    Motivo de auditoría
                  </label>

                  <textarea
                    value={actionReason}
                    onChange={(event) =>
                      setActionReason(event.target.value)
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-[#d6dfdb] bg-white px-4 py-3 text-xs font-semibold text-[#172838] outline-none transition focus:border-[#28B586] focus:ring-2 focus:ring-[#28B586]/10"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-[#edf1ef] pt-5">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedInstanceForAction(null)
                    }
                    disabled={actionLoading}
                    className="rounded-xl px-4 py-2.5 text-xs font-black text-[#64748B] transition hover:bg-[#f3f6f4]"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteAction}
                    disabled={
                      actionLoading || !actionReason.trim()
                    }
                    className={`inline-flex min-w-[175px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white transition disabled:opacity-50 ${
                      actionType === 'force_destroy'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-amber-500 hover:bg-amber-600'
                    }`}
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Ejecutando...
                      </>
                    ) : actionType === 'force_destroy' ? (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Confirmar eliminación
                      </>
                    ) : (
                      <>
                        <Square className="h-4 w-4" />
                        Confirmar detención
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  caption,
  accent = false,
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-[#dce7e2] bg-white p-5 shadow-[0_12px_35px_rgba(23,40,56,0.045)]">
      <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-[#EAF7F1]" />

      <div className="relative">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.13em] text-[#94A3B8]">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAF7F1] text-[#1C7F62]">
            <Icon className="h-4 w-4" />
          </span>

          {label}
        </div>

        <div
          className={`mt-4 text-2xl font-black tracking-[-0.03em] ${
            accent ? 'text-[#28B586]' : 'text-[#172838]'
          }`}
        >
          {value}
        </div>

        <p className="mt-1 text-[10px] font-semibold text-[#94A3B8]">
          {caption}
        </p>
      </div>
    </div>
  );
}