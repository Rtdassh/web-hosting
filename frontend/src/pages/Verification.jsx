import React, {
  useEffect,
  useState,
} from 'react';

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import codropIsotipo from '../assets/codrop-isotipo.png';

import PublicNavbar from '../components/layout/PublicNavbar';

import {
  authService,
} from '../services/api';


export default function Verification({
  email,
  token,
  onHome,
  onLogin,
  onNavigateSection,
}) {
  const [status, setStatus] =
    useState(token ? 'verifying' : 'pending');

  const [error, setError] =
    useState('');

  const [isResending, setIsResending] =
    useState(false);

  const [resent, setResent] =
    useState(false);


  /*
   * Si la pantalla fue abierta desde el enlace
   * recibido por correo, verificamos automáticamente
   * el token.
   */
  useEffect(() => {
    if (!token) {
      return;
    }

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
        if (cancelled) {
          return;
        }

        const detail =
          requestError.response?.data?.detail;

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


  /*
   * Solicita un token nuevo mediante el endpoint
   * real del backend.
   */
  const handleResend = async () => {
    if (!email || isResending) {
      return;
    }

    setIsResending(true);
    setError('');
    setResent(false);

    try {
      await authService.resendVerification(
        email
      );

      setResent(true);
    } catch (requestError) {
      const detail =
        requestError.response?.data?.detail;

      setError(
        typeof detail === 'string'
          ? detail
          : 'No fue posible reenviar el correo de verificación.'
      );
    } finally {
      setIsResending(false);
    }
  };


  const isPending =
    status === 'pending';

  const isVerifying =
    status === 'verifying';

  const isVerified =
    status === 'verified';

  const hasVerificationError =
    status === 'error';


  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f9f7] text-navy-900">

      {/* Fondo */}
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


      <PublicNavbar
        variant="verification"
        onHome={onHome}
        onLogin={onLogin}
        onNavigateSection={
          onNavigateSection
        }
      />


      <section className="relative z-10 px-4 pb-7 pt-6">

        <div className="mx-auto w-full max-w-[920px]">


          {/* Encabezado */}
          <div className="mx-auto max-w-[650px] text-center">

            <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5">

              <span
                className={`
                  h-1.5 w-1.5 rounded-full
                  ${
                    isVerified
                      ? 'bg-brand-500'
                      : isVerifying
                        ? 'animate-pulse bg-amber-400'
                        : hasVerificationError
                          ? 'bg-red-500'
                          : 'bg-brand-500'
                  }
                `}
              />

              <span className="text-[11px] font-bold tracking-[0.05em] text-brand-700">

                {isVerifying
                  ? 'VALIDANDO TU CUENTA'
                  : isVerified
                    ? 'CUENTA VERIFICADA'
                    : hasVerificationError
                      ? 'REVISAR VERIFICACIÓN'
                      : 'UN ÚLTIMO PASO'}

              </span>

            </div>


            <h1 className="mt-4 text-[34px] font-bold leading-[1.05] tracking-[-0.035em] text-navy-900 sm:text-[40px]">

              {isVerified ? (
                <>
                  Tu cuenta está{' '}
                  <span className="text-brand-500">
                    lista para Codrop
                  </span>
                </>
              ) : isVerifying ? (
                <>
                  Estamos verificando{' '}
                  <span className="text-brand-500">
                    tu correo
                  </span>
                </>
              ) : hasVerificationError ? (
                <>
                  No pudimos validar{' '}
                  <span className="text-red-500">
                    este enlace
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


            <p className="mt-3 text-[14px] leading-6 text-[#64748b]">

              {isVerified
                ? 'Tu dirección de correo fue verificada correctamente. Ya puedes iniciar sesión.'
                : isVerifying
                  ? 'Estamos comprobando que el enlace de activación sea válido.'
                  : hasVerificationError
                    ? 'El enlace puede haber expirado, ser inválido o haber sido utilizado anteriormente.'
                    : 'Te enviamos las instrucciones para completar tu registro en Codrop.'}

            </p>

          </div>


          {/* Card */}
          <div className="relative mt-5">

            <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-brand-100/45 blur-2xl" />


            <div className="relative overflow-hidden rounded-[24px] border border-[#dfe7e4] bg-white shadow-[0_20px_55px_rgba(23,40,56,0.075)]">


              {/* Banda superior */}
              <div className="relative border-b border-brand-100 bg-brand-50/70 px-7 py-6 sm:px-8">

                <div className="flex items-center gap-4">


                  <div
                    className={`
                      flex h-[54px] w-[54px]
                      flex-shrink-0 items-center justify-center
                      rounded-[15px] border shadow-sm
                      ${
                        hasVerificationError
                          ? 'border-red-200 bg-red-50'
                          : 'border-brand-100 bg-white'
                      }
                    `}
                  >

                    {isVerifying ? (
                      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                    ) : isVerified ? (
                      <CheckCircle2 className="h-6 w-6 text-brand-600" />
                    ) : hasVerificationError ? (
                      <AlertCircle className="h-6 w-6 text-red-500" />
                    ) : (
                      <Mail className="h-6 w-6 text-brand-600" />
                    )}

                  </div>


                  <div className="flex-1">

                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">

                      {isVerifying
                        ? 'Verificando'
                        : isVerified
                          ? 'Activación completada'
                          : hasVerificationError
                            ? 'Verificación pendiente'
                            : 'Correo enviado'}

                    </p>


                    <h2 className="mt-1 text-[25px] font-bold leading-tight tracking-[-0.025em] text-navy-900 sm:text-[27px]">

                      {isVerified
                        ? 'Correo verificado correctamente'
                        : isVerifying
                          ? 'Validando enlace de activación'
                          : hasVerificationError
                            ? 'No fue posible verificar tu correo'
                            : 'Verifica tu dirección de correo'}

                    </h2>


                    <p className="mt-1 text-[12px] leading-5 text-[#64748b]">

                      {isVerified
                        ? 'Tu cuenta ya puede utilizarse para iniciar sesión en Codrop.'
                        : isVerifying
                          ? 'Este proceso tomará solamente unos segundos.'
                          : hasVerificationError
                            ? 'Puedes solicitar un nuevo enlace si todavía tienes acceso al correo utilizado durante el registro.'
                            : 'Abre el mensaje que enviamos y sigue el enlace de verificación.'}

                    </p>

                  </div>

                </div>


                <div className="absolute right-0 top-0 h-[64px] w-[64px] rounded-bl-[64px] bg-brand-100" />

              </div>


              <div className="p-6 sm:p-7">


                {/* Correo */}
                {(email || isPending) && (
                  <div className="rounded-[13px] border border-[#dfe7e4] bg-[#fbfdfc] px-5 py-4">

                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
                      Enviado a
                    </p>


                    <div className="mt-2 flex items-center gap-3">

                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] border border-brand-100 bg-brand-50">
                        <Mail className="h-4 w-4 text-brand-600" />
                      </div>


                      <span className="break-all text-[14px] font-semibold text-navy-900">
                        {email || 'tu correo electrónico'}
                      </span>

                    </div>

                  </div>
                )}


                {/* Estado verificando */}
                {isVerifying && (
                  <div className="mt-5 flex flex-col items-center justify-center rounded-[16px] border border-brand-100 bg-brand-50/50 px-6 py-10 text-center">

                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">

                      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />

                    </div>


                    <p className="mt-4 text-[14px] font-bold text-navy-900">
                      Verificando tu dirección
                    </p>


                    <p className="mt-1 max-w-sm text-[11px] leading-5 text-[#64748b]">
                      Estamos validando de forma segura el token enviado a tu correo.
                    </p>

                  </div>
                )}


                {/* Estado éxito */}
                {isVerified && (
                  <div className="mt-5 rounded-[16px] border border-green-200 bg-green-50 px-5 py-5">

                    <div className="flex gap-3">

                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />


                      <div>

                        <p className="text-[13px] font-bold text-green-800">
                          Cuenta activada correctamente
                        </p>


                        <p className="mt-1 text-[11px] leading-5 text-green-700">
                          El correo fue validado y el enlace de activación ya fue consumido.
                        </p>

                      </div>

                    </div>

                  </div>
                )}


                {/* Estado error */}
                {hasVerificationError && (
                  <div className="mt-5 rounded-[16px] border border-red-200 bg-red-50 px-5 py-5">

                    <div className="flex gap-3">

                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />


                      <div>

                        <p className="text-[13px] font-bold text-red-700">
                          No pudimos completar la verificación
                        </p>


                        <p className="mt-1 text-[11px] leading-5 text-red-600">
                          {error}
                        </p>

                      </div>

                    </div>

                  </div>
                )}


                {/* Progreso */}
                {!isVerifying && (
                  <div className="mt-5">

                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">
                      Tu progreso
                    </p>


                    <div className="mt-3 grid gap-3 md:grid-cols-3">

                      <ProgressCard
                        number="01"
                        title="Cuenta creada"
                        text="Tus datos ya están registrados."
                        completed
                      />


                      <ProgressCard
                        number="02"
                        title="Verificar correo"
                        text={
                          isVerified
                            ? 'Tu dirección ya fue confirmada.'
                            : 'Abre el mensaje y confirma tu dirección.'
                        }
                        completed={isVerified}
                        active={
                          !isVerified
                        }
                      />


                      <ProgressCard
                        number="03"
                        title="Entrar a Codrop"
                        text="Accede a tu panel con tus credenciales."
                        active={isVerified}
                      />

                    </div>

                  </div>
                )}


                {/* Reenvío correcto */}
                {resent && (
                  <div className="mt-5 flex gap-3 rounded-[12px] border border-green-200 bg-green-50 px-4 py-3 text-green-700">

                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />


                    <div>

                      <p className="text-[12px] font-semibold">
                        Solicitud enviada correctamente
                      </p>


                      <p className="mt-0.5 text-[11px] leading-5 text-green-700/80">
                        Si la cuenta está pendiente, recibirás un nuevo enlace de activación.
                      </p>

                    </div>

                  </div>
                )}


                {/* Error de reenvío */}
                {error &&
                  !hasVerificationError &&
                  !isVerifying && (
                    <div className="mt-5 flex gap-3 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-red-700">

                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />


                      <p className="text-[11px] leading-5">
                        {error}
                      </p>

                    </div>
                  )}


                {/* Ayuda */}
                {isPending &&
                  !resent && (
                    <div className="mt-5 flex gap-3 rounded-[12px] border border-brand-100 bg-brand-50/70 px-4 py-3">

                      <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" />


                      <div>

                        <p className="text-[12px] font-semibold text-navy-900">
                          ¿No ves el correo?
                        </p>


                        <p className="mt-0.5 text-[11px] leading-5 text-[#64748b]">
                          Revisa tu carpeta de spam o espera unos minutos antes de solicitar un nuevo enlace.
                        </p>

                      </div>

                    </div>
                  )}


                {/* Acciones */}
                {!isVerifying && (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                    <button
                      type="button"
                      onClick={onLogin}
                      className="flex h-[44px] flex-1 items-center justify-center gap-2 rounded-[9px] bg-brand-500 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(40,181,134,0.16)] transition-all hover:-translate-y-[1px] hover:bg-brand-600"
                    >

                      {isVerified
                        ? 'Iniciar sesión'
                        : 'Ir al inicio de sesión'}

                      <ArrowRight className="h-4 w-4" />

                    </button>


                    {!isVerified &&
                      email && (
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={
                            isResending
                          }
                          className="flex h-[44px] flex-1 items-center justify-center gap-2 rounded-[9px] border border-brand-100 bg-white text-[13px] font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >

                          {isResending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Reenviando...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4" />
                              Reenviar correo
                            </>
                          )}

                        </button>
                      )}

                  </div>
                )}


                {/* Cierre */}
                <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#eef2f1] pt-5">

                  <div>

                    <p className="text-[11px] font-semibold text-navy-900">

                      {isVerified
                        ? 'Todo listo'
                        : 'Protegemos la identidad de tu cuenta'}

                    </p>


                    <p className="mt-0.5 text-[10px] leading-4 text-[#64748b]">

                      {isVerified
                        ? 'Continúa hacia tu cuenta de Codrop.'
                        : 'Cada enlace de activación es temporal y de un solo uso.'}

                    </p>

                  </div>


                  <img
                    src={codropIsotipo}
                    alt=""
                    aria-hidden="true"
                    className="hidden w-[95px] opacity-[0.16] sm:block"
                  />

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
      className={`
        min-h-[105px]
        rounded-[12px]
        border
        p-3.5
        ${
          completed
            ? 'border-brand-100 bg-brand-50'
            : active
              ? 'border-brand-500 bg-white shadow-[0_6px_18px_rgba(40,181,134,0.07)]'
              : 'border-[#e8eeeb] bg-[#fbfcfc]'
        }
      `}
    >

      <div
        className={`
          flex h-8 w-8
          items-center justify-center
          rounded-[9px]
          ${
            completed
              ? 'bg-brand-500 text-white'
              : active
                ? 'border border-brand-100 bg-brand-50 text-brand-600'
                : 'border border-[#e2e8f0] bg-white text-[#94a3b8]'
          }
        `}
      >

        {completed ? (
          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
        ) : (
          <span className="text-[9px] font-bold">
            {number}
          </span>
        )}

      </div>


      <p className="mt-2.5 text-[12px] font-semibold text-navy-900">
        {title}
      </p>


      <p className="mt-1 text-[10px] leading-4 text-[#64748b]">
        {text}
      </p>

    </div>
  );
}