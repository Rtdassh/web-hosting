import ModalLayer from '../ui/ModalLayer';
import React from 'react';
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react';
import CopyButton from '../ui/CopyButton';

export default function ReceiptModal({ isOpen, onClose, invoice }) {
  if (!isOpen || !invoice) return null;

  const amount = Number(
    invoice.amount ?? invoice.amount_charged ?? 0
  );

  const hasTax =
    invoice.tax !== undefined &&
    invoice.tax !== null &&
    !Number.isNaN(Number(invoice.tax));

  const tax = hasTax ? Number(invoice.tax) : null;

  const subtotal =
    hasTax && tax <= amount
      ? Math.max(0, amount - tax)
      : null;

  const invoiceNumber =
    invoice.invoice_number ||
    `INV-2026-${invoice.id || invoice.transaction_id || '0001'}`;

  const dateValue =
    invoice.created_at || invoice.timestamp;

  const formattedDate = dateValue
    ? new Date(dateValue).toLocaleString('es-GT', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    : new Date().toLocaleString('es-GT', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  const handlePrint = () => {
    window.print();
  };

  return (
    <ModalLayer className="overflow-y-auto p-4 modal-backdrop-animate" onClose={onClose}>
      <div className="my-auto w-full max-w-[560px] overflow-hidden rounded-[28px] border border-[#dce8e1] bg-white shadow-[0_35px_90px_rgba(9,24,34,0.16)] modal-dialog-animate">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[#f2f8f5] via-[#eaf5ef] to-white border-b border-[#dce8e1] px-6 py-6 sm:px-7">
          <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-[#28B586]/15 blur-3xl" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar comprobante"
            className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-[#d6e5dd] bg-white text-slate-500 transition duration-150 btn-tactile cursor-pointer hover:bg-slate-50 hover:text-navy-900 shadow-sm"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative pr-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Transacción aprobada
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-200 text-emerald-600 shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-black tracking-[-0.02em] text-[#172838]">
                  Comprobante Codrop
                </h2>

                <p className="mt-0.5 text-xs font-medium text-[#64748B]">
                  Registro digital de tu cambio de suscripción
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#d6e6dc] bg-white/90 px-4 py-3 shadow-sm">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#71887e]">
                  Factura
                </p>

                <p className="mt-1 font-mono text-xs font-black text-[#1C7F62]">
                  {invoiceNumber}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#71887e]">
                  Estado
                </p>

                <p className="mt-1 text-xs font-black text-[#1C7F62] inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#28B586]" />
                  Aprobada
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt */}
        <div className="px-6 py-6 sm:px-7">
          <div className="space-y-4">
            <ReceiptRow
              label="Código de autorización"
              value={
                <span className="inline-flex items-center gap-2">
                  <span>{invoice.auth_code || '—'}</span>
                  {invoice.auth_code && (
                    <CopyButton
                      textToCopy={invoice.auth_code}
                      iconOnly
                      title="Copiar código de autorización"
                      className="!py-0.5 !px-1.5 text-[9px]"
                    />
                  )}
                </span>
              }
              mono
              accent
            />

            <ReceiptRow
              label="Plan contratado"
              value={invoice.plan_name || 'Plan Codrop'}
            />

            <ReceiptRow
              label="Método de pago"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-[#28B586]" />

                  {invoice.card_brand || 'Tarjeta'} ••••{' '}
                  {invoice.card_last_four || '—'}
                </span>
              }
            />

            <ReceiptRow
              label="Fecha de emisión"
              value={formattedDate}
            />
          </div>

          {/* Amount */}
          <div className="mt-6 rounded-2xl border border-[#dce7e2] bg-[#f8fbf9] p-4">
            {hasTax && (
              <>
                <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)} USD</span>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs font-semibold text-[#64748B]">
                  <span>Impuestos registrados</span>
                  <span>${tax.toFixed(2)} USD</span>
                </div>

                <div className="my-3 border-t border-[#dce7e2]" />
              </>
            )}

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#94A3B8]">
                  Total pagado
                </p>

                <p className="mt-1 text-[11px] font-semibold text-[#64748B]">
                  Pago confirmado
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black tracking-[-0.04em] text-[#172838]">
                  ${amount.toFixed(2)}
                </span>

                <span className="ml-1 text-[9px] font-black text-[#94A3B8]">
                  USD
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#edf1ef] pt-5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d6dfdb] bg-white px-4 py-3 text-xs font-black text-[#334e5e] transition duration-150 btn-tactile cursor-pointer hover:border-[#b9d8ca] hover:bg-[#f8fbf9] hover:text-[#1C7F62]"
            >
              <Printer className="h-4 w-4" />
              Imprimir / PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#28B586] hover:bg-[#239C76] px-4 py-3 text-xs font-black text-white shadow-[0_8px_20px_rgba(40,181,134,0.22)] transition duration-150 btn-tactile cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          <p className="mt-3 text-center text-[9px] font-semibold text-[#94A3B8]">
            Usa “Guardar como PDF” desde el diálogo de impresión para conservar
            una copia digital.
          </p>
        </div>
      </div>
    </ModalLayer>
  );
}

function ReceiptRow({
  label,
  value,
  mono = false,
  accent = false,
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-[#edf1ef] pb-4">
      <span className="text-xs font-semibold text-[#64748B]">
        {label}
      </span>

      <span
        className={`text-right text-xs font-black ${mono ? 'font-mono' : ''
          } ${accent
            ? 'rounded-lg border border-[#CFE4D6] bg-[#EAF7F1] px-2 py-1 text-[#1C7F62]'
            : 'text-[#172838]'
          }`}
      >
        {value}
      </span>
    </div>
  );
}