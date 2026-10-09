import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import codropIsotipo from '../assets/codrop-isotipo.png';
import PublicNavbar from '../components/layout/PublicNavbar';

export default function Verification({
  email,
  onHome,
  onLogin,
}) {
  const [resent, setResent] = useState(false);

  const handleResend = () => {
    setResent(true);
  };

  return (
    <main className="min-h-screen bg-[#f5f9f7] text-navy-900 relative overflow-hidden">

      {/* Fondo */}
      <div className="absolute inset-0 pointer-events-none">

        <div className="absolute top-[-180px] left-1/2 -translate-x-1/2 w-[620px] h-[380px] rounded-full bg-brand-100/45 blur-[105px]" />

        <div className="absolute bottom-[-200px] right-[-120px] w-[420px] h-[420px] rounded-full bg-brand-50 blur-[95px]" />

        <div
          className="absolute left-0 bottom-0 w-[260px] h-[230px] opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div
          className="absolute right-0 top-[260px] w-[240px] h-[220px] opacity-[0.028]"
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
      />


      {/* Contenido */}
      <section className="relative z-10 px-4 pt-5 pb-6 sm:pt-6 sm:pb-7">

        <div className="w-full max-w-[920px] mx-auto">


          {/* Encabezado */}
          <div className="text-center max-w-[650px] mx-auto">

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />

              <span className="text-[11px] font-bold tracking-[0.05em] text-brand-700">
                UN ÚLTIMO PASO
              </span>
            </div>


            <h1 className="mt-4 text-[34px] sm:text-[40px] leading-[1.05] font-bold tracking-[-0.035em] text-navy-900">
              Revisa tu correo y{' '}
              <span className="text-brand-500">
                activa tu cuenta
              </span>
            </h1>


            <p className="mt-3 text-[14px] leading-6 text-[#64748b]">
              Te enviamos las instrucciones para completar tu registro en Codrop.
            </p>

          </div>


          {/* Card principal */}
          <div className="mt-5 relative">

            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-brand-100/45 blur-2xl pointer-events-none" />


            <div className="relative bg-white border border-[#dfe7e4] rounded-[24px] shadow-[0_20px_55px_rgba(23,40,56,0.075)] overflow-hidden">


              {/* Banda superior */}
              <div className="relative px-7 sm:px-8 py-6 bg-brand-50/70 border-b border-brand-100">

                <div className="flex items-center gap-4">

                  <div className="w-[54px] h-[54px] rounded-[15px] bg-white border border-brand-100 flex items-center justify-center shadow-sm flex-shrink-0">
                    <Mail className="w-6 h-6 text-brand-600" />
                  </div>


                  <div className="flex-1">

                    <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-brand-600">
                      Correo enviado
                    </p>

                    <h2 className="mt-1 text-[25px] sm:text-[27px] leading-tight font-bold tracking-[-0.025em] text-navy-900">
                      Verifica tu dirección de correo
                    </h2>

                    <p className="mt-1 text-[12px] leading-5 text-[#64748b]">
                      Abre el mensaje que enviamos y sigue el enlace de verificación.
                    </p>

                  </div>

                </div>


                <div className="absolute top-0 right-0 w-[64px] h-[64px] bg-brand-100 rounded-bl-[64px]" />

              </div>


              {/* Cuerpo */}
              <div className="p-6 sm:p-7">


                {/* Email */}
                <div className="rounded-[13px] border border-[#dfe7e4] bg-[#fbfdfc] px-5 py-4">

                  <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-[#94a3b8]">
                    Enviado a
                  </p>


                  <div className="mt-2 flex items-center gap-3">

                    <div className="w-9 h-9 rounded-[9px] bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-brand-600" />
                    </div>

                    <span className="text-[14px] font-semibold text-navy-900 break-all">
                      {email || 'tu correo electrónico'}
                    </span>

                  </div>

                </div>


                {/* Progreso */}
                <div className="mt-5">

                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-brand-600">
                    Tu progreso
                  </p>


                  <div className="mt-3 grid md:grid-cols-3 gap-3">

                    <ProgressCard
                      number="01"
                      title="Cuenta creada"
                      text="Tus datos ya están registrados."
                      completed
                    />

                    <ProgressCard
                      number="02"
                      title="Verificar correo"
                      text="Abre el mensaje y confirma tu dirección."
                      active
                    />

                    <ProgressCard
                      number="03"
                      title="Entrar a Codrop"
                      text="Después podrás acceder a tu panel."
                    />

                  </div>

                </div>


                {/* =================================================
                    MENSAJE FIJO:
                    ayuda o confirmación ocupan el mismo espacio
                ================================================== */}
                {resent ? (
                  <div className="mt-5 flex gap-3 px-4 py-3 rounded-[12px] bg-green-50 border border-green-200 text-green-700">

                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />

                    <div>
                      <p className="text-[12px] font-semibold">
                        Correo reenviado correctamente
                      </p>

                      <p className="mt-0.5 text-[11px] leading-5 text-green-700/80">
                        Revisa nuevamente tu bandeja de entrada.
                      </p>
                    </div>

                  </div>
                ) : (
                  <div className="mt-5 flex gap-3 px-4 py-3 rounded-[12px] bg-brand-50/70 border border-brand-100">

                    <ShieldCheck className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />

                    <div>
                      <p className="text-[12px] font-semibold text-navy-900">
                        ¿No ves el correo?
                      </p>

                      <p className="mt-0.5 text-[11px] leading-5 text-[#64748b]">
                        Revisa spam o espera unos minutos antes de reenviarlo.
                      </p>
                    </div>

                  </div>
                )}


                {/* Acciones */}
                <div className="mt-5 flex flex-col sm:flex-row gap-3">

                  <button
                    type="button"
                    onClick={onLogin}
                    className="flex-1 h-[44px] rounded-[9px] bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(40,181,134,0.16)] transition-all hover:-translate-y-[1px]"
                  >
                    Ya verifiqué mi correo
                    <ArrowRight className="w-4 h-4" />
                  </button>


                  <button
                    type="button"
                    onClick={handleResend}
                    className="flex-1 h-[44px] rounded-[9px] bg-white border border-brand-100 hover:bg-brand-50 text-brand-700 text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reenviar correo
                  </button>

                </div>


                {/* Cierre */}
                <div className="mt-5 pt-5 border-t border-[#eef2f1] flex items-center justify-between gap-4">

                  <div>
                    <p className="text-[11px] font-semibold text-navy-900">
                      Ya casi estás dentro
                    </p>

                    <p className="mt-0.5 text-[10px] leading-4 text-[#64748b]">
                      Completa la verificación y continúa hacia tu dashboard.
                    </p>
                  </div>


                  <img
                    src={codropIsotipo}
                    alt=""
                    aria-hidden="true"
                    className="w-[95px] opacity-[0.16] hidden sm:block"
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
        rounded-[12px]
        border
        p-3.5
        min-h-[105px]
        ${
          completed
            ? 'bg-brand-50 border-brand-100'
            : active
            ? 'bg-white border-brand-500 shadow-[0_6px_18px_rgba(40,181,134,0.07)]'
            : 'bg-[#fbfcfc] border-[#e8eeeb]'
        }
      `}
    >

      <div
        className={`
          w-8
          h-8
          rounded-[9px]
          flex
          items-center
          justify-center
          ${
            completed
              ? 'bg-brand-500 text-white'
              : active
              ? 'bg-brand-50 text-brand-600 border border-brand-100'
              : 'bg-white text-[#94a3b8] border border-[#e2e8f0]'
          }
        `}
      >
        {completed ? (
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
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