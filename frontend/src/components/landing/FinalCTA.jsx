import React from 'react';
import {
  ArrowRight,
  Rocket,
} from 'lucide-react';

export default function FinalCTA({
  onLogin,
  onRegister,
}) {
  return (
    <section className="relative overflow-hidden border-t border-[#edf2f0] bg-white py-20">
      <div className="mx-auto max-w-[1380px] px-6 lg:px-12">

        <div className="relative overflow-hidden rounded-[28px] border border-[#dce7e2] bg-gradient-to-br from-[#f4f9f7] via-[#ecf6f1] to-[#e4f2eb] p-10 text-center shadow-[0_20px_60px_rgba(23,40,56,0.06)] sm:p-16">

          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          <div className="pointer-events-none absolute -bottom-16 -right-16 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl" />

          <div className="pointer-events-none absolute -left-16 -top-16 h-80 w-80 rounded-full bg-brand-300/25 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-4xl">

            <div className="inline-flex items-center gap-2 rounded-full border border-[#CFE4D6] bg-[#EAF7F1] px-4 py-2 text-[14px] font-black uppercase tracking-[0.14em] text-[#1C7F62] shadow-sm">
              <Rocket className="h-4 w-4 text-brand-500" />
              Tu web en internet hoy
            </div>

            <h2 className="mt-6 text-[36px] font-black leading-[1.12] tracking-[-0.035em] text-navy-900 sm:text-[46px] lg:text-[52px]">
              Publica tus sitios web hoy mismo sin complicaciones
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-[18px] font-medium leading-8 text-[#64748b] sm:text-[20px]">
              Sin servidores complejos, sin esperas y con recursos dedicados.
              Comienza gratis y dale a tus proyectos el hogar en línea que se merecen.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">

              <button
                type="button"
                onClick={onRegister}
                className="btn-tactile flex h-[58px] cursor-pointer items-center justify-center gap-3 rounded-[12px] bg-brand-500 px-9 text-[17px] font-bold text-white shadow-[0_12px_28px_rgba(40,181,134,0.32)] transition duration-150 hover:bg-brand-600"
              >
                Crear cuenta gratuita
                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={onLogin}
                className="btn-tactile h-[58px] cursor-pointer rounded-[12px] border border-[#d6dfdb] bg-white px-9 text-[17px] font-semibold text-navy-900 shadow-sm transition duration-150 hover:border-brand-200 hover:bg-brand-50"
              >
                Iniciar sesión
              </button>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}