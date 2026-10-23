import React from 'react';
import { X, CheckCircle, Printer, Download, FileText } from 'lucide-react';

/**
 * ReceiptModal: Comprobante digital inmutable de pago (RF-10).
 */
export default function ReceiptModal({ isOpen, onClose, invoice }) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold">Comprobante de Pago Digital</h2>
              <p className="text-xs text-slate-400">Transacción Aprobada</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400 font-mono">
            {invoice.invoice_number || `INV-2026-${invoice.id}`}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-700">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <span className="text-slate-500">Código de Autorización:</span>
            <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {invoice.auth_code || 'AUTH-7F9B2C'}
            </span>
          </div>

          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <span className="text-slate-500">Concepto / Plan:</span>
            <span className="font-bold text-slate-900">{invoice.plan_name || 'Developer Plan'}</span>
          </div>

          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <span className="text-slate-500">Método de Pago:</span>
            <span className="font-medium">{invoice.card_brand || 'Visa'} •••• {invoice.card_last_four || '0366'}</span>
          </div>

          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <span className="text-slate-500">Fecha de Emisión:</span>
            <span>{invoice.created_at ? new Date(invoice.created_at).toLocaleString() : new Date().toLocaleString()}</span>
          </div>

          {/* Breakdown */}
          <div className="bg-slate-50 p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>${((invoice.amount || 0) * 0.84).toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Impuestos (16% IVA):</span>
              <span>${(invoice.tax || (invoice.amount || 0) * 0.16).toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-200">
              <span>Total Pagado:</span>
              <span className="text-emerald-600">${Number(invoice.amount || 0).toFixed(2)} USD</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 transition"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button
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
