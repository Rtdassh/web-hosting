import React from 'react';
import { Box, ShieldCheck, Rocket, SlidersHorizontal } from 'lucide-react';

const benefits = [
  { icon: Box, title: 'Recursos exclusivos', text: 'Memoria y procesador reservados para que tu proyecto tenga su propio espacio.' },
  { icon: ShieldCheck, title: 'Archivos protegidos', text: 'Tu contenido queda protegido frente a modificaciones externas.' },
  { icon: Rocket, title: 'Plantillas en un clic', text: 'Elige un diseño, hazlo tuyo y empieza sin partir de cero.' },
  { icon: SlidersHorizontal, title: 'El control, fácil', text: 'Enciende, actualiza y revisa tu sitio desde un panel claro.' },
];

/** A compact editorial ribbon: one shared surface, no nested dashboard cards. */
export default function HostingBenefits() {
  return (
    <div className="relative isolate overflow-hidden rounded-[28px] sm:rounded-[36px] bg-gradient-to-br from-brand-100 via-brand-50 to-[#f3faf6] px-6 py-9 sm:p-10 xl:px-12 xl:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border-[40px] border-brand-500/[0.06] -z-10" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-10 h-40 w-64 rounded-[50%] bg-brand-100/50 -rotate-12 -z-10" />

      <div className="grid grid-cols-2 gap-x-6 gap-y-9 md:grid-cols-4 xl:grid-cols-[1.4fr_repeat(4,1fr)] xl:gap-8">
        <div className="col-span-2 md:col-span-4 xl:col-span-1 xl:pr-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-brand-700">¿Por qué elegir Codrop?</p>
          <h2 className="mt-3 max-w-xs text-[30px] sm:text-[34px] leading-[1.12] font-bold tracking-[-0.035em] text-navy-900">Tu web,<br />en buenas manos.</h2>
          <p className="mt-4 max-w-xs text-xs leading-6 text-navy-700">Tú dale vida a tu idea.<br className="hidden xl:block" /> Nosotros cuidamos los detalles.</p>
        </div>

        {benefits.map(({ icon: Icon, title, text }, index) => (
          <div key={title} className="relative pt-1">
            <span aria-hidden="true" className={`inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/85 text-brand-700 ring-1 ring-white/80 ${index % 2 ? 'rotate-3' : '-rotate-3'}`}>
              <Icon className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <p className="mt-5 text-[9px] font-bold tracking-[0.2em] text-brand-700/60">0{index + 1}</p>
            <h3 className="mt-1.5 text-[13px] font-bold text-navy-900">{title}</h3>
            <p className="mt-2 text-xs leading-[1.8] text-navy-700">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
