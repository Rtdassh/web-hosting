import React from 'react';
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#10202d]/75 p-4 backdrop-blur-md">
      <div className="my-auto w-full max-w-[560px] overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_35px_90px_rgba(9,24,34,0.38)]">
        {/* Header */}
        <div className="relative overflow-hidden bg-[#172838] px-6 py-6 text-white sm:px-7">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.055]"
            style={{
              backgroundImage:
                'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-[#28B586]/20 blur-3xl" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar comprobante"
            className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative pr-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#28B586]/30 bg-[#28B586]/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-[#7de0bd]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Transacción aprobada
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#28B586]/15 text-[#7de0bd]">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-black tracking-[-0.02em]">
                  Comprobante Codrop
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-400">
                  Registro digital de tu cambio de suscripción
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Factura
                </p>

                <p className="mt-1 font-mono text-xs font-black text-[#7de0bd]">
                  {invoiceNumber}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Estado
                </p>

                <p className="mt-1 text-xs font-black text-white">
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
              value={invoice.auth_code || '—'}
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
                  Operación simulada
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

          {/* Academic notice */}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#e5ece8] bg-white p-3.5">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#28B586]" />

            <p className="text-[10px] font-semibold leading-4 text-[#64748B]">
              Este comprobante corresponde a una transacción simulada dentro
              del entorno académico de Codrop.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#edf1ef] pt-5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d6dfdb] bg-white px-4 py-3 text-xs font-black text-[#334e5e] transition hover:border-[#b9d8ca] hover:bg-[#f8fbf9] hover:text-[#1C7F62]"
            >
              <Printer className="h-4 w-4" />
              Imprimir / PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#172838] px-4 py-3 text-xs font-black text-white transition hover:bg-[#1F3141]"
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
    </div>
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
        className={`text-right text-xs font-black ${
          mono ? 'font-mono' : ''
        } ${
          accent
            ? 'rounded-lg border border-[#CFE4D6] bg-[#EAF7F1] px-2 py-1 text-[#1C7F62]'
            : 'text-[#172838]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}