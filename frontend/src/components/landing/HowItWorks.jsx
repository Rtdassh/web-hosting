import React from 'react';
import {
  Globe,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';

export default function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="border-t border-[#edf2f0] bg-white py-24"
    >
      <div className="mx-auto max-w-[1380px] px-6 lg:px-12">

        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-[14px] font-bold uppercase tracking-[0.14em] text-brand-700">
            <Sparkles className="h-4 w-4 text-brand-500" />
            Sencillo y Veloz
          </span>

          <h2 className="mt-5 text-[34px] font-bold leading-tight tracking-[-0.03em] text-navy-900 sm:text-[42px] lg:text-[46px]">
            Tres pasos simples para tener tu página web funcionando
          </h2>

          <p className="mt-5 text-[18px] leading-8 text-[#64748b] sm:text-[20px]">
            Eliminamos toda la fricción. Solo necesitas tu diseño o elegir
            una plantilla y nosotros nos ocupamos de todo lo demás.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <StepCard
            number="01"
            icon={Upload}
            title="1. Carga o Elige Plantilla"
            description="Sube tu página en un archivo comprimido (.zip) o elige una plantilla profesional de nuestro catálogo: landing comercial, portafolio de trabajo o sitio de documentación."
          />

          <StepCard
            number="02"
            icon={ShieldCheck}
            title="2. Codrop lo Prepara al Instante"
            description="Asignamos un espacio exclusivo con su propia memoria y procesador garantizados para tu sitio. Nada de servidores compartidos donde la página de otro ralentice la tuya."
          />

          <StepCard
            number="03"
            icon={Globe}
            title="3. Comparte tu Enlace con el Mundo"
            description="Recibes al instante una dirección web directa para mostrar tu trabajo a clientes, reclutadores y amigos. Enciende, apaga o actualiza tu web con un solo clic."
          />
        </div>

      </div>
    </section>
  );
}

function StepCard({
  number,
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="relative rounded-[22px] border border-[#dfe7e4] bg-[#fbfdfc] p-8 shadow-[0_10px_30px_rgba(23,40,56,0.04)] transition-all hover:shadow-[0_16px_40px_rgba(23,40,56,0.08)]">

      <div className="mb-6 flex items-center justify-between">

        <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-brand-50 text-brand-600">
          <Icon className="h-7 w-7" />
        </div>

        <span className="text-[32px] font-black tracking-tight text-brand-100">
          {number}
        </span>

      </div>

      <h3 className="text-[22px] font-bold leading-snug tracking-tight text-navy-900">
        {title}
      </h3>

      <p className="mt-4 text-[17px] leading-7 text-[#64748b]">
        {description}
      </p>

    </div>
  );
}