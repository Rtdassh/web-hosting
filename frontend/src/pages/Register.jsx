import { getApiErrorMessage, getNewPasswordError } from '../services/apiErrors';
import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Check,
  Upload,
  Link2,
  Rocket,
} from 'lucide-react';

import { authService } from '../services/api';
import PublicNavbar from '../components/layout/PublicNavbar';
import AuthBrandAccent from '../components/mascot/AuthBrandAccent';
import { toast } from '../components/ui/Toast';

export default function Register({
  onHome,
  onLogin,
  onVerification,
  onNavigateSection,
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess(false);

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Completa todos los campos.');
      return;
    }

    const passwordError = getNewPasswordError(password);

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await authService.register({
        full_name: fullName,
        email,
        password,
      });

      setSuccess(true);

      toast.success(
        'Cuenta creada exitosamente. Redirigiendo a verificación...'
      );

      if (onVerification) {
        setTimeout(() => {
          onVerification(email);
        }, 700);
      }
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'No fue posible crear la cuenta.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f8f6] bg-brand-stripes-subtle text-navy-900">

      <PublicNavbar
        variant="register"
        onHome={onHome}
        onLogin={onLogin}
        onNavigateSection={onNavigateSection}
      />

      <section className="px-4 py-10 sm:py-14">

        <div className="mx-auto grid w-full max-w-[1180px] items-stretch gap-8 lg:grid-cols-[430px_1fr] lg:gap-10">

          {/* =================================================
              ONBOARDING
          ================================================== */}
          <div className="relative hidden overflow-hidden rounded-[24px] border border-brand-100 bg-brand-50 p-8 lg:block lg:p-9">

            <div className="absolute -left-20 -top-20 h-[220px] w-[220px] rounded-full bg-brand-100/70 blur-3xl" />

            <div
              className="absolute bottom-0 right-0 h-[220px] w-[220px] opacity-[0.045]"
              style={{
                backgroundImage:
                  'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
                backgroundSize: '26px 26px',
              }}
            />

            <div className="relative z-10">

              <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-brand-600">
                Empieza con Codrop
              </p>

              <h2 className="mt-4 text-[36px] font-bold leading-[1.1] tracking-[-0.03em] text-navy-900">
                Publica tu primer proyecto en
                <span className="text-brand-500"> 3 pasos</span>
              </h2>

              <p className="mt-4 text-[16px] leading-7 text-[#64748b]">
                Sin configuraciones complicadas. Solo sube tu proyecto y deja
                que Codrop haga el resto.
              </p>

              <div className="mt-8 space-y-6">

                <Step
                  number="01"
                  icon={Upload}
                  title="Sube tu archivo .zip"
                  text="Empaqueta tu proyecto y súbelo directamente desde tu panel."
                />

                <Step
                  number="02"
                  icon={Rocket}
                  title="Codrop lo despliega"
                  text="Preparamos el entorno y publicamos tu sitio automáticamente."
                />

                <Step
                  number="03"
                  icon={Link2}
                  title="Comparte tu URL"
                  text="Obtén una dirección pública lista para mostrar tu proyecto."
                />

              </div>

              <div className="relative mt-9">

                <div className="h-px bg-brand-100" />

                <div className="mt-6 flex items-end justify-between gap-4">

                  <div>

                    <p className="text-[14px] font-semibold text-navy-900">
                      Code + Drop
                    </p>

                    <p className="mt-1 text-[14px] leading-6 text-[#64748b]">
                      De tu código a la web,
                      <br />
                      sin complicaciones.
                    </p>

                  </div>

                </div>

              </div>

            </div>
          </div>

          {/* =================================================
              FORMULARIO
          ================================================== */}
          <div className="card-tactile relative mt-14 rounded-[24px] p-8 sm:p-[44px]">

            <AuthBrandAccent />

            <div className="mx-auto max-w-[570px]">

              <div className="flex items-start justify-between gap-6">

                <div>

                  <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-600">
                    Nueva cuenta
                  </p>

                  <h2 className="mt-2 text-[34px] font-bold leading-tight tracking-[-0.025em] text-navy-900">
                    Crea tu cuenta
                  </h2>

                  <p className="mt-2 text-[16px] leading-7 text-[#64748b]">
                    Completa tus datos para comenzar a publicar tus proyectos.
                  </p>

                </div>

                <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-brand-50 sm:flex">

                  <Check className="h-6 w-6 text-brand-600" />

                </div>

              </div>

              <div className="mt-8">

                {error && (
                  <div className="fade-slide-down mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-[15px] text-red-600">

                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />

                    <span>
                      {error}
                    </span>

                  </div>
                )}

                {success && (
                  <div className="fade-slide-down mb-5 flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 p-3.5 text-[15px] text-green-600">

                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />

                    <span>
                      Cuenta creada correctamente. Verifica tu correo para continuar.
                    </span>

                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >

                  <div>

                    <label className="mb-2 block text-[15px] font-semibold text-navy-900">
                      Nombre completo
                    </label>

                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Fernando Espinoza"
                      className="h-[50px] w-full rounded-[9px] border border-[#d9e2e8] bg-white px-4 text-[16px] text-navy-900 placeholder-[#94a3b8] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-[15px] font-semibold text-navy-900">
                      Correo electrónico
                    </label>

                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="h-[50px] w-full rounded-[9px] border border-[#d9e2e8] bg-white px-4 text-[16px] text-navy-900 placeholder-[#94a3b8] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-[15px] font-semibold text-navy-900">
                      Contraseña
                    </label>

                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="h-[50px] w-full rounded-[9px] border border-[#d9e2e8] bg-white px-4 text-[16px] text-navy-900 placeholder-[#94a3b8] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-[15px] font-semibold text-navy-900">
                      Confirmar contraseña
                    </label>

                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="h-[50px] w-full rounded-[9px] border border-[#d9e2e8] bg-white px-4 text-[16px] text-navy-900 placeholder-[#94a3b8] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />

                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-tactile brand-focus flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-[9px] bg-brand-500 text-[16px] font-semibold text-white shadow-[0_10px_24px_rgba(40,181,134,0.18)] transition duration-150 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Creando cuenta...
                      </>
                    ) : (
                      'Crear cuenta'
                    )}

                  </button>

                </form>

                <div className="mt-6 border-t border-[#eef2f1] pt-6 text-center">

                  <p className="text-[15px] leading-6 text-[#64748b]">

                    ¿Ya tienes una cuenta?{' '}

                    <button
                      type="button"
                      onClick={onLogin}
                      className="btn-tactile brand-focus cursor-pointer font-semibold text-brand-600 transition duration-150 hover:text-brand-700"
                    >
                      Iniciar sesión
                    </button>

                  </p>

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
   PASO
========================================================= */

function Step({
  number,
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="flex gap-4">

      <div className="flex flex-col items-center">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-100 bg-white shadow-sm">

          <Icon className="h-5 w-5 text-brand-600" />

        </div>

      </div>

      <div className="flex-1 pt-0.5">

        <div className="flex items-center gap-2.5">

          <span className="text-[12px] font-bold tracking-[0.12em] text-brand-500">
            {number}
          </span>

          <h3 className="text-[15px] font-semibold text-navy-900">
            {title}
          </h3>

        </div>

        <p className="mt-1.5 text-[14px] leading-6 text-[#64748b]">
          {text}
        </p>

      </div>

    </div>
  );
}