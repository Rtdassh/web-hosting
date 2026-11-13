import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Mail,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import PublicNavbar from '../components/layout/PublicNavbar';
import { authService } from '../services/api';

export default function Verification({
  email,
  token,
  onHome,
  onLogin,
  onNavigateSection,
}) {
  const [status, setStatus] = useState(token ? 'verifying' : 'pending');
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const verify = async () => {
      setStatus('verifying');
      setError('');

      try {
        await authService.verifyEmail(token);

        if (!cancelled) {
          setStatus('verified');
        }
      } catch (requestError) {
        if (cancelled) return;

        const detail = requestError.response?.data?.detail;

        setStatus('error');

        setError(
          typeof detail === 'string'
            ? detail
            : 'El enlace de verificación es inválido, expiró o ya fue utilizado.'
        );
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async () => {
    if (!email || isResending) return;

    setIsResending(true);
    setError('');
    setResent(false);

    try {
      await authService.resendVerification(email);
      setResent(true);
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;

      setError(
        typeof detail === 'string'
          ? detail
          : 'No fue posible reenviar el correo de verificación.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const isVerifying = status === 'verifying';
  const isVerified = status === 'verified';
  const hasError = status === 'error';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f9f7] text-navy-900">

      {/* Fondo ambiental */}
      <div className="pointer-events-none absolute inset-0">

        <div className="absolute left-1/2 top-[-180px] h-[380px] w-[620px] -translate-x-1/2 rounded-full bg-brand-100/45 blur-[105px]" />

        <div className="absolute bottom-[-200px] right-[-120px] h-[420px] w-[420px] rounded-full bg-brand-50 blur-[95px]" />

        <div
          className="absolute bottom-0 left-0 h-[230px] w-[260px] opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div
          className="absolute right-0 top-[260px] h-[220px] w-[240px] opacity-[0.028]"
          style={{
            backgroundImage:
              'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

      </div>

      {/* Navbar */}
      <PublicNavbar
        variant="verification"
        onHome={onHome}
        onLogin={onLogin}
        onNavigateSection={onNavigateSection}
      />

      {/* Contenido */}
      <section className="relative z-10 px-4 pb-6 pt-5 sm:pb-7 sm:pt-6">

        <div className="mx-auto w-full max-w-[920px]">

          {/* Encabezado */}
          <div className="mx-auto max-w-[680px] text-center">

            <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3.5 py-2">

              <span className="h-2 w-2 rounded-full bg-brand-500" />

              <span className="text-[13px] font-bold tracking-[0.08em] text-brand-700">
                UN ÚLTIMO PASO
              </span>

            </div>

            <h1 className="mt-4 text-[36px] font-bold leading-[1.05] tracking-[-0.035em] text-navy-900 sm:text-[42px]">

              {isVerified ? (
                <>
                  ¡Cuenta activada con{' '}
                  <span className="text-brand-500">
                    éxito!
                  </span>
                </>
              ) : (
                <>
                  Revisa tu correo y{' '}
                  <span className="text-brand-500">
                    activa tu cuenta
                  </span>
                </>
              )}

            </h1>

            <p className="mt-3 text-[16px] leading-7 text-[#64748b] sm:text-[17px]">

              {isVerified
                ? 'Tu dirección de correo fue verificada correctamente. Ya puedes comenzar a desplegar en Codrop.'
                : 'Te enviamos las instrucciones para completar tu registro en Codrop.'}

            </p>

          </div>

          {/* Card principal */}
          <div className="relative mt-5">

            <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-brand-100/45 blur-2xl" />

            <div className="relative overflow-hidden rounded-[24px] border border-[#dfe7e4] bg-white shadow-[0_20px_55px_rgba(23,40,56,0.075)]">

              {/* Banda superior */}
              <div className="relative border-b border-brand-100 bg-brand-50/70 px-7 py-6 sm:px-8">

                <div className="flex items-center gap-4">

                  <div className="flex h-[58px] w-[58px] flex-shrink-0 items-center justify-center rounded-[15px] border border-brand-100 bg-white shadow-sm">

                    {isVerified ? (
                      <CheckCircle2 className="h-7 w-7 text-brand-600" />
                    ) : isVerifying ? (
                      <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
                    ) : (
                      <Mail className="h-7 w-7 text-brand-600" />
                    )}

                  </div>

                  <div className="flex-1">

                    <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-600">
                      {isVerified
                        ? 'Activación Exitosa'
                        : isVerifying
                        ? 'Verificando'
                        : 'Correo enviado'}
                    </p>

                    <h2 className="mt-1 text-[27px] font-bold leading-tight tracking-[-0.025em] text-navy-900 sm:text-[30px]">
                      {isVerified
                        ? 'Tu cuenta está lista'
                        : isVerifying
                        ? 'Validando tu token de acceso'
                        : 'Verifica tu dirección de correo'}
                    </h2>

                    <p className="mt-1.5 text-[14px] leading-6 text-[#64748b]">
                      {isVerified
                        ? 'Inicia sesión para entrar directamente a tu panel de control.'
                        : 'Abre el mensaje que enviamos y sigue el enlace de verificación.'}
                    </p>

                  </div>

                </div>

                <div className="absolute right-0 top-0 h-[64px] w-[64px] rounded-bl-[64px] bg-brand-100" />

              </div>

              {/* Cuerpo */}
              <div className="p-6 sm:p-7">

                {/* Email */}
                {email && (
                  <div className="rounded-[13px] border border-[#dfe7e4] bg-[#fbfdfc] px-5 py-4">

                    <p className="text-[12px] font-bold uppercase tracking-[0.13em] text-[#94a3b8]">
                      Enviado a
                    </p>

                    <div className="mt-1.5 flex items-center gap-2.5">

                      <Mail className="h-5 w-5 flex-shrink-0 text-brand-600" />

                      <p className="break-all text-[16px] font-semibold text-navy-900">
                        {email}
                      </p>

                    </div>

                  </div>
                )}

                {/* Progreso */}
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

                  <ProgressCard
                    number="01"
                    title="1. Registro completado"
                    text="Tus datos de cuenta fueron registrados correctamente."
                    completed
                  />

                  <ProgressCard
                    number="02"
                    title="2. Correo de activación"
                    text="Enlace único de validación generado y despachado."
                    completed={isVerified}
                    active={!isVerified}
                  />

                  <ProgressCard
                    number="03"
                    title="3. Todo listo"
                    text="Publica y comparte tu primera página web."
                    completed={isVerified}
                  />

                </div>

                {/* Verificando */}
                {isVerifying && (
                  <div className="mt-5 flex items-center gap-3 rounded-[12px] border border-blue-200 bg-blue-50 px-4 py-3.5 text-blue-700">

                    <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />

                    <div>

                      <p className="text-[14px] font-semibold">
                        Verificando enlace de activación...
                      </p>

                      <p className="mt-0.5 text-[13px] leading-5 text-blue-600">
                        Confirmando autenticidad del token recibido por correo.
                      </p>

                    </div>

                  </div>
                )}

                {/* Error */}
                {hasError && (
                  <div className="mt-5 flex gap-3 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3.5 text-red-700">

                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />

                    <div>

                      <p className="text-[14px] font-semibold">
                        No fue posible validar tu cuenta
                      </p>

                      <p className="mt-0.5 text-[13px] leading-5 text-red-600">
                        {error}
                      </p>

                    </div>

                  </div>
                )}

                {/* Reenviado */}
                {resent && (
                  <div className="mt-5 flex gap-3 rounded-[12px] border border-green-200 bg-green-50 px-4 py-3.5 text-green-700">

                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />

                    <div>

                      <p className="text-[14px] font-semibold">
                        Correo reenviado correctamente
                      </p>

                      <p className="mt-0.5 text-[13px] leading-5 text-green-700/80">
                        Revisa nuevamente tu bandeja de entrada o carpeta de spam.
                      </p>

                    </div>

                  </div>
                )}

                {/* Ayuda */}
                {!isVerifying && !hasError && !resent && (
                  <div className="mt-5 flex gap-3 rounded-[12px] border border-brand-100 bg-brand-50/70 px-4 py-3.5">

                    <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />

                    <div>

                      <p className="text-[14px] font-semibold text-navy-900">
                        ¿No ves el correo?
                      </p>

                      <p className="mt-0.5 text-[13px] leading-6 text-[#64748b]">
                        Revisa spam o espera unos minutos antes de reenviarlo.
                      </p>

                    </div>

                  </div>
                )}

                {/* Acciones */}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                  <button
                    type="button"
                    onClick={onLogin}
                    className="btn-tactile flex h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-[9px] bg-brand-500 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(40,181,134,0.16)] transition-all hover:-translate-y-[1px] hover:bg-brand-600"
                  >
                    {isVerified
                      ? 'Iniciar sesión'
                      : 'Ya verifiqué mi correo'}

                    <ArrowRight className="h-5 w-5" />
                  </button>

                  {!isVerified && email && (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending}
                      className="btn-tactile flex h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-brand-100 bg-white text-[15px] font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >

                      {isResending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Reenviando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-5 w-5" />
                          Reenviar correo
                        </>
                      )}

                    </button>
                  )}

                </div>

                {/* Cierre */}
                <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#eef2f1] pt-5">

                  <div>

                    <p className="text-[14px] font-semibold text-navy-900">
                      {isVerified
                        ? 'Todo listo'
                        : 'Ya casi estás dentro'}
                    </p>

                    <p className="mt-0.5 text-[13px] leading-5 text-[#64748b]">
                      {isVerified
                        ? 'Continúa hacia tu cuenta de Codrop.'
                        : 'Completa la verificación y continúa hacia tu dashboard.'}
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}


/* =========================================================
   PROGRESS CARD
========================================================= */

function ProgressCard({
  number,
  title,
  text,
  completed = false,
  active = false,
}) {
  return (
    <div
      className={`min-h-[118px] rounded-[12px] border p-4 transition-all ${
        completed
          ? 'border-brand-100 bg-brand-50'
          : active
          ? 'border-brand-500 bg-white shadow-[0_6px_18px_rgba(40,181,134,0.07)]'
          : 'border-[#e8eeeb] bg-[#fbfcfc]'
      }`}
    >

      <div
        className={`flex h-9 w-9 items-center justify-center rounded-[9px] ${
          completed
            ? 'bg-brand-500 text-white'
            : active
            ? 'border border-brand-100 bg-brand-50 text-brand-600'
            : 'border border-[#e2e8f0] bg-white text-[#94a3b8]'
        }`}
      >

        {completed ? (
          <Check className="h-4 w-4 stroke-[2.5]" />
        ) : (
          <span className="text-[11px] font-bold">
            {number}
          </span>
        )}

      </div>

      <p className="mt-3 text-[14px] font-semibold leading-5 text-navy-900">
        {title}
      </p>

      <p className="mt-1.5 text-[12px] leading-5 text-[#64748b]">
        {text}
      </p>

    </div>
  );
}