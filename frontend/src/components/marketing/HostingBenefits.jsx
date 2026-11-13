import React from 'react';
import {
  Box,
  Rocket,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

const benefits = [
  {
    icon: Box,
    title: 'Recursos exclusivos',
    text: 'Memoria y procesador reservados para que tu proyecto tenga su propio espacio.',
  },
  {
    icon: ShieldCheck,
    title: 'Archivos protegidos',
    text: 'Tu contenido queda protegido frente a modificaciones externas.',
  },
  {
    icon: Rocket,
    title: 'Plantillas en un clic',
    text: 'Elige un diseño, hazlo tuyo y empieza sin partir de cero.',
  },
  {
    icon: SlidersHorizontal,
    title: 'El control, fácil',
    text: 'Enciende, actualiza y revisa tu sitio desde un panel claro.',
  },
];

export default function HostingBenefits() {
  return (
    <div className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-100 via-brand-50 to-[#f3faf6] px-6 py-10 sm:rounded-[36px] sm:p-10 xl:px-12 xl:py-14">

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-32 -z-10 h-80 w-80 rounded-full border-[40px] border-brand-500/[0.06]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-10 -z-10 h-40 w-64 -rotate-12 rounded-[50%] bg-brand-100/50"
      />

      <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-[1.4fr_repeat(4,1fr)] xl:gap-8">

        <div className="sm:col-span-2 md:col-span-4 xl:col-span-1 xl:pr-4">

          <p className="text-[14px] font-bold uppercase tracking-[0.14em] text-brand-700">
            ¿Por qué elegir Codrop?
          </p>

          <h2 className="mt-4 max-w-sm text-[34px] font-bold leading-[1.12] tracking-[-0.035em] text-navy-900 sm:text-[40px]">
            Tu web,
            <br />
            en buenas manos.
          </h2>

          <p className="mt-5 max-w-sm text-[17px] leading-7 text-navy-700">
            Tú dale vida a tu idea. Nosotros cuidamos los detalles.
          </p>

        </div>

        {benefits.map(
          (
            {
              icon: Icon,
              title,
              text,
            },
            index,
          ) => (
            <article
              key={title}
              className="relative pt-1"
            >
              <span
                aria-hidden="true"
                className={`inline-flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/85 text-brand-700 ring-1 ring-white/80 ${
                  index % 2
                    ? 'rotate-3'
                    : '-rotate-3'
                }`}
              >
                <Icon
                  className="h-7 w-7"
                  strokeWidth={1.5}
                />
              </span>

              <p className="mt-5 text-[13px] font-bold tracking-[0.16em] text-brand-700/70">
                0{index + 1}
              </p>

              <h3 className="mt-2 text-[19px] font-bold leading-snug text-navy-900">
                {title}
              </h3>

              <p className="mt-3 text-[16px] leading-7 text-navy-700">
                {text}
              </p>
            </article>
          ),
        )}

      </div>

    </div>
  );
}