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
import { toast } from '../components/ui/Toast';
import { SkeletonTableRow } from '../components/ui/Skeleton';

export default function BillingHistoryPage({
  onBack,
  onGoToPricing,
}) {
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

  const fetchInvoices = async (
    showSuccessToast = false
  ) => {
    setLoading(true);
    setError(null);

    try {
      const data =
        await billingService.getInvoices();

      setInvoices(
        Array.isArray(data) ? data : []
      );

      if (showSuccessToast) {
        toast.success(
          'Historial de facturación actualizado.'
        );
      }
    } catch (requestError) {
      console.error(
        'Error al cargar facturas:',
        requestError
      );

      setInvoices([]);

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
    <div className="relative px-5 py-8 text-[#172838] sm:px-6 lg:px-8 xl:px-10">

      <div className="relative mx-auto max-w-[1280px]">

        {/* =====================================================
            NAVIGATION
        ====================================================== */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <button
            type="button"
            onClick={onBack}
            className="btn-tactile inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-[#dce7e2] bg-white px-4 py-2.5 text-[14px] font-bold text-[#334e5e] shadow-sm transition duration-150 hover:border-[#b9d8ca] hover:text-[#1C7F62]"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver a mis proyectos
          </button>

          {onGoToPricing && (
            <button
              type="button"
              onClick={onGoToPricing}
              className="btn-tactile inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-[#172838] px-4 py-2.5 text-[14px] font-black text-white shadow-sm transition duration-150 hover:bg-[#1F3141]"
            >
              Explorar planes
              <ArrowRight className="h-5 w-5" />
            </button>
          )}

        </div>

        {/* =====================================================
            HERO
        ====================================================== */}
        <section className="relative mb-8 overflow-hidden rounded-[28px] border border-[#dce7e2] bg-white px-6 py-8 shadow-[0_18px_50px_rgba(23,40,56,0.06)] md:px-9">

          <div className="absolute right-0 top-0 h-48 w-48 rounded-bl-[120px] bg-[#EAF7F1]" />

          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">

            <div>

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#CFE4D6] bg-[#EAF7F1] px-3.5 py-2 text-[13px] font-black uppercase tracking-[0.15em] text-[#1C7F62]">

                <ReceiptText className="h-4 w-4" />

                Facturación Codrop

              </div>

              <h1 className="max-w-3xl text-[34px] font-black tracking-[-0.035em] text-[#172838] sm:text-[40px]">

                Tus pagos,

                <span className="text-[#28B586]">
                  {' '}claros y organizados.
                </span>

              </h1>

              <p className="mt-3 max-w-2xl text-[17px] font-medium leading-7 text-[#64748B]">
                Consulta las transacciones asociadas a tus cambios de plan y
                abre cada comprobante digital cuando lo necesites.
              </p>

            </div>

            {/* Summary */}
            <div className="flex min-w-[220px] items-center gap-4 rounded-2xl border border-[#dce7e2] bg-[#f8fbf9] p-5">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF7F1] text-[#1C7F62]">

                <History className="h-6 w-6" />

              </div>

              <div>

                <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#94A3B8]">
                  Comprobantes
                </p>

                <p className="mt-1 text-[28px] font-black text-[#172838]">
                  {invoices.length}
                </p>

                <p className="text-[13px] font-semibold text-[#64748B]">
                  registrados
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            HEADER ACTIONS
        ====================================================== */}
        <div className="mb-4 flex items-center justify-between">

          <div>

            <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#94A3B8]">
              Historial
            </p>

            <h2 className="mt-1 text-[24px] font-black text-[#172838]">
              Transacciones y recibos
            </h2>

          </div>

          <button
            type="button"
            onClick={() =>
              fetchInvoices(true)
            }
            disabled={loading}
            title="Actualizar historial"
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

        {/* =====================================================
            MAIN CARD
        ====================================================== */}
        <div className="overflow-hidden rounded-[24px] border border-[#dce7e2] bg-white shadow-[0_16px_45px_rgba(23,40,56,0.055)]">

          {error ? (
            <div className="fade-slide-down flex min-h-[320px] flex-col items-center justify-center px-6 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">

                <AlertCircle className="h-7 w-7" />

              </div>

              <h3 className="mt-5 text-[21px] font-black text-[#172838]">
                No fue posible cargar la facturación
              </h3>

              <p className="mt-2 max-w-md text-[15px] leading-7 text-[#64748B]">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  fetchInvoices(true)
                }
                className="btn-tactile mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#172838] px-4 py-2.5 text-[14px] font-black text-white transition duration-150 hover:bg-[#1F3141]"
              >
                <RefreshCw className="h-5 w-5" />
                Intentar nuevamente
              </button>

            </div>
          ) : !loading &&
            invoices.length === 0 ? (
            <div className="scale-pop-in flex min-h-[340px] flex-col items-center justify-center px-6 text-center">

              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#dce7e2] bg-[#f8fbf9] text-[#1C7F62]">

                <FileText className="h-7 w-7" />

                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#EAF7F1] text-[#28B586]">

                  <Sparkles className="h-3 w-3" />

                </span>

              </div>

              <h3 className="mt-5 text-[21px] font-black text-[#172838]">
                Todavía no hay comprobantes
              </h3>

              <p className="mt-2 max-w-md text-[15px] leading-7 text-[#64748B]">
                Cuando completes un upgrade de plan, la transacción aprobada
                aparecerá aquí con su comprobante digital.
              </p>

              {onGoToPricing && (
                <button
                  type="button"
                  onClick={onGoToPricing}
                  className="btn-tactile mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#28B586] px-5 py-3 text-[14px] font-black text-white shadow-[0_10px_25px_rgba(40,181,134,0.2)] transition duration-150 hover:bg-[#239C76]"
                >
                  Explorar planes
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1040px] border-collapse text-left">

                <thead>

                  <tr className="border-b border-[#e9efec] bg-[#f8fbf9] text-[12px] font-black uppercase tracking-[0.13em] text-[#94A3B8]">

                    <th className="px-5 py-4">
                      Factura
                    </th>

                    <th className="px-5 py-4">
                      Plan
                    </th>

                    <th className="px-5 py-4">
                      Monto
                    </th>

                    <th className="px-5 py-4">
                      Autorización
                    </th>

                    <th className="px-5 py-4">
                      Método
                    </th>

                    <th className="px-5 py-4">
                      Fecha
                    </th>

                    <th className="px-5 py-4">
                      Estado
                    </th>

                    <th className="px-5 py-4 text-right">
                      Comprobante
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-[#edf1ef]">

                  {loading ? (
                    <>
                      <SkeletonTableRow columns={8} />
                      <SkeletonTableRow columns={8} />
                      <SkeletonTableRow columns={8} />
                    </>
                  ) : (
                    invoices.map(
                      (invoice) => (
                        <tr
                          key={
                            invoice.id ||
                            invoice.invoice_number
                          }
                          className="transition hover:bg-[#f9fcfa]"
                        >

                          {/* Invoice */}
                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF7F1] text-[#1C7F62]">

                                <ReceiptText className="h-5 w-5" />

                              </span>

                              <span className="font-mono text-[14px] font-black text-[#1C7F62]">
                                {invoice.invoice_number ||
                                  `INV-2026-${invoice.id}`}
                              </span>

                            </div>

                          </td>

                          {/* Plan */}
                          <td className="px-5 py-4 text-[14px] font-black text-[#172838]">
                            {invoice.plan_name ||
                              '—'}
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-4 text-[14px] font-black text-[#172838]">

                            $
                            {Number(
                              invoice.amount || 0
                            ).toFixed(2)}

                            <span className="ml-1 text-[11px] font-bold text-[#94A3B8]">
                              USD
                            </span>

                          </td>

                          {/* Auth */}
                          <td className="px-5 py-4 font-mono text-[13px] font-bold text-[#64748B]">
                            {invoice.auth_code ||
                              '—'}
                          </td>

                          {/* Method */}
                          <td className="px-5 py-4">

                            <div className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#475569]">

                              <CreditCard className="h-4 w-4 text-[#28B586]" />

                              {invoice.card_brand ||
                                'Tarjeta'}{' '}
                              ••••{' '}
                              {invoice.card_last_four ||
                                '—'}

                            </div>

                          </td>

                          {/* Date */}
                          <td className="px-5 py-4 text-[14px] font-semibold text-[#64748B]">
                            {formatDate(
                              invoice.created_at ||
                                invoice.timestamp
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">

                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b9ddcd] bg-[#edf9f3] px-2.5 py-1.5 text-[12px] font-black uppercase tracking-wide text-[#176c53]">

                              <CheckCircle2 className="h-3.5 w-3.5" />

                              Aprobada

                            </span>

                          </td>

                          {/* Receipt */}
                          <td className="px-5 py-4 text-right">

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedInvoice(
                                  invoice
                                )
                              }
                              className="btn-tactile inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce7e2] bg-white px-3.5 py-2 text-[13px] font-black text-[#334e5e] transition duration-150 hover:border-[#b9d8ca] hover:bg-[#f8fbf9] hover:text-[#1C7F62]"
                            >
                              <FileText className="h-4 w-4" />
                              Ver recibo
                            </button>

                          </td>

                        </tr>
                      )
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

        <ReceiptModal
          isOpen={Boolean(
            selectedInvoice
          )}
          onClose={() =>
            setSelectedInvoice(null)
          }
          invoice={selectedInvoice}
        />

      </div>

    </div>
  );
}