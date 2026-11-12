import React from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  Globe,
  Rocket,
  ShieldCheck,
  Upload,
} from 'lucide-react';

import codropIsotipo from '../../assets/codrop-isotipo.png';

export default function Hero({ onRegister }) {
  return (
    <section className="relative flex-1 overflow-hidden bg-[#f8fbfc]">
      {/* Fondos ambientales */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-180px] top-[-180px] h-[520px] w-[520px] rounded-full bg-brand-100/55 blur-[90px]" />
        <div className="absolute right-[120px] top-[-200px] h-[420px] w-[580px] rounded-full bg-brand-50 blur-[110px]" />
        <div className="absolute bottom-[-220px] right-[-150px] h-[520px] w-[520px] rounded-full bg-brand-100/45 blur-[80px]" />
      </div>

      {/* Formas decorativas */}
      <div className="pointer-events-none absolute -left-20 -top-16 h-[250px] w-[260px] rotate-[-12deg] rounded-[42%_58%_70%_30%/45%_45%_55%_55%] bg-brand-100/55" />

      <div className="pointer-events-none absolute -left-[120px] bottom-[90px] h-[210px] w-[240px] rotate-[18deg] rounded-[60%_40%_35%_65%/60%_55%_45%_40%] bg-brand-50" />

      {/* Cuadrícula decorativa */}
      <div
        className="pointer-events-none absolute right-0 top-[280px] h-[340px] w-[360px] opacity-[0.055]"
        style={{
          backgroundImage:
            'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <DotGrid className="absolute left-[70px] top-[82px]" />
      <DotGrid className="absolute bottom-[105px] right-[20px]" />

      {/* Cocodrilo decorativo */}
      <img
        src={codropIsotipo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-24px] left-[-38px] w-[520px] max-w-none select-none opacity-[0.09]"
      />

      {/* Contenido */}
      <div className="relative z-10 mx-auto flex min-h-[780px] max-w-[1380px] items-center px-6 lg:px-12">
        <div className="grid w-full items-center gap-16 py-20 lg:grid-cols-[1fr_540px] xl:gap-24">

          {/* Contenido principal */}
          <div className="max-w-[780px]">
            <div className="inline-flex items-center gap-3 rounded-full border border-brand-100 bg-brand-50/90 px-4 py-2.5 shadow-[0_5px_20px_rgba(40,181,134,0.08)]">
              <span className="h-2.5 w-2.5 flex-shrink-0 animate-pulse rounded-full bg-brand-500" />

              <span className="text-[15px] font-semibold text-brand-700 sm:text-[16px]">
                Tu proyecto entra como .zip y sale como URL pública
              </span>
            </div>

            <h1 className="mt-7 max-w-[800px] text-[48px] font-bold leading-[1.04] tracking-[-0.035em] text-navy-900 sm:text-[60px] lg:text-[68px]">
              De tu código a la web, sin{' '}
              <span className="text-brand-500">
                complicaciones
              </span>
            </h1>

            <p className="mt-8 max-w-[720px] text-[20px] leading-[1.6] text-[#64748b] sm:text-[22px]">
              Olvídate de servidores difíciles y configuraciones lentas.
              Sube tus archivos o elige una plantilla lista para usar: en
              5 segundos tu página web estará en línea, rápida y con su
              propio enlace para compartir con quien quieras.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={onRegister}
                className="btn-tactile flex h-[58px] cursor-pointer items-center justify-center gap-3 rounded-[10px] bg-brand-500 px-9 text-[17px] font-bold text-white shadow-[0_12px_28px_rgba(40,181,134,0.28)] transition duration-150 hover:bg-brand-600"
              >
                Empezar gratis en 1 minuto
                <ArrowRight className="h-5 w-5" />
              </button>

              <a
                href="#planes"
                className="btn-tactile flex h-[58px] cursor-pointer items-center justify-center rounded-[10px] border border-[#d6dfdb] bg-white px-9 text-[17px] font-semibold text-navy-900 shadow-sm transition duration-150 hover:border-[#b9d8ca] hover:text-brand-600"
              >
                Ver planes y precios
              </a>
            </div>

            <div className="mt-11 flex flex-wrap items-center gap-x-7 gap-y-4 text-[16px] text-[#64748b]">
              <Benefit>
                Tu web online al instante
              </Benefit>

              <Benefit>
                Recursos 100% dedicados
              </Benefit>

              <Benefit>
                Comienza gratis sin compromiso
              </Benefit>
            </div>
          </div>

          {/* Tarjeta derecha */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-[22px] border border-[#dfe7e4] bg-white/95 p-8 shadow-[0_24px_70px_rgba(23,40,56,0.09)] backdrop-blur-sm sm:p-9">
              <div className="absolute right-0 top-0 h-[58px] w-[58px] rounded-bl-[58px] bg-brand-100" />

              <div className="relative z-10 flex items-center gap-4">
                <div className="flex h-[68px] w-[68px] items-center justify-center rounded-[14px] bg-brand-50">
                  <img
                    src={codropIsotipo}
                    alt="Codrop Logo"
                    className="h-[52px] w-[62px] object-contain"
                  />
                </div>

                <div>
                  <p className="text-[14px] font-bold tracking-[0.16em] text-brand-600">
                    HOSTING MODERNO
                  </p>

                  <p className="mt-1.5 text-[16px] text-[#64748b]">
                    Sube. Enciende. Comparte.
                  </p>
                </div>
              </div>

              <h2 className="mt-8 text-[32px] font-bold leading-[1.12] tracking-[-0.03em] text-navy-900 sm:text-[36px]">
                Tu sitio en internet,
                <br />
                sin enredos técnicos
              </h2>

              <p className="mt-5 max-w-[440px] text-[17px] leading-7 text-[#64748b]">
                La forma más rápida de tener presencia en la web.
                Diseñado para que cualquier persona o negocio publique
                su proyecto sin depender de expertos en servidores.
              </p>

              <div className="mt-8 space-y-3.5">
                <FeatureRow
                  icon={Upload}
                  text="Arrastra y suelta tu archivo .ZIP"
                />

                <FeatureRow
                  icon={Rocket}
                  text="Plantillas listas para usar en 1 clic"
                />

                <FeatureRow
                  icon={ShieldCheck}
                  text="Tu web segura y siempre protegida"
                />

                <FeatureRow
                  icon={Activity}
                  text="Monitoreo claro de visitas y consumo"
                />

                <FeatureRow
                  icon={Globe}
                  text="Dirección web lista para compartir"
                />
              </div>

              <div className="mt-8 border-t border-[#eef2f1] pt-7">
                <button
                  type="button"
                  onClick={onRegister}
                  className="btn-tactile flex h-[54px] w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] bg-brand-50 text-[16px] font-semibold text-brand-700 transition duration-150 hover:bg-brand-100"
                >
                  Crear mi cuenta gratuita
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function FeatureRow({ icon: Icon, text }) {
  return (
    <div className="group flex min-h-[54px] items-center rounded-[10px] bg-brand-50 px-4 py-3 transition-colors hover:bg-brand-100">
      <Icon className="h-5 w-5 flex-shrink-0 text-brand-600" />

      <span className="ml-3 text-[15px] font-semibold text-brand-700">
        {text}
      </span>

      <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-brand-600 transition-transform group-hover:translate-x-0.5" />
    </div>
  );
}

function Benefit({ children }) {
  return (
    <div className="flex items-center gap-2">
      <Check className="h-[18px] w-[18px] flex-shrink-0 text-brand-500 stroke-[2.5]" />
      <span>{children}</span>
    </div>
  );
}

function DotGrid({ className = '' }) {
  const dots = Array.from({ length: 20 });

  return (
    <div
      className={`pointer-events-none grid grid-cols-5 gap-[9px] opacity-30 ${className}`}
    >
      {dots.map((_, index) => (
        <span
          key={index}
          className="h-[3px] w-[3px] rounded-full bg-brand-500"
        />
      ))}
    </div>
  );
}