import { getApiErrorMessage } from '../services/apiErrors';
import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
} from 'lucide-react';

import PublicNavbar from '../components/layout/PublicNavbar';
import AuthBrandAccent from '../components/mascot/AuthBrandAccent';
import { authService } from '../services/api';

export default function ForgotPassword({
  onHome,
  onLogin,
  onRegister,
  onNavigateSection,
  onBack,
  onGoToReset,
}) {
  const [email, setEmail] = useState('');
  const [pastedToken, setPastedToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authService.forgotPassword(normalizedEmail);

      setConfirmation(
        response?.message ||
          'Solicitud recibida. Revisa las instrucciones en tu correo.'
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudo generar la solicitud de recuperación.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f9f7] bg-brand-stripes-subtle text-[#172838]">

      <PublicNavbar
        variant="forgot-password"
        onHome={onHome}
        onLogin={onLogin || onBack}
        onRegister={onRegister}
        onNavigateSection={onNavigateSection}
      />

      {/* Background */}
      <div className="pointer-events-none absolute inset-0">

        <div className="absolute -left-24 top-36 h-80 w-80 rounded-full bg-[#28B586]/10 blur-3xl" />

        <div className="absolute -right-20 top-44 h-96 w-96 rounded-full bg-[#172838]/[0.055] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.028]"
          style={{
            backgroundImage:
              'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
            backgroundSize: '34px 34px',
          }}
        />

      </div>

      <main className="relative mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-7xl items-center px-5 py-10 sm:px-6 lg:px-8">

        <div className="mt-14 grid w-full rounded-[30px] border border-[#dce7e2] bg-white shadow-[0_28px_80px_rgba(23,40,56,0.11)] lg:mt-0 lg:grid-cols-[0.9fr_1.1fr]">

          {/* Brand panel */}
          <section className="relative hidden overflow-hidden rounded-l-[30px] border-r border-[#dce7e2] bg-gradient-to-br from-[#f4f9f7] via-[#ecf6f1] to-[#e4f2eb] p-10 text-[#172838] lg:flex lg:flex-col lg:justify-between">

            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#28B586]/15 blur-3xl" />

            <div className="relative">

              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[13px] font-black uppercase tracking-[0.14em] text-emerald-700">

                <ShieldCheck className="h-4 w-4 text-emerald-600" />

                Recuperación segura

              </span>

              <h1 className="mt-6 max-w-md text-[40px] font-black leading-[1.08] tracking-[-0.045em] text-[#172838]">

                Recupera el acceso

                <span className="text-[#28B586]">
                  {' '}sin complicaciones.
                </span>

              </h1>

              <p className="mt-5 max-w-md text-[16px] font-medium leading-7 text-[#64748B]">
                Genera un token temporal para establecer una nueva contraseña
                y volver a administrar tus proyectos en Codrop.
              </p>

            </div>

            <div className="relative space-y-4">

              <Feature
                icon={Mail}
                title="Identificamos tu cuenta"
                description="Solo necesitamos el correo asociado a tu usuario."
              />

              <Feature
                icon={Clock3}
                title="Token temporal"
                description="El enlace de recuperación tiene una vigencia limitada."
              />

              <Feature
                icon={KeyRound}
                title="Nueva contraseña"
                description="Después podrás definir una nueva clave de acceso."
              />

            </div>

          </section>

          {/* Form panel */}
          <section className="relative rounded-[30px] px-6 py-8 sm:px-10 sm:py-10 lg:rounded-l-none lg:px-14 lg:py-12">

            <AuthBrandAccent />

            <button
              type="button"
              onClick={onBack}
              className="btn-tactile brand-focus mb-9 inline-flex cursor-pointer items-center gap-2 text-[14px] font-black text-[#64748B] transition duration-150 hover:text-[#1C7F62]"
            >
              <ArrowLeft className="h-5 w-5" />
              Volver a iniciar sesión
            </button>

            <div className="mx-auto max-w-lg">

              <div className="mb-8">

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF7F1] text-[#1C7F62]">
                  <KeyRound className="h-6 w-6" />
                </div>

                <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#28B586]">
                  Recuperación de acceso
                </p>

                <h2 className="mt-2 text-[34px] font-black tracking-[-0.035em] text-[#172838]">
                  ¿Olvidaste tu contraseña?
                </h2>

                <p className="mt-3 text-[16px] font-medium leading-7 text-[#64748B]">
                  Ingresa tu correo y generaremos un token temporal para
                  continuar con el restablecimiento.
                </p>

              </div>

              {error && (
                <div className="fade-slide-down mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-[14px] font-semibold leading-6 text-red-700">

                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <span>
                    {error}
                  </span>

                </div>
              )}

              {confirmation ? (
                <div className="animate-fade-in space-y-5">

                  <div
                    role="status"
                    className="rounded-2xl border border-green-200 bg-green-50 p-5 text-[15px] text-green-900"
                  >

                    <div className="flex items-start gap-3">

                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#28B586]" />

                      <div className="space-y-1">

                        <p className="text-[16px] font-bold text-green-950">
                          Solicitud procesada
                        </p>

                        <p className="text-[14px] leading-6 text-green-800">
                          {confirmation}
                        </p>

                      </div>

                    </div>

                  </div>

                  {/* Token */}
                  <div className="rounded-2xl border border-[#dce7e2] bg-[#f8faf9] p-5 shadow-sm">

                    <div className="flex items-center gap-2.5">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF7F1] text-[#1C7F62]">
                        <KeyRound className="h-5 w-5" />
                      </div>

                      <div>

                        <h4 className="text-[15px] font-black text-[#172838]">
                          ¿Ya recibiste tu token temporal?
                        </h4>

                        <p className="mt-0.5 text-[13px] leading-5 text-[#64748B]">
                          Pega aquí tu token o continúa para ingresar tu nueva contraseña.
                        </p>

                      </div>

                    </div>

                    <div className="mt-4 space-y-3">

                      <div className="relative">

                        <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />

                        <input
                          type="text"
                          value={pastedToken}
                          onChange={(e) => setPastedToken(e.target.value)}
                          placeholder="Pega tu token aquí (opcional)"
                          className="w-full rounded-xl border border-[#d6dfdb] bg-white py-3.5 pl-12 pr-4 font-mono text-[14px] font-bold text-[#1C7F62] outline-none transition placeholder:font-sans placeholder:text-[#b3bfba] focus:border-[#28B586] focus:ring-4 focus:ring-[#28B586]/10"
                        />

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onGoToReset &&
                          onGoToReset(pastedToken.trim())
                        }
                        className="btn-tactile brand-focus flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#28B586] px-5 py-3.5 text-[15px] font-black text-white shadow-[0_12px_28px_rgba(40,181,134,0.24)] transition duration-150 hover:bg-[#239C76]"
                      >
                        Continuar y restablecer contraseña
                        <ArrowRight className="h-5 w-5" />
                      </button>

                    </div>

                  </div>

                  <div className="pt-2 text-center">

                    <button
                      type="button"
                      onClick={() => setConfirmation(null)}
                      className="cursor-pointer text-[14px] font-semibold text-[#64748B] transition-colors hover:text-[#172838]"
                    >
                      ← Probar con otro correo electrónico
                    </button>

                  </div>

                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >

                  <div>

                    <label
                      htmlFor="recovery-email"
                      className="mb-2 block text-[15px] font-black text-[#334e5e]"
                    >
                      Correo electrónico
                    </label>

                    <div className="relative">

                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />

                      <input
                        id="recovery-email"
                        type="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(event.target.value)
                        }
                        placeholder="tu@correo.com"
                        autoComplete="email"
                        required
                        className="w-full rounded-xl border border-[#d6dfdb] bg-white py-3.5 pl-12 pr-4 text-[16px] font-semibold text-[#172838] outline-none transition placeholder:text-[#b3bfba] focus:border-[#28B586] focus:ring-4 focus:ring-[#28B586]/10"
                      />

                    </div>

                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-tactile brand-focus flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#28B586] px-5 py-3.5 text-[15px] font-black text-white shadow-[0_12px_28px_rgba(40,181,134,0.24)] transition duration-150 hover:bg-[#239C76] disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generando token...
                      </>
                    ) : (
                      <>
                        Generar enlace de recuperación
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}

                  </button>

                  <div className="border-t border-[#edf2f0] pt-4 text-center">

                    <button
                      type="button"
                      onClick={() =>
                        onGoToReset && onGoToReset()
                      }
                      className="inline-flex cursor-pointer items-center gap-1.5 text-[14px] font-bold text-[#28B586] transition-colors hover:text-[#239C76]"
                    >
                      <KeyRound className="h-4 w-4" />
                      ¿Ya tienes un token temporal? Ir a restablecer contraseña
                    </button>

                  </div>

                  <p className="text-center text-[13px] font-medium leading-6 text-[#94A3B8]">
                    Si la cuenta es válida, el servicio generará las
                    instrucciones correspondientes para recuperar el acceso.
                  </p>

                </form>
              )}

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#d6e5dd] bg-white/85 p-4 shadow-sm backdrop-blur-sm">

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-500/10 text-emerald-600">

        <Icon className="h-5 w-5" />

      </div>

      <div>

        <h3 className="text-[15px] font-black text-[#172838]">
          {title}
        </h3>

        <p className="mt-1 text-[13px] font-medium leading-6 text-[#64748B]">
          {description}
        </p>

      </div>

    </div>
  );
}