import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  History,
  ReceiptText,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

import { billingService } from '../services/api';
import ReceiptModal from '../components/billing/ReceiptModal';

export default function BillingHistoryPage({ onBack, onGoToPricing }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const extractErrorMessage = (requestError) => {
    const detail = requestError.response?.data?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    return 'No pudimos cargar tu historial de facturación. Verifica que el servicio de facturación esté disponible.';
  };

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await billingService.getInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error('Error al cargar facturas:', requestError);
      setInvoices([]);
      setError(extractErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f9f7] px-5 py-8 text-[#172838] sm:px-6 lg:px-10">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-24 h-80 w-80 rounded-full bg-[#28B586]/[0.07] blur-3xl" />
        <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-[#172838]/[0.04] blur-3xl" />

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
        {/* Navigation */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#dce7e2] bg-white px-4 py-2.5 text-xs font-bold text-[#334e5e] shadow-sm transition hover:border-[#b9d8ca] hover:text-[#1C7F62]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a mis proyectos
          </button>

          {onGoToPricing && (
            <button
              type="button"
              onClick={onGoToPricing}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#172838] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#1F3141]"
            >
              Explorar planes
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Hero */}
        <section className="relative mb-8 overflow-hidden rounded-[28px] border border-[#dce7e2] bg-white px-6 py-8 shadow-[0_18px_50px_rgba(23,40,56,0.06)] md:px-9">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-bl-[120px] bg-[#EAF7F1]" />

          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#CFE4D6] bg-[#EAF7F1] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.17em] text-[#1C7F62]">
                <ReceiptText className="h-3.5 w-3.5" />
                Facturación Codrop
              </div>

              <h1 className="max-w-3xl text-3xl font-black tracking-[-0.035em] text-[#172838] sm:text-4xl">
                Tus pagos,
                <span className="text-[#28B586]"> claros y organizados.</span>
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#64748B]">
                Consulta las transacciones asociadas a tus cambios de plan y
                abre cada comprobante digital cuando lo necesites.
              </p>
            </div>

            <div className="flex min-w-[220px] items-center gap-4 rounded-2xl border border-[#dce7e2] bg-[#f8fbf9] p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF7F1] text-[#1C7F62]">
                <History className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#94A3B8]">
                  Comprobantes
                </p>

                <p className="mt-1 text-2xl font-black text-[#172838]">
                  {invoices.length}
                </p>

                <p className="text-[11px] font-semibold text-[#64748B]">
                  registrados
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Header actions */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#94A3B8]">
              Historial
            </p>
            <h2 className="mt-1 text-xl font-black text-[#172838]">
              Transacciones y recibos
            </h2>
          </div>

          <button
            type="button"
            onClick={fetchInvoices}
            disabled={loading}
            title="Actualizar historial"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dce7e2] bg-white text-[#1C7F62] shadow-sm transition hover:border-[#b9d8ca] hover:bg-[#f8fbf9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Main card */}
        <div className="overflow-hidden rounded-[24px] border border-[#dce7e2] bg-white shadow-[0_16px_45px_rgba(23,40,56,0.055)]">
          {loading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <RefreshCw className="h-6 w-6 animate-spin text-[#28B586]" />

              <p className="mt-4 text-sm font-black text-[#172838]">
                Consultando tus comprobantes
              </p>

              <p className="mt-1 text-xs font-medium text-[#94A3B8]">
                Sincronizando el historial de facturación...
              </p>
            </div>
          ) : error ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <AlertCircle className="h-6 w-6" />
              </div>

              <h3 className="mt-5 text-lg font-black text-[#172838]">
                No fue posible cargar la facturación
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-[#64748B]">
                {error}
              </p>

              <button
                type="button"
                onClick={fetchInvoices}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#172838] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#1F3141]"
              >
                <RefreshCw className="h-4 w-4" />
                Intentar nuevamente
              </button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#dce7e2] bg-[#f8fbf9] text-[#1C7F62]">
                <FileText className="h-7 w-7" />

                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#EAF7F1] text-[#28B586]">
                  <Sparkles className="h-3 w-3" />
                </span>
              </div>

              <h3 className="mt-5 text-lg font-black text-[#172838]">
                Todavía no hay comprobantes
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-[#64748B]">
                Cuando completes un upgrade de plan, la transacción aprobada
                aparecerá aquí con su comprobante digital.
              </p>

              {onGoToPricing && (
                <button
                  type="button"
                  onClick={onGoToPricing}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#28B586] px-5 py-3 text-xs font-black text-white shadow-[0_10px_25px_rgba(40,181,134,0.2)] transition hover:bg-[#239C76]"
                >
                  Explorar planes
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e9efec] bg-[#f8fbf9] text-[10px] font-black uppercase tracking-[0.14em] text-[#94A3B8]">
                    <th className="px-5 py-4">Factura</th>
                    <th className="px-5 py-4">Plan</th>
                    <th className="px-5 py-4">Monto</th>
                    <th className="px-5 py-4">Autorización</th>
                    <th className="px-5 py-4">Método</th>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4 text-right">Comprobante</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#edf1ef]">
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id || invoice.invoice_number}
                      className="transition hover:bg-[#f9fcfa]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF7F1] text-[#1C7F62]">
                            <ReceiptText className="h-4 w-4" />
                          </span>

                          <span className="font-mono text-xs font-black text-[#1C7F62]">
                            {invoice.invoice_number ||
                              `INV-2026-${invoice.id}`}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs font-black text-[#172838]">
                        {invoice.plan_name || '—'}
                      </td>

                      <td className="px-5 py-4 text-xs font-black text-[#172838]">
                        ${Number(invoice.amount || 0).toFixed(2)}
                        <span className="ml-1 text-[9px] font-bold text-[#94A3B8]">
                          USD
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono text-[11px] font-bold text-[#64748B]">
                        {invoice.auth_code || '—'}
                      </td>

                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#475569]">
                          <CreditCard className="h-3.5 w-3.5 text-[#28B586]" />

                          {invoice.card_brand || 'Tarjeta'} ••••{' '}
                          {invoice.card_last_four || '—'}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-[#64748B]">
                        {formatDate(
                          invoice.created_at || invoice.timestamp
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b9ddcd] bg-[#edf9f3] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#176c53]">
                          <CheckCircle2 className="h-3 w-3" />
                          Aprobada
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(invoice)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#dce7e2] bg-white px-3.5 py-2 text-[11px] font-black text-[#334e5e] transition hover:border-[#b9d8ca] hover:bg-[#f8fbf9] hover:text-[#1C7F62]"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Ver recibo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ReceiptModal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
        />
      </div>
    </div>
  );
}