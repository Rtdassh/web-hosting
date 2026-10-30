import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, AlertCircle, CheckCircle2, Loader2, Lock, Sparkles } from 'lucide-react';
import { validateLuhn, detectCardBrand, formatCardNumber } from '../../types/contracts_80_100';
import { billingService } from '../../services/api';

/**
 * CheckoutModal: Pasarela de pagos simulada con validación matemática en tiempo real (RF-09).
 * Valida el número de tarjeta con el Algoritmo de Luhn (Módulo 10).
 * Garantiza alto contraste en todos los campos y manejo seguro de errores de API.
 */
export default function CheckoutModal({ isOpen, onClose, selectedPlan, onSuccess }) {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState('2028');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !selectedPlan) return null;

  const isLuhnValid = validateLuhn(cardNumber);
  const cardBrand = detectCardBrand(cardNumber);
  const isFormComplete = cardNumber.replace(/\D/g, '').length >= 15 && cardHolder.trim().length >= 3 && cvv.length >= 3;

  const handleCardChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
    setError(null);
  };

  const handleUseDemoCard = () => {
    setCardNumber('4532 0151 1283 0366');
    setCardHolder('DEMO DEVELOPER');
    setExpMonth('12');
    setExpYear('2028');
    setCvv('123');
    setError(null);
  };

  const extractErrorMessage = (err) => {
    const detail = err.response?.data?.detail;
    if (!detail) return 'Error al procesar el pago con la entidad bancaria simulada.';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => (typeof d === 'string' ? d : d.msg || d.detail || JSON.stringify(d))).join('. ');
    }
    if (typeof detail === 'object') {
      return detail.message || JSON.stringify(detail);
    }
    return String(detail);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLuhnValid) {
      setError('El número de tarjeta no supera la validación matemática del Algoritmo de Luhn (Módulo 10).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        plan_id: selectedPlan.id,
        card_holder: cardHolder.toUpperCase(),
        card_number: cardNumber.replace(/\s+/g, ''),
        exp_month: parseInt(expMonth, 10),
        exp_year: parseInt(expYear, 10),
        cvv: cvv
      };

      const result = await billingService.checkout(payload);
      setLoading(false);
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setLoading(false);
      setError(extractErrorMessage(err));
    }
  };

  const planPrice = Number(selectedPlan.price || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
        {/* Header con identidad de marca Codrop */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Pasarela de Pago Segura</h2>
              <p className="text-xs text-slate-400">Validación matemática Luhn (Módulo 10)</p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">Plan a Contratar:</span>
              <div className="font-bold text-sm text-brand-300">{selectedPlan.name}</div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Total Mensual:</span>
              <div className="font-black text-lg text-emerald-400">${planPrice.toFixed(2)} USD</div>
            </div>
          </div>
        </div>

        {/* Botón de llenado rápido de prueba */}
        <div className="px-6 pt-4 pb-1 flex items-center justify-between bg-slate-50 border-b border-slate-100">
          <span className="text-[11px] text-slate-500 font-medium">Ambiente de Evaluación (Luhn M10)</span>
          <button
            type="button"
            onClick={handleUseDemoCard}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-bold border border-brand-200 transition"
          >
            <Sparkles className="w-3 h-3 text-brand-600" />
            Auto-llenar tarjeta válida
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Número de Tarjeta */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-800">Número de Tarjeta</label>
              {cardNumber.length > 0 && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isLuhnValid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isLuhnValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {isLuhnValid ? `Luhn Válido (${cardBrand})` : 'Checksum Inválido'}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="4532 0151 1283 0366"
                maxLength="19"
                value={cardNumber}
                onChange={handleCardChange}
                required
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono tracking-wider text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none transition ${
                  cardNumber.length > 0
                    ? isLuhnValid
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-red-400 ring-2 ring-red-500/20'
                    : 'border-slate-300 focus:border-brand-500'
                }`}
              />
              <div className="absolute right-3 top-2.5 text-xs font-bold text-slate-500 uppercase">
                {cardBrand}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Tarjeta de prueba: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono font-semibold">4532015112830366</code>
            </p>
          </div>

          {/* Titular */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Nombre del Titular</label>
            <input
              type="text"
              placeholder="JUAN PEREZ"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:border-brand-500 focus:outline-none font-medium"
            />
          </div>

          {/* Vencimiento y CVV */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Mes</label>
              <select
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:border-brand-500 font-medium"
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Año</label>
              <select
                value={expYear}
                onChange={(e) => setExpYear(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:border-brand-500 font-medium"
              >
                {[2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">CVV</label>
              <input
                type="password"
                maxLength="4"
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-center text-slate-900 bg-white placeholder:text-slate-400 focus:border-brand-500 focus:outline-none font-bold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Cifrado simulado SHA-256
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isFormComplete || !isLuhnValid || loading}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition ${
                  isFormComplete && isLuhnValid && !loading
                    ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validando con Banco...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Pagar ${planPrice.toFixed(2)}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
