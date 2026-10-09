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
import codropIsotipo from '../assets/codrop-isotipo.png';
import PublicNavbar from '../components/layout/PublicNavbar';

export default function Register({
  onHome,
  onLogin,
  onVerification,
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

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
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

      if (onVerification) {
        setTimeout(() => {
          onVerification(email);
        }, 700);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No fue posible crear la cuenta.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f8f6] text-navy-900">

      <PublicNavbar
        variant="register"
        onHome={onHome}
        onLogin={onLogin}
      />


      <section className="px-4 py-10 sm:py-14">

        <div className="w-full max-w-[1180px] mx-auto grid lg:grid-cols-[430px_1fr] gap-8 lg:gap-10 items-stretch">


          {/* =================================================
              ONBOARDING
          ================================================== */}
          <div className="relative overflow-hidden rounded-[24px] bg-brand-50 border border-brand-100 p-8 lg:p-9">

            <div className="absolute -top-20 -left-20 w-[220px] h-[220px] rounded-full bg-brand-100/70 blur-3xl" />

            <div
              className="absolute right-0 bottom-0 w-[220px] h-[220px] opacity-[0.045]"
              style={{
                backgroundImage:
                  'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
                backgroundSize: '26px 26px',
              }}
            />


            <div className="relative z-10">

              <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-brand-600">
                Empieza con Codrop
              </p>


              <h2 className="mt-4 text-[34px] leading-[1.1] font-bold tracking-[-0.03em] text-navy-900">
                Publica tu primer proyecto en
                <span className="text-brand-500"> 3 pasos</span>
              </h2>


              <p className="mt-4 text-[14px] leading-6 text-[#64748b]">
                Sin configuraciones complicadas. Solo sube tu proyecto y deja
                que Codrop haga el resto.
              </p>


              <div className="mt-8 space-y-5">

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


              <div className="mt-9 relative">

                <div className="h-px bg-brand-100" />

                <div className="mt-6 flex items-end justify-between gap-4">

                  <div>
                    <p className="text-[12px] font-semibold text-navy-900">
                      Code + Drop
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-[#64748b]">
                      De tu código a la web,
                      <br />
                      sin complicaciones.
                    </p>
                  </div>


                  <img
                    src={codropIsotipo}
                    alt=""
                    aria-hidden="true"
                    className="w-[150px] opacity-[0.22]"
                  />

                </div>
              </div>

            </div>
          </div>


          {/* =================================================
              FORMULARIO
          ================================================== */}
          <div className="bg-white border border-[#dfe7e4] rounded-[24px] p-8 sm:p-[44px] shadow-[0_20px_60px_rgba(23,40,56,0.07)]">

            <div className="max-w-[570px] mx-auto">

              <div className="flex items-start justify-between gap-6">

                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-brand-600">
                    Nueva cuenta
                  </p>

                  <h2 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.025em] text-navy-900">
                    Crea tu cuenta
                  </h2>

                  <p className="mt-2 text-[14px] leading-6 text-[#64748b]">
                    Completa tus datos para comenzar a publicar tus proyectos.
                  </p>
                </div>


                <div className="hidden sm:flex w-12 h-12 rounded-xl bg-brand-50 items-center justify-center">
                  <Check className="w-5 h-5 text-brand-600" />
                </div>

              </div>


              <div className="mt-8">

                {error && (
                  <div className="flex items-start gap-2.5 p-3 mb-5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}


                {success && (
                  <div className="flex items-start gap-2.5 p-3 mb-5 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">

                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />

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
                    <label className="block text-[13px] font-semibold text-navy-900 mb-2">
                      Nombre completo
                    </label>

                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Fernando Espinoza"
                      className="w-full h-[46px] bg-white border border-[#d9e2e8] rounded-[9px] px-3.5 text-[14px] text-navy-900 placeholder-[#94a3b8] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
                    />
                  </div>


                  <div>
                    <label className="block text-[13px] font-semibold text-navy-900 mb-2">
                      Correo electrónico
                    </label>

                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full h-[46px] bg-white border border-[#d9e2e8] rounded-[9px] px-3.5 text-[14px] text-navy-900 placeholder-[#94a3b8] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
                    />
                  </div>


                  <div>
                    <label className="block text-[13px] font-semibold text-navy-900 mb-2">
                      Contraseña
                    </label>

                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="w-full h-[46px] bg-white border border-[#d9e2e8] rounded-[9px] px-3.5 text-[14px] text-navy-900 placeholder-[#94a3b8] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
                    />
                  </div>


                  <div>
                    <label className="block text-[13px] font-semibold text-navy-900 mb-2">
                      Confirmar contraseña
                    </label>

                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="w-full h-[46px] bg-white border border-[#d9e2e8] rounded-[9px] px-3.5 text-[14px] text-navy-900 placeholder-[#94a3b8] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
                    />
                  </div>


                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[46px] rounded-[9px] bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-[0_10px_24px_rgba(40,181,134,0.18)] transition-all hover:-translate-y-[1px]"
                  >

                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creando cuenta...
                      </>
                    ) : (
                      'Crear cuenta'
                    )}

                  </button>

                </form>


                <div className="mt-6 pt-6 border-t border-[#eef2f1] text-center">

                  <p className="text-[13px] text-[#64748b]">
                    ¿Ya tienes una cuenta?{' '}

                    <button
                      type="button"
                      onClick={onLogin}
                      className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
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


function Step({
  number,
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="flex gap-4">

      <div className="flex flex-col items-center">

        <div className="w-10 h-10 rounded-xl bg-white border border-brand-100 flex items-center justify-center shadow-sm">
          <Icon className="w-4 h-4 text-brand-600" />
        </div>

      </div>


      <div className="flex-1 pt-0.5">

        <div className="flex items-center gap-2">

          <span className="text-[10px] font-bold tracking-[0.12em] text-brand-500">
            {number}
          </span>

          <h3 className="text-[13px] font-semibold text-navy-900">
            {title}
          </h3>

        </div>


        <p className="mt-1 text-[12px] leading-5 text-[#64748b]">
          {text}
        </p>

      </div>

    </div>
  );
}