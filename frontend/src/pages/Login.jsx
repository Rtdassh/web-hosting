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
import codropIsotipo from '../assets/codrop-isotipo.png';
import PublicNavbar from '../components/layout/PublicNavbar';

export default function Login({
  onHome,
  onRegister,
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
        err.response?.data?.detail ||
        'No fue posible iniciar sesión.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTestAccount = () => {
    setEmail('dev@cloudpaas.local');
    setPassword('admin123');
    setError('');
  };

  return (
    <main className="min-h-screen bg-[#f6faf8] text-navy-900 relative overflow-hidden">

      {/* =====================================================
          FONDO
      ====================================================== */}
      <div className="absolute inset-0 pointer-events-none">

        <div className="absolute top-[-170px] left-1/2 -translate-x-1/2 w-[620px] h-[420px] rounded-full bg-brand-100/50 blur-[100px]" />

        <div className="absolute bottom-[-180px] right-[-150px] w-[430px] h-[430px] rounded-full bg-brand-50 blur-[90px]" />

        <div
          className="absolute left-0 bottom-0 w-[300px] h-[280px] opacity-[0.035]"
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
      />


      {/* =====================================================
          CONTENIDO
      ====================================================== */}
      <section className="relative z-10 px-4 py-12 sm:py-14">

        <div className="w-full max-w-[980px] mx-auto">


          {/* =================================================
              INTRO
          ================================================== */}
          <div className="text-center max-w-[620px] mx-auto">

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100">

              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />

              <span className="text-[11px] font-bold tracking-[0.04em] text-brand-700">
                TU WORKSPACE TE ESPERA
              </span>

            </div>


            <h1 className="mt-5 text-[38px] sm:text-[42px] leading-[1.08] font-bold tracking-[-0.035em] text-navy-900">

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


            <p className="mt-4 text-[15px] leading-6 text-[#64748b]">
              Ingresa a tu cuenta para continuar administrando tus
              despliegues y sitios publicados.
            </p>

          </div>


          {/* =================================================
              ZONA LOGIN
          ================================================== */}
          <div className="mt-10 grid lg:grid-cols-[1fr_430px] gap-8 items-stretch">


            {/* =================================================
                PANEL INFORMATIVO
            ================================================== */}
            <div className="hidden lg:block relative overflow-hidden rounded-[22px] bg-[#eef8f3] border border-brand-100 p-8">

              <div className="absolute -top-16 -left-16 w-[180px] h-[180px] rounded-full bg-brand-100/80 blur-3xl" />


              <div className="relative z-10">

                <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-brand-600">
                  Todo sigue donde lo dejaste
                </p>


                <h2 className="mt-3 text-[26px] leading-[1.15] font-bold tracking-[-0.025em] text-navy-900">
                  Tu espacio de trabajo está listo
                </h2>


                <p className="mt-3 text-[13px] leading-6 text-[#64748b]">
                  Regresa a tus proyectos sin volver a configurar nada.
                </p>


                <div className="mt-7 space-y-4">

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


                <div className="mt-9 pt-6 border-t border-brand-100">

                  <div className="flex items-end justify-between gap-4">

                    <div>

                      <p className="text-[12px] font-semibold text-navy-900">
                        Code + Drop
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-[#64748b]">
                        Tu proyecto,
                        <br />
                        siempre a un clic.
                      </p>

                    </div>


                    <img
                      src={codropIsotipo}
                      alt=""
                      aria-hidden="true"
                      className="w-[130px] opacity-[0.2]"
                    />

                  </div>

                </div>

              </div>
            </div>


            {/* =================================================
                FORMULARIO
            ================================================== */}
            <div className="relative">

              <div className="absolute -top-3 -right-3 w-20 h-20 rounded-full bg-brand-100/60 blur-2xl pointer-events-none" />


              <div className="relative bg-white border border-[#dfe7e4] rounded-[22px] p-8 shadow-[0_22px_60px_rgba(23,40,56,0.08)]">


                {/* Acceso seguro */}
                <div className="flex items-center gap-3">

                  <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">

                    <LockKeyhole className="w-5 h-5 text-brand-600" />

                  </div>


                  <div>

                    <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-brand-600">
                      Acceso seguro
                    </p>

                    <p className="mt-0.5 text-[12px] text-[#64748b]">
                      Ingresa tus credenciales
                    </p>

                  </div>

                </div>


                <h2 className="mt-6 text-[28px] font-bold tracking-[-0.025em] text-navy-900">
                  Iniciar sesión
                </h2>


                <p className="mt-2 text-[13px] leading-6 text-[#64748b]">
                  Accede a tu panel de Codrop.
                </p>


                {/* Error */}
                {error && (
                  <div className="mt-6 flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 text-red-600 rounded-[9px] text-sm">

                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />

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
                      className="block text-[13px] font-semibold text-navy-900 mb-2"
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
                      className="w-full h-[46px] bg-white border border-[#d9e2e8] rounded-[9px] px-3.5 text-[14px] text-navy-900 placeholder-[#94a3b8] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
                    />

                  </div>


                  {/* Contraseña */}
                  <div>

                    <label
                      htmlFor="password"
                      className="block text-[13px] font-semibold text-navy-900 mb-2"
                    >
                      Contraseña
                    </label>

                    <input
                      id="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="w-full h-[46px] bg-white border border-[#d9e2e8] rounded-[9px] px-3.5 text-[14px] text-navy-900 placeholder-[#94a3b8] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
                    />

                  </div>


                  {/* Botón login */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[46px] rounded-[9px] bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-[0_10px_24px_rgba(40,181,134,0.20)] transition-all hover:-translate-y-[1px]"
                  >

                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Iniciando sesión...
                      </>
                    ) : (
                      <>
                        Iniciar sesión
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}

                  </button>


                  {/* ===========================================
                      CUENTA DE PRUEBA - VIENE DE DEVELOPMENT
                  ============================================ */}
                  <button
                    type="button"
                    onClick={handleTestAccount}
                    className="w-full h-[40px] rounded-[9px] border border-brand-100 bg-brand-50/80 hover:bg-brand-100 text-brand-700 text-[12px] font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />

                    Usar cuenta de prueba
                  </button>

                </form>


                {/* Registro */}
                <div className="mt-6 pt-6 border-t border-[#eef2f1] text-center">

                  <p className="text-[13px] text-[#64748b]">

                    ¿Todavía no tienes una cuenta?{' '}

                    <button
                      type="button"
                      onClick={onRegister}
                      className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
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
    <div className="flex gap-3">

      <div className="w-9 h-9 rounded-[10px] bg-white border border-brand-100 flex items-center justify-center flex-shrink-0">

        <Icon className="w-4 h-4 text-brand-600" />

      </div>


      <div>

        <p className="text-[12px] font-semibold text-navy-900">
          {title}
        </p>

        <p className="mt-1 text-[11px] leading-5 text-[#64748b]">
          {text}
        </p>

      </div>

    </div>
  );
}