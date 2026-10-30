import React from 'react';
import { X, CheckCircle, Printer, FileText } from 'lucide-react';

/**
 * ReceiptModal: Comprobante digital inmutable de pago (RF-10).
 * Garantiza alto contraste y manejo seguro de atributos.
 */
export default function ReceiptModal({ isOpen, onClose, invoice }) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const amount = Number(invoice.amount ?? invoice.amount_charged ?? 0);
  const tax = Number(invoice.tax ?? (amount * 0.16));
  const subtotal = Math.max(0, amount - tax);
  const dateStr = invoice.created_at || invoice.timestamp;
  const formattedDate = dateStr ? new Date(dateStr).toLocaleString() : new Date().toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
            aria-label="Cerrar comprobante"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">Comprobante de Pago Digital</h2>
              <p className="text-xs text-slate-400">Transacción Aprobada (Luhn Simulado)</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-brand-300 font-mono font-semibold">
            {invoice.invoice_number || `INV-2026-${invoice.id || invoice.transaction_id || '0001'}`}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-700">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Código de Autorización:</span>
            <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
              {invoice.auth_code || 'AUTH-7F9B2C'}
            </span>
          </div>

          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Concepto / Plan:</span>
            <span className="font-bold text-slate-900">{invoice.plan_name || 'Plan de Hosting'}</span>
          </div>

          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Método de Pago:</span>
            <span className="font-semibold text-slate-800">
              {invoice.card_brand || 'Visa'} •••• {invoice.card_last_four || '0366'}
            </span>
          </div>

          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Fecha de Emisión:</span>
            <span className="font-medium text-slate-800">{formattedDate}</span>
          </div>

          {/* Breakdown */}
          <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Impuestos (16% IVA):</span>
              <span>${tax.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-200">
              <span>Total Pagado:</span>
              <span className="text-emerald-600">${amount.toFixed(2)} USD</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 transition"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition text-center"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
