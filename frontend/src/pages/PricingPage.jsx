import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Cpu,
  FileText,
  Layers3,
  MemoryStick,
  Server,
  Sparkles,
  Zap,
} from 'lucide-react';

import { billingService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CheckoutModal from '../components/billing/CheckoutModal';
import ReceiptModal from '../components/billing/ReceiptModal';

const PLAN_ORDER = {
  free: 0,
  developer: 1,
  pro: 2,
};

const DEFAULT_PLANS = [
  {
    id: 1,
    name: 'Free',
    description:
      'Una base simple para aprender, experimentar y publicar tu primer proyecto.',
    price: 0,
    max_instances: 1,
    max_ram_mb: 128,
    cpu_quota: 0.25,
    features: [
      '1 sitio activo',
      '128 MB RAM por contenedor',
      '0.25 vCPU dedicada',
      'Despliegue mediante .zip',
      'Telemetría básica',
    ],
  },
  {
    id: 2,
    name: 'Developer',
    description:
      'El equilibrio ideal para desarrollar, probar y mantener varios proyectos en línea.',
    price: 9.99,
    max_instances: 3,
    max_ram_mb: 256,
    cpu_quota: 0.5,
    popular: true,
    features: [
      'Hasta 3 sitios simultáneos',
      '256 MB RAM por contenedor',
      '0.50 vCPU dedicada',
      'Plantillas en 1 clic',
      'Telemetría y logs',
      'Mayor capacidad de despliegue',
    ],
  },
  {
    id: 3,
    name: 'Pro',
    description:
      'Más capacidad para equipos, portafolios grandes y proyectos con mayores exigencias.',
    price: 24.99,
    max_instances: 10,
    max_ram_mb: 512,
    cpu_quota: 1,
    features: [
      'Hasta 10 sitios simultáneos',
      '512 MB RAM por contenedor',
      '1.00 vCPU dedicada',
      'Plantillas en 1 clic',
      'Telemetría completa',
      'Máxima capacidad Codrop',
    ],
  },
];

export default function PricingPage({
  currentPlan = 'Free',
  onBack,
  onGoToBilling,
}) {
  const { user, refreshUser } = useAuth();

  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [activePlanName, setActivePlanName] = useState(
    user?.plan?.name || currentPlan || 'Free'
  );

  const [latestInvoice, setLatestInvoice] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const [actionMessage, setActionMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  useEffect(() => {
    if (user?.plan?.name) {
      setActivePlanName(user.plan.name);
    }
  }, [user]);

  useEffect(() => {
    billingService
      .getPlans()
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) return;

        setPlans((previousPlans) =>
          previousPlans.map((plan) => {
            const match = data.find(
              (item) =>
                item.id === plan.id ||
                item.name?.toLowerCase() === plan.name.toLowerCase()
            );

            return match ? { ...plan, ...match } : plan;
          })
        );
      })
      .catch((error) => {
        console.log('Usando catálogo local de planes:', error);
      });
  }, []);

  const activePlanRank = useMemo(() => {
    return PLAN_ORDER[activePlanName?.toLowerCase()] ?? 0;
  }, [activePlanName]);

  const safeExtractError = (error) => {
    const detail = error.response?.data?.detail;

    if (!detail) {
      return 'No se pudo realizar el cambio de plan.';
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

  const changePlanWithoutCheckout = async (plan) => {
    const confirmed = window.confirm(
      `¿Deseas cambiar tu suscripción de ${activePlanName} a ${plan.name}?\n\n` +
        'Si tu cuenta supera las cuotas del nuevo plan, Codrop bloqueará el cambio hasta que reduzcas tus sitios activos.'
    );

    if (!confirmed) return;

    setIsChangingPlan(true);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const response = await billingService.changePlan(plan.id);

      setActivePlanName(plan.name);
      setActionMessage(
        response?.message ||
          `Tu suscripción ahora utiliza el plan ${plan.name}.`
      );

      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      setErrorMessage(safeExtractError(error));
    } finally {
      setIsChangingPlan(false);
    }
  };

  const handlePlanAction = async (plan) => {
    setActionMessage(null);
    setErrorMessage(null);

    const targetRank = PLAN_ORDER[plan.name?.toLowerCase()] ?? 0;

    if (targetRank === activePlanRank) {
      return;
    }

    const isUpgrade = targetRank > activePlanRank;

    if (isUpgrade && Number(plan.price) > 0) {
      setSelectedPlanForCheckout(plan);
      return;
    }

    await changePlanWithoutCheckout(plan);
  };

  const handleCheckoutSuccess = async (receiptData) => {
    setActivePlanName(receiptData.plan_name);
    setLatestInvoice(receiptData);
    setIsReceiptOpen(true);

    setActionMessage(
      `Tu suscripción fue actualizada correctamente al plan ${receiptData.plan_name}.`
    );

    if (refreshUser) {
      await refreshUser();
    }
  };

  const getPlanActionLabel = (plan) => {
    const rank = PLAN_ORDER[plan.name?.toLowerCase()] ?? 0;

    if (rank === activePlanRank) {
      return 'Plan actual';
    }

    if (rank > activePlanRank) {
      return `Mejorar a ${plan.name}`;
    }

    return `Cambiar a ${plan.name}`;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f9f7] px-5 py-8 text-[#172838] sm:px-6 lg:px-10">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-24 h-80 w-80 rounded-full bg-[#28B586]/[0.07] blur-3xl" />
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-[#1F3141]/[0.05] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
            backgroundSize: '34px 34px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1280px]">
        {/* Top actions */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#dce7e2] bg-white px-4 py-2.5 text-xs font-bold text-[#334e5e] shadow-sm transition hover:border-[#b9d8ca] hover:text-[#1C7F62]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a mis proyectos
          </button>

          {onGoToBilling && (
            <button
              type="button"
              onClick={onGoToBilling}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#dce7e2] bg-white px-4 py-2.5 text-xs font-bold text-[#334e5e] shadow-sm transition hover:border-[#b9d8ca] hover:text-[#1C7F62]"
            >
              <FileText className="h-4 w-4 text-[#28B586]" />
              Ver facturación
            </button>
          )}
        </div>

        {/* Hero */}
        <section className="relative mb-10 overflow-hidden rounded-[28px] border border-[#dce7e2] bg-white px-6 py-8 shadow-[0_18px_50px_rgba(23,40,56,0.06)] md:px-9 md:py-9">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-bl-[120px] bg-[#EAF7F1]" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#CFE4D6] bg-[#EAF7F1] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#1C7F62]">
                <Sparkles className="h-3.5 w-3.5" />
                Planes Codrop
              </div>

              <h1 className="max-w-3xl text-3xl font-black tracking-[-0.035em] text-[#172838] sm:text-4xl lg:text-[46px] lg:leading-[1.05]">
                La capacidad que necesitas,
                <span className="text-[#28B586]"> sin complicaciones.</span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-[#64748B]">
                Empieza gratis y escala cuando tu proyecto lo necesite.
                Cada plan define cuántos sitios puedes publicar y los recursos
                disponibles para cada contenedor.
              </p>
            </div>

            <div className="relative min-w-[220px] rounded-2xl border border-[#dce7e2] bg-[#f8fbf9] p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">
                <Zap className="h-4 w-4 text-[#28B586]" />
                Tu suscripción
              </div>

              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-[#172838]">
                  {activePlanName}
                </span>
                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#EAF7F1] px-2 py-1 text-[10px] font-black uppercase text-[#1C7F62]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#28B586]" />
                  Activo
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-[#64748B]">
                Los cambios de cuota se aplican a tu cuenta después de aprobar
                la operación.
              </p>
            </div>
          </div>
        </section>

        {/* Feedback */}
        {actionMessage && (
          <div className="mx-auto mb-7 flex max-w-3xl items-start gap-3 rounded-2xl border border-[#b9ddcd] bg-[#edf9f3] p-4 text-sm font-semibold text-[#176c53]">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-auto mb-7 flex max-w-3xl items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Plans */}
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const planRank = PLAN_ORDER[plan.name?.toLowerCase()] ?? 0;
            const isCurrent = planRank === activePlanRank;
            const isUpgrade = planRank > activePlanRank;
            const isDowngrade = planRank < activePlanRank;

            const price = Number(plan.price || 0);

            return (
              <article
                key={plan.id}
                className={`relative flex min-h-[590px] flex-col overflow-hidden rounded-[26px] border bg-white p-6 transition duration-300 ${
                  plan.popular
                    ? 'border-[#28B586] shadow-[0_22px_55px_rgba(40,181,134,0.13)] lg:-translate-y-2'
                    : isCurrent
                    ? 'border-[#9ed5bf] shadow-[0_18px_45px_rgba(23,40,56,0.08)]'
                    : 'border-[#dce7e2] shadow-[0_12px_35px_rgba(23,40,56,0.045)] hover:-translate-y-1 hover:border-[#b9d8ca]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute right-5 top-5 rounded-full bg-[#172838] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-white">
                    Recomendado
                  </div>
                )}

                <div>
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF7F1] text-[#1C7F62]">
                    {plan.name === 'Free' && <Server className="h-5 w-5" />}
                    {plan.name === 'Developer' && (
                      <Zap className="h-5 w-5" />
                    )}
                    {plan.name === 'Pro' && (
                      <Layers3 className="h-5 w-5" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black text-[#172838]">
                      {plan.name}
                    </h2>

                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#b9ddcd] bg-[#edf9f3] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#176c53]">
                        <Check className="h-3 w-3" />
                        Plan actual
                      </span>
                    )}
                  </div>

                  <p className="mt-3 min-h-[60px] text-sm leading-6 text-[#64748B]">
                    {plan.description}
                  </p>

                  <div className="mt-5 border-b border-[#edf1ef] pb-5">
                    <div className="flex items-end gap-1.5">
                      <span className="text-[42px] font-black leading-none tracking-[-0.04em] text-[#172838]">
                        ${price.toFixed(2)}
                      </span>
                      <span className="mb-1 text-xs font-bold text-[#94A3B8]">
                        USD / mes
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] font-medium text-[#94A3B8]">
                      Facturación simulada para el entorno Codrop
                    </p>
                  </div>
                </div>

                {/* Resource cards */}
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-[#e5ece8] bg-[#f8fbf9] p-3">
                    <Server className="mb-2 h-4 w-4 text-[#28B586]" />
                    <div className="text-lg font-black text-[#172838]">
                      {plan.max_instances}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
                      Sitios
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#e5ece8] bg-[#f8fbf9] p-3">
                    <MemoryStick className="mb-2 h-4 w-4 text-[#28B586]" />
                    <div className="text-lg font-black text-[#172838]">
                      {plan.max_ram_mb}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
                      MB RAM
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#e5ece8] bg-[#f8fbf9] p-3">
                    <Cpu className="mb-2 h-4 w-4 text-[#28B586]" />
                    <div className="text-lg font-black text-[#172838]">
                      {plan.cpu_quota}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
                      vCPU
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="mt-6 flex-1">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#94A3B8]">
                    Incluido en el plan
                  </p>

                  <div className="space-y-3">
                    {(plan.features || []).map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2.5 text-xs font-semibold leading-5 text-[#475569]"
                      >
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#EAF7F1]">
                          <Check className="h-2.5 w-2.5 text-[#1C7F62]" />
                        </span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action */}
                <div className="mt-7">
                  {isDowngrade && (
                    <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-amber-600">
                      Downgrade de suscripción
                    </p>
                  )}

                  {isUpgrade && (
                    <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#1C7F62]">
                      Upgrade de suscripción
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => handlePlanAction(plan)}
                    disabled={isCurrent || isChangingPlan}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-xs font-black transition ${
                      isCurrent
                        ? 'cursor-default border border-[#e2e8e5] bg-[#f3f6f4] text-[#94A3B8]'
                        : plan.popular
                        ? 'bg-[#28B586] text-white shadow-[0_10px_25px_rgba(40,181,134,0.22)] hover:bg-[#239C76]'
                        : 'bg-[#172838] text-white shadow-[0_10px_25px_rgba(23,40,56,0.12)] hover:bg-[#1F3141]'
                    }`}
                  >
                    {getPlanActionLabel(plan)}

                    {!isCurrent && (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs font-medium text-[#94A3B8]">
          <Sparkles className="h-3.5 w-3.5 text-[#28B586]" />
          De tu código a la web, con el plan que mejor se adapte a tu proyecto.
        </div>

        <CheckoutModal
          isOpen={Boolean(selectedPlanForCheckout)}
          onClose={() => setSelectedPlanForCheckout(null)}
          selectedPlan={selectedPlanForCheckout}
          onSuccess={handleCheckoutSuccess}
        />

        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          invoice={latestInvoice}
        />
      </div>
    </div>
  );
}