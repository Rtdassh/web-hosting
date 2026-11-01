import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

import {
  validateLuhn,
  detectCardBrand,
  formatCardNumber,
} from '../../types/contracts_80_100';

import { billingService } from '../../services/api';

export default function CheckoutModal({
  isOpen,
  onClose,
  selectedPlan,
  onSuccess,
}) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expMonth, setExpMonth] = useState(
    String(currentMonth).padStart(2, '0')
  );
  const [expYear, setExpYear] = useState(String(currentYear + 2));
  const [cvv, setCvv] = useState('');

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setCardNumber('');
    setCardHolder('');
    setExpMonth(String(currentMonth).padStart(2, '0'));
    setExpYear(String(currentYear + 2));
    setCvv('');
    setStatus('idle');
    setError(null);
  }, [isOpen, selectedPlan?.id]);

  const cleanCardNumber = cardNumber.replace(/\D/g, '');
  const cardBrand = detectCardBrand(cardNumber);
  const isLuhnValid = validateLuhn(cardNumber);

  const requiredCvvLength =
    cardBrand === 'American Express' ? 4 : 3;

  const isExpirationValid = useMemo(() => {
    const month = Number(expMonth);
    const year = Number(expYear);

    if (!month || month < 1 || month > 12 || !year) {
      return false;
    }

    if (year < currentYear) {
      return false;
    }

    if (year === currentYear && month < currentMonth) {
      return false;
    }

    return true;
  }, [expMonth, expYear, currentMonth, currentYear]);

  const isCardLengthValid =
    cleanCardNumber.length >= 15 && cleanCardNumber.length <= 16;

  const isFormComplete =
    isCardLengthValid &&
    cardHolder.trim().length >= 3 &&
    cvv.length === requiredCvvLength &&
    isExpirationValid;

  const canSubmit =
    isFormComplete &&
    isLuhnValid &&
    status !== 'processing' &&
    status !== 'approved';

  const planPrice = Number(selectedPlan?.price || 0);

  if (!isOpen || !selectedPlan) {
    return null;
  }

  const handleCardChange = (event) => {
    const onlyDigits = event.target.value.replace(/\D/g, '').slice(0, 16);

    setCardNumber(formatCardNumber(onlyDigits));
    setError(null);

    if (status !== 'idle') {
      setStatus('idle');
    }
  };

  const handleUseDemoCard = () => {
    setCardNumber('4532 0151 1283 0366');
    setCardHolder('USUARIO CODROP');
    setExpMonth('12');
    setExpYear(String(Math.max(currentYear + 2, 2028)));
    setCvv('123');
    setStatus('idle');
    setError(null);
  };

  const extractErrorMessage = (requestError) => {
    const detail = requestError.response?.data?.detail;

    if (!detail) {
      return 'No se pudo completar la transacción simulada.';
    }

    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          typeof item === 'string'
            ? item
            : item.msg || item.detail || JSON.stringify(item)
        )
        .join('. ');
    }

    if (typeof detail === 'object') {
      return detail.message || JSON.stringify(detail);
    }

    return String(detail);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError(null);

    if (!isLuhnValid) {
      setError(
        'El número de tarjeta no supera la validación matemática de Luhn.'
      );
      return;
    }

    if (!isExpirationValid) {
      setError(
        'La fecha de vencimiento de la tarjeta no es válida.'
      );
      return;
    }

    if (cvv.length !== requiredCvvLength) {
      setError(
        `El código de seguridad debe contener ${requiredCvvLength} dígitos.`
      );
      return;
    }

    setStatus('processing');

    try {
      const payload = {
        plan_id: selectedPlan.id,
        card_holder: cardHolder.trim().toUpperCase(),
        card_number: cleanCardNumber,
        exp_month: Number(expMonth),
        exp_year: Number(expYear),
        cvv,
      };

      const result = await billingService.checkout(payload);

      setStatus('approved');

      window.setTimeout(() => {
        if (onSuccess) {
          onSuccess(result);
        }

        onClose();
      }, 1100);
    } catch (requestError) {
      setStatus('idle');
      setError(extractErrorMessage(requestError));
    }
  };

  const displayNumber =
    cardNumber || '•••• •••• •••• ••••';

  const displayHolder =
    cardHolder.trim().toUpperCase() || 'NOMBRE DEL TITULAR';

  const displayExpiry =
    expMonth && expYear
      ? `${expMonth}/${String(expYear).slice(-2)}`
      : 'MM/AA';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#10202d]/75 p-4 backdrop-blur-md">
      <div className="relative my-auto w-full max-w-[920px] overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_35px_90px_rgba(9,24,34,0.38)]">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          disabled={status === 'processing'}
          aria-label="Cerrar modal"
          className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
          {/* Left / Codrop payment experience */}
          <section className="relative overflow-hidden bg-[#172838] px-6 py-7 text-white sm:px-8 sm:py-8">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.055]"
              style={{
                backgroundImage:
                  'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />

            <div className="absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-[#28B586]/20 blur-3xl" />
            <div className="absolute -right-14 top-16 h-48 w-48 rounded-full bg-[#28B586]/10 blur-3xl" />

            <div className="relative">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#28B586]/30 bg-[#28B586]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.17em] text-[#7de0bd]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Pago simulado seguro
              </div>

              <h2 className="max-w-sm text-2xl font-black tracking-[-0.025em] sm:text-3xl">
                Mejora tu cuenta
                <span className="text-[#55d3a6]"> sin salir de Codrop.</span>
              </h2>

              <p className="mt-3 max-w-sm text-xs font-medium leading-5 text-slate-300">
                La tarjeta se valida matemáticamente en tiempo real antes de
                enviar la operación al backend.
              </p>

              {/* Interactive Card */}
              <div className="relative mt-8 overflow-hidden rounded-[24px] border border-white/15 bg-gradient-to-br from-[#263f4f] via-[#203746] to-[#132532] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.28)]">
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#28B586]/20 blur-2xl" />

                <div className="relative">
                  <div className="mb-7 flex items-start justify-between">
                    <div>
                      <div className="text-lg font-black tracking-[-0.04em]">
                        <span className="text-[#55d3a6]">Co</span>
                        <span className="text-white">drop</span>
                      </div>

                      <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Simulated card
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-white">
                      {cardBrand === 'Desconocida'
                        ? 'CARD'
                        : cardBrand === 'American Express'
                        ? 'AMEX'
                        : cardBrand}
                    </div>
                  </div>

                  <div className="mb-7 font-mono text-lg font-bold tracking-[0.12em] text-white sm:text-xl">
                    {displayNumber}
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-4">
                    <div>
                      <div className="mb-1 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Titular
                      </div>
                      <div className="truncate text-[11px] font-black tracking-wide text-white">
                        {displayHolder}
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Vence
                      </div>
                      <div className="font-mono text-[11px] font-black text-white">
                        {displayExpiry}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Luhn state */}
              <div
                className={`mt-4 flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                  cardNumber
                    ? isLuhnValid
                      ? 'border-[#28B586]/35 bg-[#28B586]/10'
                      : 'border-red-400/25 bg-red-400/10'
                    : 'border-white/10 bg-white/[0.05]'
                }`}
              >
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Validación matemática
                  </p>

                  <p
                    className={`mt-1 text-xs font-black ${
                      cardNumber
                        ? isLuhnValid
                          ? 'text-[#7de0bd]'
                          : 'text-red-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {!cardNumber
                      ? 'Esperando número de tarjeta'
                      : isLuhnValid
                      ? 'Checksum Luhn válido'
                      : 'Checksum Luhn inválido'}
                  </p>
                </div>

                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    cardNumber && isLuhnValid
                      ? 'bg-[#28B586]/20 text-[#7de0bd]'
                      : 'bg-white/[0.07] text-slate-400'
                  }`}
                >
                  {cardNumber && isLuhnValid ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Right / Form */}
          <section className="bg-white px-6 py-7 sm:px-8 sm:py-8">
            <div className="mb-6 pr-12">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF7F1] text-[#1C7F62]">
                  <Sparkles className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#94A3B8]">
                    Upgrade de suscripción
                  </p>

                  <h3 className="text-lg font-black text-[#172838]">
                    Plan {selectedPlan.name}
                  </h3>
                </div>
              </div>

              <div className="flex items-end justify-between rounded-2xl border border-[#dce7e2] bg-[#f8fbf9] px-4 py-3.5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#94A3B8]">
                    Total mensual
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#64748B]">
                    Cobro simulado
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black tracking-[-0.03em] text-[#172838]">
                    ${planPrice.toFixed(2)}
                  </span>

                  <span className="ml-1 text-[10px] font-bold text-[#94A3B8]">
                    USD
                  </span>
                </div>
              </div>
            </div>

            {status === 'approved' ? (
              <div className="flex min-h-[390px] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF7F1] text-[#1C7F62]">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#28B586]">
                  Transacción aprobada
                </p>

                <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#172838]">
                  Tu plan está siendo actualizado
                </h3>

                <p className="mt-3 max-w-sm text-sm leading-6 text-[#64748B]">
                  Codrop recibió correctamente la autorización simulada.
                  Enseguida verás tu comprobante digital.
                </p>

                <Loader2 className="mt-6 h-5 w-5 animate-spin text-[#28B586]" />
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#dce7e2] bg-[#f8fbf9] px-3.5 py-2.5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94A3B8]">
                      Entorno de evaluación
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#64748B]">
                      Usa una tarjeta sintética válida
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseDemoCard}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#CFE4D6] bg-[#EAF7F1] px-2.5 py-1.5 text-[10px] font-black text-[#1C7F62] transition hover:bg-[#dff3e9]"
                  >
                    <Sparkles className="h-3 w-3" />
                    Auto-completar
                  </button>
                </div>

                {/* Card number */}
                <div className="mb-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-black text-[#334e5e]">
                      Número de tarjeta
                    </label>

                    {cardNumber && (
                      <span
                        className={`text-[10px] font-black ${
                          isLuhnValid
                            ? 'text-[#1C7F62]'
                            : 'text-red-500'
                        }`}
                      >
                        {isLuhnValid
                          ? `${cardBrand} · válida`
                          : 'Número inválido'}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-3 h-4 w-4 text-[#94A3B8]" />

                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="4532 0151 1283 0366"
                      maxLength={19}
                      value={cardNumber}
                      onChange={handleCardChange}
                      required
                      className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 font-mono text-sm tracking-wider text-[#172838] outline-none transition ${
                        cardNumber
                          ? isLuhnValid
                            ? 'border-[#28B586] ring-2 ring-[#28B586]/10'
                            : 'border-red-300 ring-2 ring-red-100'
                          : 'border-[#d6dfdb] focus:border-[#28B586] focus:ring-2 focus:ring-[#28B586]/10'
                      }`}
                    />
                  </div>
                </div>

                {/* Holder */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-black text-[#334e5e]">
                    Nombre del titular
                  </label>

                  <input
                    type="text"
                    autoComplete="cc-name"
                    placeholder="USUARIO CODROP"
                    value={cardHolder}
                    onChange={(event) => {
                      setCardHolder(event.target.value);
                      setError(null);
                    }}
                    required
                    className="w-full rounded-xl border border-[#d6dfdb] bg-white px-4 py-2.5 text-sm font-semibold text-[#172838] outline-none transition focus:border-[#28B586] focus:ring-2 focus:ring-[#28B586]/10"
                  />
                </div>

                {/* Expiry + CVV */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-black text-[#334e5e]">
                      Mes
                    </label>

                    <select
                      value={expMonth}
                      onChange={(event) => {
                        setExpMonth(event.target.value);
                        setError(null);
                      }}
                      className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold text-[#172838] outline-none transition ${
                        isExpirationValid
                          ? 'border-[#d6dfdb] focus:border-[#28B586]'
                          : 'border-red-300'
                      }`}
                    >
                      {Array.from({ length: 12 }, (_, index) =>
                        String(index + 1).padStart(2, '0')
                      ).map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-black text-[#334e5e]">
                      Año
                    </label>

                    <select
                      value={expYear}
                      onChange={(event) => {
                        setExpYear(event.target.value);
                        setError(null);
                      }}
                      className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold text-[#172838] outline-none transition ${
                        isExpirationValid
                          ? 'border-[#d6dfdb] focus:border-[#28B586]'
                          : 'border-red-300'
                      }`}
                    >
                      {Array.from(
                        { length: 7 },
                        (_, index) => currentYear + index
                      ).map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-black text-[#334e5e]">
                      CVV
                    </label>

                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      maxLength={requiredCvvLength}
                      placeholder={
                        requiredCvvLength === 4 ? '1234' : '123'
                      }
                      value={cvv}
                      onChange={(event) => {
                        setCvv(
                          event.target.value
                            .replace(/\D/g, '')
                            .slice(0, requiredCvvLength)
                        );
                        setError(null);
                      }}
                      required
                      className="w-full rounded-xl border border-[#d6dfdb] bg-white px-3 py-2.5 text-center font-mono text-sm font-black text-[#172838] outline-none transition focus:border-[#28B586] focus:ring-2 focus:ring-[#28B586]/10"
                    />
                  </div>
                </div>

                {!isExpirationValid && (
                  <p className="mt-2 text-[10px] font-bold text-red-500">
                    La tarjeta no puede tener una fecha de vencimiento anterior
                    al mes actual.
                  </p>
                )}

                <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#e5ece8] bg-[#f8fbf9] px-3.5 py-3">
                  <Lock className="h-4 w-4 shrink-0 text-[#28B586]" />

                  <p className="text-[10px] font-semibold leading-4 text-[#64748B]">
                    Esta es una pasarela académica simulada. Codrop no procesa
                    dinero real ni almacena credenciales bancarias reales.
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf1ef] pt-5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={status === 'processing'}
                    className="rounded-xl px-4 py-2.5 text-xs font-black text-[#64748B] transition hover:bg-[#f3f6f4] disabled:opacity-40"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black transition ${
                      canSubmit
                        ? 'bg-[#28B586] text-white shadow-[0_10px_25px_rgba(40,181,134,0.22)] hover:bg-[#239C76]'
                        : 'cursor-not-allowed bg-[#e8eeeb] text-[#94A3B8]'
                    }`}
                  >
                    {status === 'processing' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Validando operación...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Pagar ${planPrice.toFixed(2)}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}