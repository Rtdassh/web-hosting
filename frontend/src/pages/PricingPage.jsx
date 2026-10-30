import React, { useState, useEffect } from 'react';
import { Check, Zap, Server, Shield, ArrowRight, ArrowLeft, AlertTriangle, FileText, Sparkles } from 'lucide-react';
import { billingService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CheckoutModal from '../components/billing/CheckoutModal';
import ReceiptModal from '../components/billing/ReceiptModal';

/**
 * PricingPage: Catálogo comparativo de planes y gestión de suscripciones (RF-07, RF-08, RF-11).
 * Diseñado según el System Design de Codrop: fondos limpios, tarjetas blancas con bordes sutiles,
 * tipografía nítida y contraste óptimo (WCAG AA).
 */
export default function PricingPage({ currentPlan = 'Free', onBack, onGoToBilling }) {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState([
    {
      id: 1,
      name: 'Free',
      description: 'Ideal para prototipos personales, pruebas y proyectos estáticos sencillos.',
      price: 0.0,
      max_instances: 1,
      max_ram_mb: 128,
      cpu_quota: 0.25,
      features: [
        '1 sitio estático activo',
        '128 MB RAM por contenedor',
        '0.25 vCPU dedicada',
        'Aislamiento cgroup estándar',
        'Soporte comunitario'
      ]
    },
    {
      id: 2,
      name: 'Developer',
      description: 'Para profesionales y startups que requieren múltiples proyectos en vivo.',
      price: 9.99,
      max_instances: 3,
      max_ram_mb: 256,
      cpu_quota: 0.50,
      popular: true,
      features: [
        'Hasta 3 sitios simultáneos',
        '256 MB RAM por contenedor',
        '0.50 vCPU dedicada',
        'Aislamiento de red dedicado',
        'Monitoreo de telemetría P95',
        'Soporte prioritario'
      ]
    },
    {
      id: 3,
      name: 'Pro',
      description: 'Rendimiento y capacidad máxima para aplicaciones con alto tráfico.',
      price: 24.99,
      max_instances: 10,
      max_ram_mb: 512,
      cpu_quota: 1.00,
      features: [
        'Hasta 10 sitios simultáneos',
        '512 MB RAM por contenedor',
        '1.00 vCPU dedicada',
        'Contención estricta Anti-OOM',
        'Soporte 24/7 y SLAs'
      ]
    }
  ]);

  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [activePlanName, setActivePlanName] = useState(user?.plan?.name || currentPlan || 'Free');
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
    billingService.getPlans()
      .then((data) => {
        if (data && data.length > 0) {
          setPlans((prev) => prev.map((p) => {
            const apiMatch = data.find((d) => d.id === p.id || d.name.toLowerCase() === p.name.toLowerCase());
            return apiMatch ? { ...p, ...apiMatch } : p;
          }));
        }
      })
      .catch((e) => console.log('Usando planes predeterminados:', e));
  }, []);

  const safeExtractError = (err) => {
    const detail = err.response?.data?.detail;
    if (!detail) return 'No se pudo realizar el cambio de plan.';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => (typeof d === 'string' ? d : d.msg || d.detail || JSON.stringify(d))).join('. ');
    }
    if (typeof detail === 'object') {
      return detail.message || JSON.stringify(detail);
    }
    return String(detail);
  };

  const handlePlanAction = async (plan) => {
    setActionMessage(null);
    setErrorMessage(null);

    if (plan.name.toLowerCase() === activePlanName.toLowerCase()) {
      return;
    }

    // Si es un plan de pago -> Abrir CheckoutModal
    if (plan.price > 0 && plan.name.toLowerCase() !== 'free') {
      setSelectedPlanForCheckout(plan);
      return;
    }

    // Downgrade al plan Free
    if (window.confirm(`¿Seguro que deseas cambiar al plan ${plan.name}? Si tienes más sitios de los permitidos, deberás detenerlos o eliminarlos primero.`)) {
      setIsChangingPlan(true);
      try {
        const res = await billingService.changePlan(plan.id);
        setActivePlanName(plan.name);
        setActionMessage(res.message || `Suscripción actualizada exitosamente a ${plan.name}.`);
        if (refreshUser) refreshUser();
      } catch (err) {
        setErrorMessage(safeExtractError(err));
      } finally {
        setIsChangingPlan(false);
      }
    }
  };

  const handleCheckoutSuccess = (receiptData) => {
    setActivePlanName(receiptData.plan_name);
    setLatestInvoice(receiptData);
    setIsReceiptOpen(true);
    setActionMessage(`¡Felicitaciones! Has actualizado tu suscripción al plan ${receiptData.plan_name}.`);
    if (refreshUser) refreshUser();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 py-10 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-[#e2e8f0] shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4 text-brand-600" /> Volver al Dashboard
          </button>
          {onGoToBilling && (
            <button
              type="button"
              onClick={onGoToBilling}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#e2e8f0] text-xs font-bold text-slate-700 shadow-sm transition"
            >
              <FileText className="w-4 h-4 text-brand-600" /> Historial de Facturas
            </button>
          )}
        </div>

        {/* Title Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            Catálogo Oficial de Suscripciones
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mt-3 mb-2">
            Elige la Potencia para tu Proyecto
          </h1>
          <p className="text-sm text-slate-600 font-medium">
            Servidores web Nginx Alpine ultraligeros, aislamiento cgroup estricto y puertos dedicados sin contención.
          </p>
        </div>

        {/* Alerts */}
        {actionMessage && (
          <div className="mb-8 max-w-2xl mx-auto p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-3 shadow-sm">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mb-8 max-w-2xl mx-auto p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrent = plan.name.toLowerCase() === activePlanName.toLowerCase();
            const price = Number(plan.price || 0);

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-7 flex flex-col justify-between transition-all duration-200 relative bg-white border ${
                  plan.popular
                    ? 'border-brand-500 ring-2 ring-brand-500/15 shadow-xl'
                    : isCurrent
                    ? 'border-emerald-400 ring-2 ring-emerald-400/10 shadow-lg'
                    : 'border-[#e2e8f0] shadow-sm hover:border-slate-300'
                }`}
              >
                {/* Badge Superior */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                    {plan.popular && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full border border-brand-200">
                        Popular
                      </span>
                    )}
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Plan Activo
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 min-h-[38px] mb-5 leading-relaxed font-normal">
                  {plan.description}
                </p>

                {/* Precio */}
                <div className="mb-6 pb-6 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900">${price.toFixed(2)}</span>
                    <span className="text-xs font-semibold text-slate-500">/ mes</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Facturación mensual recurrente</span>
                </div>

                {/* Especificaciones Técnicas */}
                <div className="space-y-2 mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sitios Permitidos:</span>
                    <strong className="text-slate-900 font-bold">{plan.max_instances}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">RAM por Contenedor:</span>
                    <strong className="text-slate-900 font-bold">{plan.max_ram_mb} MB</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cuota de CPU:</span>
                    <strong className="text-slate-900 font-bold">{plan.cpu_quota} vCPU</strong>
                  </div>
                </div>

                {/* Características */}
                <div className="space-y-3 mb-8 flex-1">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Incluye:</p>
                  {(plan.features || []).map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Botón de Acción */}
                <button
                  type="button"
                  onClick={() => handlePlanAction(plan)}
                  disabled={isCurrent || isChangingPlan}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                      : plan.popular
                      ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20 cursor-pointer'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm cursor-pointer'
                  }`}
                >
                  {isCurrent ? (
                    'Tu Plan Actual'
                  ) : price > 0 ? (
                    <>
                      Contratar Plan con Luhn <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    'Cambiar a Plan Free'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Modal Checkout */}
        <CheckoutModal
          isOpen={!!selectedPlanForCheckout}
          onClose={() => setSelectedPlanForCheckout(null)}
          selectedPlan={selectedPlanForCheckout}
          onSuccess={handleCheckoutSuccess}
        />

        {/* Modal Recibo */}
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          invoice={latestInvoice}
        />
      </div>
    </div>
  );
}
