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
import { authService } from '../services/api';

export default function ForgotPassword({ onBack, onGoToReset }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulatedToken, setSimulatedToken] = useState(null);
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

      if (response?.reset_token_simulated) {
        setSimulatedToken(response.reset_token_simulated);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          'No se pudo generar la solicitud de recuperación.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f9f7] text-[#172838]">
      <PublicNavbar />

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
        <div className="grid w-full overflow-hidden rounded-[30px] border border-[#dce7e2] bg-white shadow-[0_28px_80px_rgba(23,40,56,0.11)] lg:grid-cols-[0.9fr_1.1fr]">
          {/* Brand panel */}
          <section className="relative hidden overflow-hidden bg-[#172838] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
            />

            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#28B586]/20 blur-3xl" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#28B586]/30 bg-[#28B586]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#7de0bd]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Recuperación segura
              </span>

              <h1 className="mt-6 max-w-md text-4xl font-black leading-[1.08] tracking-[-0.045em]">
                Recupera el acceso
                <span className="text-[#55d3a6]">
                  {' '}sin complicaciones.
                </span>
              </h1>

              <p className="mt-5 max-w-md text-sm font-medium leading-7 text-slate-300">
                Genera un token temporal para establecer una nueva contraseña
                y volver a administrar tus proyectos en Codrop.
              </p>
            </div>

            <div className="relative space-y-3">
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
          <section className="px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
            <button
              type="button"
              onClick={onBack}
              className="mb-9 inline-flex items-center gap-2 text-xs font-black text-[#64748B] transition hover:text-[#1C7F62]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a iniciar sesión
            </button>

            <div className="mx-auto max-w-lg">
              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF7F1] text-[#1C7F62]">
                  <KeyRound className="h-5 w-5" />
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#28B586]">
                  Recuperación de acceso
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-[#172838]">
                  ¿Olvidaste tu contraseña?
                </h2>

                <p className="mt-3 text-sm font-medium leading-6 text-[#64748B]">
                  Ingresa tu correo y generaremos un token temporal para
                  continuar con el restablecimiento.
                </p>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold leading-5 text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {simulatedToken ? (
                <div>
                  <div className="rounded-[22px] border border-[#b9ddcd] bg-[#edf9f3] p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#1C7F62] shadow-sm">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-[#176c53]">
                          Token generado correctamente
                        </h3>

                        <p className="mt-1 text-xs font-medium leading-5 text-[#477567]">
                          En el entorno local de desarrollo, este es tu token
                          temporal de recuperación.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-[#cfe4d6] bg-white px-4 py-3">
                      <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#94A3B8]">
                        Token de recuperación
                      </p>

                      <div className="break-all font-mono text-xs font-bold text-[#1C7F62] selection:bg-[#CFE4D6]">
                        {simulatedToken}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-[#64748B]">
                      <Clock3 className="h-3.5 w-3.5" />
                      Vigencia máxima indicada por el servicio: 15 minutos
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onGoToReset && onGoToReset(simulatedToken)
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#172838] px-5 py-3.5 text-xs font-black text-white shadow-[0_12px_28px_rgba(23,40,56,0.18)] transition hover:bg-[#1F3141]"
                  >
                    Continuar al restablecimiento
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="recovery-email"
                      className="mb-2 block text-xs font-black text-[#334e5e]"
                    >
                      Correo electrónico
                    </label>

                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />

                      <input
                        id="recovery-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="tu@correo.com"
                        autoComplete="email"
                        required
                        className="w-full rounded-xl border border-[#d6dfdb] bg-white py-3.5 pl-11 pr-4 text-sm font-semibold text-[#172838] outline-none transition placeholder:text-[#b3bfba] focus:border-[#28B586] focus:ring-4 focus:ring-[#28B586]/10"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#28B586] px-5 py-3.5 text-xs font-black text-white shadow-[0_12px_28px_rgba(40,181,134,0.24)] transition hover:bg-[#239C76] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generando token...
                      </>
                    ) : (
                      <>
                        Generar enlace de recuperación
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[10px] font-medium leading-5 text-[#94A3B8]">
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

function Feature({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#28B586]/10 text-[#55d3a6]">
        <Icon className="h-4 w-4" />
      </div>

      <div>
        <h3 className="text-xs font-black text-white">{title}</h3>
        <p className="mt-1 text-[11px] font-medium leading-5 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}