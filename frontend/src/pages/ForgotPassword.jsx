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

      setConfirmation(response?.message || 'Solicitud recibida. Revisa las instrucciones en tu correo.');
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
        <div className="grid w-full overflow-hidden rounded-[30px] border border-[#dce7e2] bg-white shadow-[0_28px_80px_rgba(23,40,56,0.11)] lg:grid-cols-[0.9fr_1.1fr]">
          {/* Brand panel */}
          <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#f4f9f7] via-[#ecf6f1] to-[#e4f2eb] border-r border-[#dce7e2] p-10 text-[#172838] lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#28B586]/15 blur-3xl" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Recuperación segura
              </span>

              <h1 className="mt-6 max-w-md text-4xl font-black leading-[1.08] tracking-[-0.045em] text-[#172838]">
                Recupera el acceso
                <span className="text-[#28B586]">
                  {' '}sin complicaciones.
                </span>
              </h1>

              <p className="mt-5 max-w-md text-sm font-medium leading-7 text-[#64748B]">
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
              className="mb-9 inline-flex items-center gap-2 text-xs font-black text-[#64748B] transition duration-150 btn-tactile cursor-pointer hover:text-[#1C7F62]"
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
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold leading-5 text-red-700 fade-slide-down">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {confirmation ? (
                <div className="space-y-5 animate-fade-in">
                  <div role="status" className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-900">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#28B586]" />
                      <div className="space-y-1">
                        <p className="font-bold text-green-950">Solicitud procesada</p>
                        <p className="text-xs leading-5 text-green-800">{confirmation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Espacio para ingresar el token temporal */}
                  <div className="rounded-2xl border border-[#dce7e2] bg-[#f8faf9] p-5 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF7F1] text-[#1C7F62]">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#172838]">
                          ¿Ya recibiste tu token temporal?
                        </h4>
                        <p className="text-[11px] text-[#64748B]">
                          Pega aquí tu token o continúa para ingresar tu nueva contraseña.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                        <input
                          type="text"
                          value={pastedToken}
                          onChange={(e) => setPastedToken(e.target.value)}
                          placeholder="Pega tu token aquí (opcional)"
                          className="w-full rounded-xl border border-[#d6dfdb] bg-white py-3 pl-11 pr-4 font-mono text-xs font-bold text-[#1C7F62] outline-none transition placeholder:font-sans placeholder:text-[#b3bfba] focus:border-[#28B586] focus:ring-4 focus:ring-[#28B586]/10"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => onGoToReset && onGoToReset(pastedToken.trim())}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#28B586] px-5 py-3.5 text-xs font-black text-white shadow-[0_12px_28px_rgba(40,181,134,0.24)] transition duration-150 btn-tactile cursor-pointer hover:bg-[#239C76]"
                      >
                        Continuar y restablecer contraseña
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setConfirmation(null)}
                      className="text-xs font-semibold text-[#64748B] hover:text-[#172838] transition-colors cursor-pointer"
                    >
                      ← Probar con otro correo electrónico
                    </button>
                  </div>
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#28B586] px-5 py-3.5 text-xs font-black text-white shadow-[0_12px_28px_rgba(40,181,134,0.24)] transition duration-150 btn-tactile cursor-pointer hover:bg-[#239C76] disabled:cursor-not-allowed disabled:opacity-60"
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

                  <div className="pt-4 border-t border-[#edf2f0] text-center">
                    <button
                      type="button"
                      onClick={() => onGoToReset && onGoToReset()}
                      className="text-xs font-bold text-[#28B586] hover:text-[#239C76] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      ¿Ya tienes un token temporal? Ir a restablecer contraseña
                    </button>
                  </div>

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
    <div className="flex items-start gap-3 rounded-2xl border border-[#d6e5dd] bg-white/85 backdrop-blur-sm p-4 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-200 text-emerald-600">
        <Icon className="h-4 w-4" />
      </div>

      <div>
        <h3 className="text-xs font-black text-[#172838]">{title}</h3>
        <p className="mt-1 text-[11px] font-medium leading-5 text-[#64748B]">
          {description}
        </p>
      </div>
    </div>
  );
}