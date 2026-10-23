import React, { useState, useEffect } from 'react';
import { Check, Zap, Server, Shield, ArrowRight, ArrowLeft, RefreshCw, AlertTriangle, FileText } from 'lucide-react';
import { billingService } from '../services/api';
import CheckoutModal from '../components/billing/CheckoutModal';
import ReceiptModal from '../components/billing/ReceiptModal';

/**
 * PricingPage: Catálogo comparativo de planes y gestión de suscripciones (RF-07, RF-08, RF-11).
 */
export default function PricingPage({ currentPlan = 'Free', onBack, onGoToBilling }) {
  const [plans, setPlans] = useState([
    {
      id: 1,
      name: 'Free',
      description: 'Ideal para prototipos personales y proyectos de prueba.',
      price: 0.0,
      max_instances: 1,
      max_ram_mb: 128,
      cpu_quota: 0.25,
      features: ['1 sitio estático activo', '128 MB RAM por contenedor', '0.25 vCPU dedicada', 'Aislamiento cgroup estándar', 'Soporte comunitario']
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
      features: ['Hasta 3 sitios simultáneos', '256 MB RAM por contenedor', '0.50 vCPU dedicada', 'Aislamiento de red dedicado', 'Monitoreo de telemetría P95', 'Soporte prioritario']
    },
    {
      id: 3,
      name: 'Pro',
      description: 'Rendimiento y capacidad máxima para aplicaciones con alto tráfico.',
      price: 24.99,
      max_instances: 10,
      max_ram_mb: 512,
      cpu_quota: 1.00,
      features: ['Hasta 10 sitios simultáneos', '512 MB RAM por contenedor', '1.00 vCPU dedicada', 'Contención estricta Anti-OOM', 'Soporte 24/7 y SLAs']
    }
  ]);

  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [activePlanName, setActivePlanName] = useState(currentPlan);
  const [latestInvoice, setLatestInvoice] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    // Intentar cargar catálogo dinámico desde el backend
    billingService.getPlans()
      .then((data) => {
        if (data && data.length > 0) {
          // Fusionar con descripciones y features para presentación rica
          setPlans((prev) => prev.map((p) => {
            const apiMatch = data.find((d) => d.id === p.id || d.name === p.name);
            return apiMatch ? { ...p, ...apiMatch } : p;
          }));
        }
      })
      .catch((e) => console.log('Usando planes predeterminados:', e));
  }, []);

  const handlePlanAction = async (plan) => {
    setActionMessage(null);
    setErrorMessage(null);

    if (plan.name === activePlanName) {
      return; // Ya es el plan actual
    }

    // Si es un plan de pago superior -> Abrir CheckoutModal
    if (plan.price > 0 && plan.name !== 'Free') {
      setSelectedPlanForCheckout(plan);
      return;
    }

    // Si es Downgrade al plan Free
    if (window.confirm(`¿Seguro que deseas cambiar al plan ${plan.name}? Si tienes más sitios de los permitidos, deberás detenerlos primero.`)) {
      try {
        const res = await billingService.changePlan(plan.id);
        setActivePlanName(plan.name);
        setActionMessage(res.message || `Suscripción actualizada exitosamente a ${plan.name}.`);
      } catch (err) {
        setErrorMessage(err.response?.data?.detail || 'No se pudo realizar el cambio de plan.');
      }
    }
  };

  const handleCheckoutSuccess = (receiptData) => {
    setActivePlanName(receiptData.plan_name);
    setLatestInvoice(receiptData);
    setIsReceiptOpen(true);
    setActionMessage(`¡Felicitaciones! Has actualizado tu suscripción al plan ${receiptData.plan_name}.`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Dashboard
          </button>
          {onGoToBilling && (
            <button
              onClick={onGoToBilling}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-400 transition"
            >
              <FileText className="w-4 h-4" /> Historial de Facturas
            </button>
          )}
        </div>

        {/* Title Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Planes Parametrizados (RF-07, RF-08)
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-3 mb-3">
            Elige la Potencia que Necesita tu Proyecto
          </h1>
          <p className="text-sm text-slate-400">
            Infraestructura dedicada, contenedores ultraligeros Nginx Alpine y cuotas de hardware garantizadas.
          </p>
        </div>

        {/* Alerts */}
        {actionMessage && (
          <div className="mb-8 max-w-2xl mx-auto p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-3">
            <Check className="w-5 h-5 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mb-8 max-w-2xl mx-auto p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrent = plan.name.toLowerCase() === activePlanName.toLowerCase();
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 relative ${
                  plan.popular
                    ? 'bg-slate-800/90 border-2 border-indigo-500 shadow-xl shadow-indigo-500/10'
                    : 'bg-slate-800/40 border border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-md">
                    Más Popular
                  </span>
                )}

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>
                    </div>
                    {isCurrent && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Plan Activo
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="my-6">
                    <span className="text-4xl font-black text-white">${plan.price.toFixed(2)}</span>
                    <span className="text-xs text-slate-400 ml-1">/ mes</span>
                  </div>

                  {/* Hard Quotas Badge */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/50 space-y-1.5 mb-6 text-xs font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span>Sitios Permitidos:</span>
                      <strong className="text-indigo-400">{plan.max_instances}</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>RAM / Contenedor:</span>
                      <strong className="text-indigo-400">{plan.max_ram_mb} MB</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Cuota de CPU:</span>
                      <strong className="text-indigo-400">{plan.cpu_quota} vCPU</strong>
                    </div>
                  </div>

                  {/* Feature List */}
                  <ul className="space-y-2.5 text-xs text-slate-300 mb-8">
                    {(plan.features || []).map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handlePlanAction(plan)}
                  disabled={isCurrent}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                    isCurrent
                      ? 'bg-slate-700/50 text-slate-400 cursor-default'
                      : plan.popular
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {isCurrent ? (
                    'Tu Plan Actual'
                  ) : plan.price > 0 ? (
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
