import ModalLayer from '../components/ui/ModalLayer';
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  DollarSign,
  Gauge,
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
import ServerMascot from '../components/mascot/ServerMascot';
import { toast } from '../components/ui/Toast';


export default function AdminDashboardPage({ onBack }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [instances, setInstances] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [
    selectedInstanceForAction,
    setSelectedInstanceForAction,
  ] = useState(null);

  const [actionType, setActionType] = useState('force_stop');

  const [actionReason, setActionReason] = useState(
    'Intervención administrativa por uso anómalo de recursos'
  );

  const [notification, setNotification] = useState(null);


  /* =========================================================
     HELPERS
  ========================================================= */

  const extractErrorMessage = (requestError) => {
    const detail =
      requestError.response?.data?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    return 'No fue posible cargar la consola administrativa. Verifica que la API de administración esté disponible y que la sesión tenga rol admin.';
  };


  const fetchData = async (
    showSuccessToast = false
  ) => {
    setLoading(true);
    setError(null);

    try {
      const [
        dashboardResponse,
        instancesResponse,
      ] = await Promise.all([
        adminService.getDashboard(),
        adminService.getInstances(),
      ]);

      setDashboardData(dashboardResponse);

      setInstances(
        Array.isArray(instancesResponse)
          ? instancesResponse
          : []
      );

      if (showSuccessToast) {
        toast.success(
          'Consola administrativa actualizada.'
        );
      }
    } catch (requestError) {
      console.error(
        'Error cargando datos de administración:',
        requestError
      );

      setDashboardData(null);
      setInstances([]);

      const msg =
        extractErrorMessage(requestError);

      setError(msg);

      if (showSuccessToast) {
        toast.error(
          `Error al actualizar: ${msg}`
        );
      }
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

      if (!email || map.has(email)) {
        return;
      }

      map.set(email, {
        id: instance.owner_id || email,
        name:
          instance.owner_name ||
          'Usuario Codrop',
        email,
        plan_name:
          instance.plan_name || 'Free',
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
    if (!value) {
      return '—';
    }

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


  const formatMetric = (
    value,
    suffix = ''
  ) => {
    if (
      value === undefined ||
      value === null
    ) {
      return '—';
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return '—';
    }

    return `${number.toFixed(1)}${suffix}`;
  };


  /* =========================================================
     ADMIN ACTIONS
  ========================================================= */

  const handleExecuteAction = async () => {
    if (!selectedInstanceForAction) {
      return;
    }

    setActionLoading(true);

    try {
      await adminService.forceAction(
        selectedInstanceForAction.id,
        actionType,
        actionReason
      );

      const successMsg = `${
        actionType === 'force_destroy'
          ? 'Eliminación'
          : 'Detención'
      } forzosa ejecutada sobre ${selectedInstanceForAction.name}.`;

      setNotification(successMsg);
      toast.success(successMsg);

      setSelectedInstanceForAction(null);

      await fetchData();
    } catch (requestError) {
      setNotification(null);

      const msg =
        extractErrorMessage(requestError);

      setError(msg);

      toast.error(
        `Error en acción forzosa: ${msg}`
      );
    } finally {
      setActionLoading(false);
    }
  };


  const openForceAction = (
    instance,
    type
  ) => {
    setActionType(type);

    setSelectedInstanceForAction(
      instance
    );

    setActionReason(
      type === 'force_destroy'
        ? 'Eliminación administrativa de proyecto por incumplimiento o anomalía'
        : 'Detención administrativa preventiva por uso anómalo de recursos'
    );
  };


  const summary =
    dashboardData?.summary || {};

  const host =
    dashboardData?.host_resources || {};


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f9f7] px-5 py-8 text-[#172838] sm:px-6 lg:px-10">

      {/* =====================================================
          CODROP BACKGROUND
      ====================================================== */}
      <div className="pointer-events-none absolute inset-0">

        <div className="absolute -left-28 top-24 h-80 w-80 rounded-full bg-[#28B586]/[0.07] blur-3xl" />

        <div className="absolute -right-28 top-20 h-96 w-96 rounded-full bg-[#172838]/[0.045] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
            backgroundSize:
              '34px 34px',
          }}
        />

      </div>


      <div className="relative mx-auto max-w-[1380px]">

        {/* =====================================================
            TOP BAR
        ====================================================== */}
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <button
            type="button"
            onClick={onBack}
            className="btn-tactile inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-[#dce7e2] bg-white px-4 py-2.5 text-[14px] font-bold text-[#334e5e] shadow-sm transition duration-150 hover:border-[#b9d8ca] hover:text-[#1C7F62]"
          >
            <ArrowLeft className="h-5 w-5" />
            Salir de administración
          </button>


          <div className="flex items-center gap-3">

            <span className="inline-flex items-center gap-2 rounded-full border border-[#CFE4D6] bg-[#EAF7F1] px-3.5 py-2 text-[12px] font-black uppercase tracking-[0.14em] text-[#1C7F62]">

              <ShieldCheck className="h-4 w-4" />

              Rol administrador

            </span>


            <button
              type="button"
              onClick={() =>
                fetchData(true)
              }
              disabled={loading}
              title="Actualizar consola"
              aria-label="Actualizar consola administrativa"
              className="btn-tactile flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-[#dce7e2] bg-white text-[#1C7F62] shadow-sm transition duration-150 hover:border-[#b9d8ca] hover:bg-[#f8fbf9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-5 w-5 ${
                  loading
                    ? 'animate-spin'
                    : ''
                }`}
              />
            </button>

          </div>

        </div>


        {/* =====================================================
            HERO
        ====================================================== */}
        <section className="relative mb-7 overflow-hidden rounded-[28px] border border-[#dce7e2] bg-gradient-to-br from-white via-white to-[#EAF7F1] px-6 py-8 shadow-[0_18px_50px_rgba(23,40,56,0.06)] md:px-9 md:py-9">

          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#28B586]/10 blur-3xl" />

          <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-[42%] opacity-[0.035]">

            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
                backgroundSize:
                  '22px 22px',
              }}
            />

          </div>


          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">

            <div className="max-w-3xl">

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#CFE4D6] bg-[#EAF7F1] px-3.5 py-2 text-[13px] font-black uppercase tracking-[0.15em] text-[#1C7F62]">

                <Gauge className="h-4 w-4" />

                Centro de control Codrop

              </div>


              <h1 className="text-[34px] font-black tracking-[-0.035em] text-[#172838] sm:text-[40px] lg:text-[46px] lg:leading-[1.05]">

                Visibilidad global para

                <span className="text-[#28B586]">
                  {' '}mantener el control.
                </span>

              </h1>


              <p className="mt-4 max-w-2xl text-[17px] font-medium leading-7 text-[#64748B]">
                Supervisa usuarios, facturación, infraestructura y recursos
                del host desde una única consola administrativa.
              </p>

            </div>


            <div className="hidden min-w-[225px] rounded-[20px] border border-[#dce7e2] bg-white/80 p-5 shadow-sm backdrop-blur-sm lg:block">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF7F1] text-[#1C7F62]">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>

                  <p className="text-[12px] font-black uppercase tracking-[0.13em] text-[#94A3B8]">
                    Acceso
                  </p>

                  <p className="mt-0.5 text-[16px] font-black text-[#172838]">
                    Administración
                  </p>

                </div>

              </div>


              <p className="mt-4 text-[13px] leading-6 text-[#64748B]">
                Las acciones críticas quedan separadas de la gestión cotidiana
                de proyectos.
              </p>

            </div>

          </div>

        </section>


        {/* =====================================================
            NOTIFICATION
        ====================================================== */}
        {notification && (
          <div className="fade-slide-down mb-6 flex items-center justify-between gap-3 rounded-2xl border border-[#b9ddcd] bg-[#edf9f3] p-4 text-[14px] font-bold leading-6 text-[#176c53]">

            <div className="flex items-center gap-2.5">

              <CheckCircle2 className="h-5 w-5 shrink-0" />

              {notification}

            </div>

            <button
              type="button"
              onClick={() =>
                setNotification(null)
              }
              aria-label="Cerrar notificación"
              className="btn-tactile flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] hover:bg-white/60"
            >
              <X className="h-4 w-4" />
            </button>

          </div>
        )}


        {/* =====================================================
            LOADING
        ====================================================== */}
        {loading ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-[#dce7e2] bg-white shadow-[0_12px_35px_rgba(23,40,56,0.035)]">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF7F1]">
              <Loader2 className="h-7 w-7 animate-spin text-[#28B586]" />
            </div>

            <p className="mt-5 text-[18px] font-black text-[#172838]">
              Consultando la plataforma
            </p>

            <p className="mt-1.5 text-[14px] font-medium text-[#94A3B8]">
              Cargando métricas y recursos administrativos...
            </p>

          </div>
        ) : error ? (

          /* ===================================================
              ERROR
          ==================================================== */
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-[#dce7e2] bg-white px-6 text-center shadow-[0_12px_35px_rgba(23,40,56,0.035)]">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-[22px] font-black text-[#172838]">
              Consola administrativa no disponible
            </h2>

            <p className="mt-2 max-w-lg text-[15px] leading-7 text-[#64748B]">
              {error}
            </p>

            <button
              type="button"
              onClick={fetchData}
              className="btn-tactile mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#172838] px-5 py-3 text-[14px] font-black text-white transition hover:bg-[#1F3141]"
            >
              <RefreshCw className="h-5 w-5" />
              Intentar nuevamente
            </button>

          </div>

        ) : (
          <>

            {/* =================================================
                KPI OVERVIEW
            ================================================== */}
            <section className="mb-7">

              <div className="mb-4">

                <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#28B586]">
                  Resumen de plataforma
                </p>

                <h2 className="mt-1 text-[22px] font-black text-[#172838]">
                  Estado general de Codrop
                </h2>

              </div>


              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

                <KpiCard
                  icon={Users}
                  label="Usuarios"
                  value={
                    summary.total_users ?? 0
                  }
                  caption="registrados"
                />

                <KpiCard
                  icon={DollarSign}
                  label="Ingresos acumulados"
                  value={`$${Number(
                    summary.total_revenue_simulated ||
                      0
                  ).toFixed(2)}`}
                  caption="facturación registrada"
                  accent
                />

                <KpiCard
                  icon={Server}
                  label="Sitios activos"
                  value={`${
                    summary.active_instances ??
                    0
                  } / ${
                    summary.total_instances ??
                    0
                  }`}
                  caption="activos / totales"
                />

                <KpiCard
                  icon={Cpu}
                  label="CPU host"
                  value={formatMetric(
                    host.cpu_usage_percent,
                    '%'
                  )}
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
                    host.memory_used_mb !==
                      undefined &&
                    host.memory_total_mb !==
                      undefined
                      ? `${(
                          Number(
                            host.memory_used_mb
                          ) / 1024
                        ).toFixed(
                          1
                        )} / ${(
                          Number(
                            host.memory_total_mb
                          ) / 1024
                        ).toFixed(1)} GB`
                      : 'uso global'
                  }
                />

              </div>

            </section>


            {/* =================================================
                PROJECTS
            ================================================== */}
            <section className="mb-7 overflow-hidden rounded-[24px] border border-[#dce7e2] bg-white shadow-[0_16px_45px_rgba(23,40,56,0.055)]">

              <div className="relative flex flex-col gap-3 border-b border-[#e9efec] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-[#28B586]" />

                <div>

                  <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#28B586]">
                    Supervisión multi-inquilino
                  </p>

                  <h2 className="mt-1 text-[22px] font-black text-[#172838]">
                    Proyectos en la plataforma
                  </h2>

                  <p className="mt-1 text-[14px] font-medium leading-6 text-[#64748B]">
                    Estado, propietario, recursos y acciones administrativas.
                  </p>

                </div>


                <span className="w-fit rounded-full border border-[#e2e8e5] bg-[#f3f6f4] px-3 py-1.5 text-[12px] font-black text-[#64748B]">
                  {instances.length}{' '}
                  {instances.length === 1
                    ? 'proyecto'
                    : 'proyectos'}
                </span>

              </div>


              {instances.length === 0 ? (
                <div className="px-6 py-14 text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f8fbf9] text-[#94A3B8]">
                    <Server className="h-6 w-6" />
                  </div>

                  <p className="mt-4 text-[16px] font-black text-[#172838]">
                    No hay proyectos registrados
                  </p>

                </div>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full min-w-[1220px] border-collapse text-left">

                    <thead>

                      <tr className="border-b border-[#e9efec] bg-[#f8fbf9] text-[12px] font-black uppercase tracking-[0.12em] text-[#94A3B8]">

                        <th className="px-5 py-4">
                          Proyecto
                        </th>

                        <th className="px-5 py-4">
                          Propietario
                        </th>

                        <th className="px-5 py-4">
                          Plan
                        </th>

                        <th className="px-5 py-4">
                          Puerto
                        </th>

                        <th className="px-5 py-4">
                          CPU
                        </th>

                        <th className="px-5 py-4">
                          RAM
                        </th>

                        <th className="px-5 py-4">
                          Estado
                        </th>

                        <th className="px-5 py-4 text-right">
                          Contingencia
                        </th>

                      </tr>

                    </thead>


                    <tbody className="divide-y divide-[#edf1ef]">

                      {instances.map(
                        (instance) => (
                          <tr
                            key={instance.id}
                            className="transition hover:bg-[#f9fcfa]"
                          >

                            {/* Project */}
                            <td className="px-5 py-4">

                              <div className="flex items-center gap-3">

                                <ServerMascot
                                  status={
                                    instance.status
                                  }
                                  size="sm"
                                />

                                <div className="min-w-0">

                                  <div className="max-w-[220px] truncate text-[15px] font-black text-[#172838]">
                                    {instance.name}
                                  </div>

                                  <div className="mt-1 font-mono text-[12px] font-medium text-[#94A3B8]">
                                    #{instance.id}
                                  </div>

                                </div>

                              </div>

                            </td>


                            {/* Owner */}
                            <td className="px-5 py-4">

                              <div className="text-[14px] font-bold text-[#475569]">
                                {instance.owner_name ||
                                  'Usuario Codrop'}
                              </div>

                              <div className="mt-1 max-w-[240px] truncate text-[12px] font-medium text-[#94A3B8]">
                                {instance.owner_email ||
                                  '—'}
                              </div>

                            </td>


                            {/* Plan */}
                            <td className="px-5 py-4">

                              <span className="rounded-full border border-[#CFE4D6] bg-[#EAF7F1] px-2.5 py-1.5 text-[12px] font-black text-[#1C7F62]">
                                {instance.plan_name ||
                                  'Free'}
                              </span>

                            </td>


                            {/* Port */}
                            <td className="px-5 py-4 font-mono text-[14px] font-black text-[#334e5e]">
                              {instance.assigned_port ||
                                '—'}
                            </td>


                            {/* CPU */}
                            <td className="px-5 py-4 text-[14px] font-black text-[#334e5e]">
                              {formatMetric(
                                instance.cpu_usage_percent ??
                                  instance.cpu_percent,
                                '%'
                              )}
                            </td>


                            {/* RAM */}
                            <td className="px-5 py-4 text-[14px] font-black text-[#334e5e]">

                              {instance.memory_usage_mb !==
                              undefined
                                ? `${Number(
                                    instance.memory_usage_mb
                                  ).toFixed(1)} MB`
                                : instance.ram_usage_mb !==
                                    undefined
                                  ? `${Number(
                                      instance.ram_usage_mb
                                    ).toFixed(
                                      1
                                    )} MB`
                                  : '—'}

                            </td>


                            {/* Status */}
                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-black uppercase tracking-wide ${
                                  instance.status ===
                                  'running'
                                    ? 'border-[#b9ddcd] bg-[#edf9f3] text-[#176c53]'
                                    : 'border-[#e2e8e5] bg-[#f3f6f4] text-[#64748B]'
                                }`}
                              >

                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    instance.status ===
                                    'running'
                                      ? 'bg-[#28B586]'
                                      : 'bg-[#94A3B8]'
                                  }`}
                                />

                                {instance.status ||
                                  'unknown'}

                              </span>

                            </td>


                            {/* Contingency */}
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
                                    instance.status !==
                                    'running'
                                  }
                                  className="btn-tactile inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-black text-amber-700 transition duration-150 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Square className="h-3.5 w-3.5" />
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
                                  className="btn-tactile inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-black text-red-600 transition duration-150 hover:bg-red-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Forzar eliminación
                                </button>

                              </div>

                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </section>


            {/* =================================================
                USERS
            ================================================== */}
            <section className="overflow-hidden rounded-[24px] border border-[#dce7e2] bg-white shadow-[0_16px_45px_rgba(23,40,56,0.055)]">

              <div className="relative flex flex-col gap-3 border-b border-[#e9efec] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-[#172838]" />

                <div>

                  <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#28B586]">
                    Usuarios
                  </p>

                  <h2 className="mt-1 text-[22px] font-black text-[#172838]">
                    Clientes observados
                  </h2>

                  <p className="mt-1 text-[14px] font-medium leading-6 text-[#64748B]">
                    Vista construida con los datos disponibles en la consola
                    administrativa.
                  </p>

                </div>


                <span className="w-fit rounded-full border border-[#e2e8e5] bg-[#f3f6f4] px-3 py-1.5 text-[12px] font-black text-[#64748B]">
                  {users.length}{' '}
                  {users.length === 1
                    ? 'usuario'
                    : 'usuarios'}
                </span>

              </div>


              {users.length === 0 ? (
                <div className="px-6 py-12 text-center text-[14px] font-semibold text-[#94A3B8]">
                  No hay información de usuarios disponible.
                </div>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full min-w-[800px] border-collapse text-left">

                    <thead>

                      <tr className="border-b border-[#e9efec] bg-[#f8fbf9] text-[12px] font-black uppercase tracking-[0.12em] text-[#94A3B8]">

                        <th className="px-5 py-4">
                          Usuario
                        </th>

                        <th className="px-5 py-4">
                          Correo
                        </th>

                        <th className="px-5 py-4">
                          Plan actual
                        </th>

                        <th className="px-5 py-4">
                          Registro
                        </th>

                      </tr>

                    </thead>


                    <tbody className="divide-y divide-[#edf1ef]">

                      {users.map(
                        (user) => (
                          <tr
                            key={
                              user.id ||
                              user.email
                            }
                            className="transition hover:bg-[#f9fcfa]"
                          >

                            <td className="px-5 py-4 text-[14px] font-black text-[#172838]">
                              {user.name ||
                                'Usuario Codrop'}
                            </td>

                            <td className="px-5 py-4 text-[14px] font-semibold text-[#64748B]">
                              {user.email || '—'}
                            </td>

                            <td className="px-5 py-4">

                              <span className="rounded-full border border-[#CFE4D6] bg-[#EAF7F1] px-2.5 py-1.5 text-[12px] font-black text-[#1C7F62]">

                                {user.plan_name ||
                                  user.plan?.name ||
                                  'Free'}

                              </span>

                            </td>

                            <td className="px-5 py-4 text-[14px] font-semibold text-[#64748B]">
                              {formatDate(
                                user.created_at
                              )}
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </section>

          </>
        )}


        {/* =====================================================
            FORCE ACTION MODAL
        ====================================================== */}
        {selectedInstanceForAction && (
          <ModalLayer className="modal-backdrop-animate p-4">

            <div className="modal-dialog-animate w-full max-w-[520px] overflow-hidden rounded-[26px] border border-white/10 bg-white shadow-[0_35px_90px_rgba(9,24,34,0.4)]">

              {/* Modal header */}
              <div className="relative overflow-hidden bg-[#172838] px-6 py-6 text-white">

                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#28B586]/20 blur-2xl" />

                <button
                  type="button"
                  onClick={() =>
                    setSelectedInstanceForAction(
                      null
                    )
                  }
                  disabled={actionLoading}
                  aria-label="Cerrar modal"
                  className="btn-tactile absolute right-5 top-5 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-white/10 transition duration-150 hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>


                <div className="relative flex items-start gap-3.5 pr-12">

                  <ServerMascot
                    status={
                      actionType ===
                      'force_destroy'
                        ? 'destroying'
                        : 'stopped'
                    }
                    size="sm"
                  />


                  <div>

                    <p className="text-[12px] font-black uppercase tracking-[0.15em] text-[#6FE0BA]">
                      Acción administrativa
                    </p>

                    <h3 className="mt-1 text-[22px] font-black">
                      {actionType ===
                      'force_destroy'
                        ? 'Forzar eliminación'
                        : 'Forzar detención'}
                    </h3>

                  </div>

                </div>

              </div>


              {/* Modal body */}
              <div className="p-6">

                <p className="text-[15px] leading-7 text-[#64748B]">

                  Vas a intervenir el proyecto{' '}

                  <strong className="font-bold text-[#172838]">
                    {
                      selectedInstanceForAction.name
                    }
                  </strong>{' '}

                  perteneciente a{' '}

                  <strong className="font-bold text-[#172838]">
                    {selectedInstanceForAction.owner_email ||
                      'un usuario Codrop'}
                  </strong>.

                </p>


                {actionType ===
                  'force_destroy' && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-[14px] font-bold leading-6 text-red-700">

                    La eliminación forzosa es destructiva y puede liberar
                    definitivamente los recursos asociados a este proyecto.

                  </div>
                )}


                <div className="mt-5">

                  <label className="mb-2 block text-[14px] font-black text-[#334e5e]">
                    Motivo de auditoría
                  </label>

                  <textarea
                    value={actionReason}
                    onChange={(event) =>
                      setActionReason(
                        event.target.value
                      )
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-[#d6dfdb] bg-white px-4 py-3 text-[15px] font-semibold leading-6 text-[#172838] outline-none transition placeholder:text-[#94A3B8] focus:border-[#28B586] focus:ring-2 focus:ring-[#28B586]/10"
                  />

                </div>


                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#edf1ef] pt-5 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedInstanceForAction(
                        null
                      )
                    }
                    disabled={actionLoading}
                    className="btn-tactile cursor-pointer rounded-xl px-4 py-2.5 text-[14px] font-black text-[#64748B] transition duration-150 hover:bg-[#f3f6f4]"
                  >
                    Cancelar
                  </button>


                  <button
                    type="button"
                    onClick={
                      handleExecuteAction
                    }
                    disabled={
                      actionLoading ||
                      !actionReason.trim()
                    }
                    className={`btn-tactile inline-flex min-w-[190px] cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-black text-white transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                      actionType ===
                      'force_destroy'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-amber-500 hover:bg-amber-600'
                    }`}
                  >

                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Ejecutando...
                      </>
                    ) : actionType ===
                      'force_destroy' ? (
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

          </ModalLayer>
        )}

      </div>

    </div>
  );
}


/* =========================================================
   KPI CARD
========================================================= */

function KpiCard({
  icon: Icon,
  label,
  value,
  caption,
  accent = false,
}) {
  return (
    <article className="group relative overflow-hidden rounded-[22px] border border-[#dce7e2] bg-white p-5 shadow-[0_12px_35px_rgba(23,40,56,0.045)] transition duration-200 hover:border-[#c8ded5]">

      <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[#28B586] via-[#CFE4D6] to-transparent opacity-80" />

      <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-[#EAF7F1] transition-transform duration-300 group-hover:scale-110" />


      <div className="relative">

        <div className="flex items-center gap-2.5">

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#CFE4D6] bg-[#EAF7F1] text-[#1C7F62]">

            <Icon className="h-5 w-5" />

          </span>

          <span className="text-[12px] font-black uppercase leading-5 tracking-[0.11em] text-[#64748B]">
            {label}
          </span>

        </div>


        <div
          className={`mt-4 text-[28px] font-black leading-none tracking-[-0.03em] ${
            accent
              ? 'text-[#28B586]'
              : 'text-[#172838]'
          }`}
        >
          {value}
        </div>


        <p className="mt-2 text-[13px] font-semibold leading-5 text-[#94A3B8]">
          {caption}
        </p>

      </div>

    </article>
  );
}