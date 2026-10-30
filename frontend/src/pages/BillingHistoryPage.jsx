import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, CheckCircle2, RefreshCw, CreditCard } from 'lucide-react';
import { billingService } from '../services/api';
import ReceiptModal from '../components/billing/ReceiptModal';

/**
 * BillingHistoryPage: Bitácora inmutable de compras, facturas y comprobantes (RF-10).
 * Diseñado bajo el System Design de Codrop con alta legibilidad y contrastes óptimos.
 */
export default function BillingHistoryPage({ onBack, onGoToPricing }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await billingService.getInvoices();
      setInvoices(data || []);
    } catch (err) {
      console.log('Error al cargar facturas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-[#e2e8f0] shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4 text-brand-600" /> Volver al Dashboard
          </button>
          {onGoToPricing && (
            <button
              type="button"
              onClick={onGoToPricing}
              className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs font-bold text-white shadow-sm shadow-brand-500/20 transition cursor-pointer"
            >
              Ver Catálogo de Planes
            </button>
          )}
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              <CreditCard className="w-3.5 h-3.5 text-brand-600" />
              Facturación & Pagos (RF-10)
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-2">
              Historial de Facturación y Comprobantes
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Registro inmutable de transacciones procesadas con validación Luhn y emisión electrónica.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchInvoices}
            disabled={loading}
            className="self-start sm:self-auto p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-[#e2e8f0] text-slate-700 shadow-sm transition"
            title="Refrescar facturas"
          >
            <RefreshCw className={`w-4 h-4 text-brand-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Invoices Table Card */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-xs font-medium text-slate-500">
              Cargando historial de compras...
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Aún no tienes facturas registradas</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                Cuando realices un Upgrade en la plataforma mediante la pasarela Luhn, tus comprobantes se registrarán aquí automáticamente.
              </p>
              {onGoToPricing && (
                <button
                  type="button"
                  onClick={onGoToPricing}
                  className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                >
                  Explorar Planes Disponibles
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-5">Factura #</th>
                    <th className="py-3.5 px-5">Plan</th>
                    <th className="py-3.5 px-5">Monto</th>
                    <th className="py-3.5 px-5">Autorización</th>
                    <th className="py-3.5 px-5">Método</th>
                    <th className="py-3.5 px-5">Fecha</th>
                    <th className="py-3.5 px-5 text-center">Estado</th>
                    <th className="py-3.5 px-5 text-right">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-brand-700">
                        {inv.invoice_number || `INV-2026-${inv.id}`}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        {inv.plan_name}
                      </td>
                      <td className="py-3.5 px-5 font-black text-slate-900">
                        ${Number(inv.amount || 0).toFixed(2)} USD
                      </td>
                      <td className="py-3.5 px-5 font-mono text-slate-600 font-medium">
                        {inv.auth_code}
                      </td>
                      <td className="py-3.5 px-5 text-slate-700 font-medium">
                        {inv.card_brand} •••• {inv.card_last_four}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 font-medium">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aprobada
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:text-brand-700 transition inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5 text-brand-600" /> Ver Recibo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Recibo */}
        <ReceiptModal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
        />
      </div>
    </div>
  );
}
