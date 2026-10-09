import React from 'react';
import {
  Upload,
  Container,
  Activity,
  FileText,
  ArrowRight,
  Check,
} from 'lucide-react';

import codropIsotipo from '../assets/codrop-isotipo.png';
import PublicNavbar from '../components/layout/PublicNavbar';

export default function Landing({ onLogin, onRegister }) {
  const handleFeatures = () => {
    document.getElementById('features')?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  return (
    <main className="min-h-screen bg-white text-navy-900 flex flex-col">

      {/* =====================================================
          NAVBAR COMPARTIDO
      ====================================================== */}
      <PublicNavbar
        variant="landing"
        onHome={() =>
          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          })
        }
        onLogin={onLogin}
        onRegister={onRegister}
      />


      {/* =====================================================
          HERO
      ====================================================== */}
      <section className="relative flex-1 overflow-hidden bg-[#f8fbfc]">

        {/* Fondo */}
        <div className="absolute inset-0 pointer-events-none">

          <div className="absolute top-[-180px] left-[-180px] w-[520px] h-[520px] rounded-full bg-brand-100/55 blur-[90px]" />

          <div className="absolute top-[-200px] right-[120px] w-[580px] h-[420px] rounded-full bg-brand-50 blur-[110px]" />

          <div className="absolute bottom-[-220px] right-[-150px] w-[520px] h-[520px] rounded-full bg-brand-100/45 blur-[80px]" />

        </div>


        {/* Forma superior izquierda */}
        <div className="absolute -top-16 -left-20 w-[260px] h-[250px] rounded-[42%_58%_70%_30%/45%_45%_55%_55%] bg-brand-100/55 rotate-[-12deg] pointer-events-none" />


        {/* Forma inferior izquierda */}
        <div className="absolute bottom-[90px] -left-[120px] w-[240px] h-[210px] rounded-[60%_40%_35%_65%/60%_55%_45%_40%] bg-brand-50 rotate-[18deg] pointer-events-none" />


        {/* Cuadrícula derecha */}
        <div
          className="absolute right-0 top-[280px] w-[360px] h-[340px] opacity-[0.055] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />


        <DotGrid className="absolute left-[70px] top-[82px]" />
        <DotGrid className="absolute right-[20px] bottom-[105px]" />


        <div className="absolute left-[90px] top-[440px] w-6 h-6 rounded-md bg-brand-100/80" />

        <div className="absolute left-[55px] bottom-[145px] w-6 h-6 rounded-md bg-brand-100/70" />


        {/* Cocodrilo decorativo */}
        <img
          src={codropIsotipo}
          alt=""
          aria-hidden="true"
          className="absolute left-[-38px] bottom-[-24px] w-[520px] max-w-none opacity-[0.10] pointer-events-none select-none"
        />


        {/* Contenido */}
        <div className="relative z-10 max-w-[1380px] mx-auto px-6 lg:px-12 min-h-[735px] flex items-center">

          <div className="w-full grid lg:grid-cols-[1fr_520px] gap-16 xl:gap-24 items-center py-16">


            {/* =================================================
                IZQUIERDA
            ================================================== */}
            <div className="max-w-[760px]">

              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-brand-50/90 border border-brand-100 shadow-[0_5px_20px_rgba(40,181,134,0.08)]">
                <span className="w-2 h-2 rounded-full bg-brand-500" />

                <span className="text-[13px] font-semibold text-brand-700">
                  Tu proyecto entra como .zip y sale como URL
                </span>
              </div>


              <h1 className="mt-6 max-w-[760px] text-[46px] sm:text-[54px] lg:text-[58px] leading-[1.03] font-bold tracking-[-0.035em] text-navy-900">
                De tu código a la web, sin{' '}
                <span className="text-brand-500">
                  complicaciones
                </span>
              </h1>


              <p className="mt-7 max-w-[670px] text-[18px] sm:text-[19px] leading-[1.55] text-[#64748b]">
                Sube tu proyecto en un archivo .zip y obtén una URL pública.
                <br className="hidden sm:block" />
                Codrop se encarga del resto.
              </p>


              <div className="mt-9 flex flex-col sm:flex-row gap-4">

                <button
                  type="button"
                  onClick={onRegister}
                  className="h-[50px] px-7 rounded-[9px] bg-brand-500 hover:bg-brand-600 text-white text-[14px] font-semibold flex items-center justify-center gap-3 shadow-[0_10px_25px_rgba(40,181,134,0.22)] transition-all hover:-translate-y-[1px]"
                >
                  Comenzar ahora
                  <ArrowRight className="w-4 h-4" />
                </button>


                <button
                  type="button"
                  onClick={handleFeatures}
                  className="h-[50px] px-7 rounded-[9px] bg-white border border-brand-500 hover:bg-brand-50 text-brand-700 text-[14px] font-semibold transition-colors"
                >
                  Ver características
                </button>

              </div>


              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-[12px] text-[#64748b]">

                <Benefit>
                  .zip listo para desplegar
                </Benefit>

                <Benefit>
                  URL pública automática
                </Benefit>

                <Benefit>
                  Sin configurar servidores
                </Benefit>

              </div>

            </div>


            {/* =================================================
                DERECHA
            ================================================== */}
            <div className="relative">

              <div className="absolute -right-8 -top-5 flex flex-col gap-1 rotate-[20deg]">
                <span className="block w-1 h-5 rounded-full bg-brand-500" />
                <span className="block w-1 h-5 rounded-full bg-brand-500 rotate-[40deg] translate-x-3" />
                <span className="block w-1 h-5 rounded-full bg-brand-500 rotate-[75deg] translate-x-5" />
              </div>


              <div
                className="hidden xl:block absolute -right-[145px] top-[70px] text-brand-500 text-[24px] font-semibold rotate-[-10deg]"
                style={{
                  fontFamily:
                    "'Comic Sans MS', 'Bradley Hand', cursive",
                }}
              >
                .zip → URL

                <div className="absolute left-3 top-9 w-[64px] h-[40px] border-b-2 border-l-2 border-brand-500 rounded-bl-[80%] rotate-[-12deg]" />
              </div>


              <div className="relative bg-white/95 backdrop-blur-sm border border-[#dfe7e4] rounded-[22px] p-8 shadow-[0_24px_70px_rgba(23,40,56,0.09)] overflow-hidden">

                <div className="absolute top-0 right-0 w-[58px] h-[58px] bg-brand-100 rounded-bl-[58px]" />


                <div className="flex items-center gap-4 relative z-10">

                  <div className="w-[64px] h-[64px] rounded-[14px] bg-brand-50 flex items-center justify-center">
                    <img
                      src={codropIsotipo}
                      alt=""
                      className="w-[58px] h-[48px] object-contain"
                    />
                  </div>


                  <div>
                    <p className="text-[12px] tracking-[0.18em] font-bold text-brand-600">
                      CODE + DROP
                    </p>

                    <p className="mt-1 text-[13px] text-[#64748b]">
                      Sube. Despliega. Comparte.
                    </p>
                  </div>

                </div>


                <h2 className="mt-7 text-[31px] leading-[1.12] font-bold tracking-[-0.03em] text-navy-900">
                  Tu proyecto, listo para
                  <br />
                  compartir
                </h2>


                <p className="mt-4 max-w-[420px] text-[14px] leading-6 text-[#64748b]">
                  Todo lo necesario para publicar y administrar tus sitios
                  desde una sola plataforma.
                </p>


                <div
                  id="features"
                  className="mt-7 space-y-3"
                >

                  <Feature
                    icon={Upload}
                    text="Despliegues con ZIP"
                  />

                  <Feature
                    icon={Container}
                    text="Contenedores aislados"
                  />

                  <Feature
                    icon={Activity}
                    text="Métricas CPU / RAM"
                  />

                  <Feature
                    icon={FileText}
                    text="Logs de Nginx"
                  />

                </div>


                <div className="mt-7 pt-6 border-t border-[#eef2f1]">

                  <button
                    type="button"
                    onClick={onRegister}
                    className="w-full h-[50px] rounded-[10px] bg-brand-50 hover:bg-brand-100 text-brand-700 text-[14px] font-semibold flex items-center justify-center gap-3 transition-colors"
                  >
                    Empieza a desplegar
                    <ArrowRight className="w-4 h-4" />
                  </button>

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>


      {/* =====================================================
          FOOTER
      ====================================================== */}
      <footer className="h-[84px] bg-white border-t border-[#e2e8f0]">

        <div className="max-w-[1380px] mx-auto h-full px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#64748b]">

          <span>
            <strong className="font-semibold text-[#52677a]">
              Codrop
            </strong>
            {' '}• Web Hosting Platform
          </span>

          <span>
            De tu código a la web, sin complicaciones
          </span>

        </div>

      </footer>

    </main>
  );
}


function Feature({ icon: Icon, text }) {
  return (
    <div className="group h-[50px] px-5 rounded-[10px] bg-brand-50 hover:bg-brand-100 flex items-center transition-colors">

      <Icon className="w-[18px] h-[18px] text-brand-600 flex-shrink-0" />

      <span className="ml-4 text-[14px] font-semibold text-brand-700">
        {text}
      </span>

      <ArrowRight className="ml-auto w-4 h-4 text-brand-600 transition-transform group-hover:translate-x-0.5" />

    </div>
  );
}


function Benefit({ children }) {
  return (
    <div className="flex items-center gap-2.5">
      <Check className="w-4 h-4 text-brand-500 stroke-[2.5]" />
      <span>{children}</span>
    </div>
  );
}


function DotGrid({ className = '' }) {
  const dots = Array.from({ length: 20 });

  return (
    <div
      className={`
        grid
        grid-cols-5
        gap-[9px]
        opacity-30
        pointer-events-none
        ${className}
      `}
    >
      {dots.map((_, index) => (
        <span
          key={index}
          className="w-[3px] h-[3px] rounded-full bg-brand-500"
        />
      ))}
    </div>
  );
}