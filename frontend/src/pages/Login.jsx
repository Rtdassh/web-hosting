import { getApiErrorMessage } from '../services/apiErrors';
import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Loader2,
  LockKeyhole,
  Server,
  Globe2,
  Zap,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import PublicNavbar from '../components/layout/PublicNavbar';
import AuthBrandAccent from '../components/mascot/AuthBrandAccent';
import { toast } from '../components/ui/Toast';

export default function Login({
  onHome,
  onRegister,
  onForgotPassword,
  onNavigateSection,
}) {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    if (!email || !password) {
      setError('Completa todos los campos.');
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'No fue posible iniciar sesión.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTestAccount = () => {
    setEmail('dev@cloudpaas.local');
    setPassword('admin123');
    setError('');
    toast.info(
      'Credenciales de prueba dev@cloudpaas.local autocompletadas.'
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6faf8] bg-brand-stripes-subtle text-navy-900">

      {/* =====================================================
          FONDO
      ====================================================== */}
      <div className="pointer-events-none absolute inset-0">

        <div className="absolute left-1/2 top-[-170px] h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-brand-100/50 blur-[100px]" />

        <div className="absolute bottom-[-180px] right-[-150px] h-[430px] w-[430px] rounded-full bg-brand-50 blur-[90px]" />

        <div
          className="absolute bottom-0 left-0 h-[280px] w-[300px] opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

      </div>

      {/* =====================================================
          NAVBAR COMPARTIDO
      ====================================================== */}
      <PublicNavbar
        variant="login"
        onHome={onHome}
        onRegister={onRegister}
        onNavigateSection={onNavigateSection}
      />

      {/* =====================================================
          CONTENIDO
      ====================================================== */}
      <section className="relative z-10 px-4 py-12 sm:py-14">

        <div className="mx-auto w-full max-w-[980px]">

          {/* =================================================
              INTRO
          ================================================== */}
          <div className="mx-auto max-w-[680px] text-center">

            <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3.5 py-2">

              <span className="h-2 w-2 rounded-full bg-brand-500" />

              <span className="text-[13px] font-bold tracking-[0.08em] text-brand-700">
                TU WORKSPACE TE ESPERA
              </span>

            </div>

            <h1 className="mt-5 text-[40px] font-bold leading-[1.08] tracking-[-0.035em] text-navy-900 sm:text-[46px]">

              Bienvenido de nuevo a{' '}

              <span className="whitespace-nowrap">

                <span className="text-brand-500">
                  Co
                </span>

                <span className="text-navy-900">
                  drop
                </span>

              </span>

            </h1>

            <p className="mt-4 text-[17px] leading-7 text-[#64748b] sm:text-[18px]">
              Ingresa a tu cuenta para continuar administrando tus
              despliegues y sitios publicados.
            </p>

          </div>

          {/* =================================================
              ZONA LOGIN
          ================================================== */}
          <div className="mt-10 grid items-stretch gap-8 lg:grid-cols-[1fr_430px]">

            {/* =================================================
                PANEL INFORMATIVO
            ================================================== */}
            <div className="relative hidden overflow-hidden rounded-[22px] border border-brand-100 bg-[#eef8f3] p-8 lg:block">

              <div className="absolute -left-16 -top-16 h-[180px] w-[180px] rounded-full bg-brand-100/80 blur-3xl" />

              <div className="relative z-10">

                <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-600">
                  Todo sigue donde lo dejaste
                </p>

                <h2 className="mt-3 text-[29px] font-bold leading-[1.15] tracking-[-0.025em] text-navy-900">
                  Tu espacio de trabajo está listo
                </h2>

                <p className="mt-3 text-[15px] leading-7 text-[#64748b]">
                  Regresa a tus proyectos sin volver a configurar nada.
                </p>

                <div className="mt-7 space-y-5">

                  <LoginBenefit
                    icon={Server}
                    title="Tus despliegues"
                    text="Consulta tus proyectos y su estado."
                  />

                  <LoginBenefit
                    icon={Globe2}
                    title="Tus URLs"
                    text="Accede rápidamente a tus sitios publicados."
                  />

                  <LoginBenefit
                    icon={Check}
                    title="Todo listo"
                    text="Continúa exactamente desde tu último acceso."
                  />

                </div>

                <div className="mt-9 border-t border-brand-100 pt-6">

                  <div className="flex items-end justify-between gap-4">

                    <div>

                      <p className="text-[14px] font-semibold text-navy-900">
                        Code + Drop
                      </p>

                      <p className="mt-1 text-[14px] leading-6 text-[#64748b]">
                        Tu proyecto,
                        <br />
                        siempre a un clic.
                      </p>

                    </div>

                  </div>

                </div>

              </div>
            </div>

            {/* =================================================
                FORMULARIO
            ================================================== */}
            <div className="relative">

              <div className="pointer-events-none absolute -right-3 -top-3 h-20 w-20 rounded-full bg-brand-100/60 blur-2xl" />

              <div className="card-tactile relative mt-14 rounded-[22px] p-8">
                <AuthBrandAccent />

                {/* Acceso seguro */}
                <div className="flex items-center gap-3">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">

                    <LockKeyhole className="h-6 w-6 text-brand-600" />

                  </div>

                  <div>

                    <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-600">
                      Acceso seguro
                    </p>

                    <p className="mt-0.5 text-[14px] text-[#64748b]">
                      Ingresa tus credenciales
                    </p>

                  </div>

                </div>

                <h2 className="mt-6 text-[31px] font-bold tracking-[-0.025em] text-navy-900">
                  Iniciar sesión
                </h2>

                <p className="mt-2 text-[15px] leading-7 text-[#64748b]">
                  Accede a tu panel de Codrop.
                </p>

                {/* Error */}
                {error && (
                  <div className="fade-slide-down mt-6 flex items-start gap-2.5 rounded-[9px] border border-red-200 bg-red-50 p-3.5 text-[15px] text-red-600">

                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />

                    <span>
                      {error}
                    </span>

                  </div>
                )}

                {/* Formulario */}
                <form
                  onSubmit={handleSubmit}
                  className="mt-7 space-y-5"
                >

                  {/* Correo */}
                  <div>

                    <label
                      htmlFor="email"
                      className="mb-2 block text-[15px] font-semibold text-navy-900"
                    >
                      Correo electrónico
                    </label>

                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="h-[50px] w-full rounded-[9px] border border-[#d9e2e8] bg-white px-4 text-[16px] text-navy-900 placeholder-[#94a3b8] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />

                  </div>

                  {/* Contraseña */}
                  <div>

                    <div className="mb-2 flex items-center justify-between gap-4">

                      <label
                        htmlFor="password"
                        className="block text-[15px] font-semibold text-navy-900"
                      >
                        Contraseña
                      </label>

                      {onForgotPassword && (
                        <button
                          type="button"
                          onClick={onForgotPassword}
                          className="text-[14px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      )}

                    </div>

                    <input
                      id="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="h-[50px] w-full rounded-[9px] border border-[#d9e2e8] bg-white px-4 text-[16px] text-navy-900 placeholder-[#94a3b8] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />

                  </div>

                  {/* Botón login */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-tactile brand-focus flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-[9px] bg-brand-500 text-[16px] font-semibold text-white shadow-[0_10px_24px_rgba(40,181,134,0.20)] transition duration-150 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Iniciando sesión...
                      </>
                    ) : (
                      <>
                        Iniciar sesión
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}

                  </button>

                  {/* ===========================================
                      CUENTA DE PRUEBA
                  ============================================ */}
                  <button
                    type="button"
                    onClick={handleTestAccount}
                    className="btn-tactile brand-focus flex h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-brand-100 bg-brand-50/80 text-[14px] font-semibold text-brand-700 transition duration-150 hover:bg-brand-100"
                  >
                    <Zap className="h-4 w-4" />

                    Usar cuenta de prueba
                  </button>

                </form>

                {/* Registro */}
                <div className="mt-6 border-t border-[#eef2f1] pt-6 text-center">

                  <p className="text-[15px] leading-6 text-[#64748b]">

                    ¿Todavía no tienes una cuenta?{' '}

                    <button
                      type="button"
                      onClick={onRegister}
                      className="btn-tactile brand-focus cursor-pointer font-semibold text-brand-600 transition duration-150 hover:text-brand-700"
                    >
                      Crear cuenta
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
   COMPONENTE BENEFICIO
========================================================= */

function LoginBenefit({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="flex gap-3.5">

      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-brand-100 bg-white">

        <Icon className="h-[18px] w-[18px] text-brand-600" />

      </div>

      <div>

        <p className="text-[14px] font-semibold text-navy-900">
          {title}
        </p>

        <p className="mt-1 text-[13px] leading-6 text-[#64748b]">
          {text}
        </p>

      </div>

    </div>
  );
}