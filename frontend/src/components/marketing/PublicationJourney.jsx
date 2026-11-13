import React, { useState } from 'react';
import { Upload, ShieldCheck, Globe, ArrowRight, Check, FileArchive, Sparkles } from 'lucide-react';

const steps = [
  { icon: Upload, title: '1. Carga o Elige Plantilla', description: 'Sube tu página en un archivo comprimido (.zip) o elige una plantilla profesional de nuestro catálogo: landing comercial, portafolio de trabajo o sitio de documentación.' },
  { icon: ShieldCheck, title: '2. Codrop lo Prepara al Instante', description: 'Asignamos un espacio exclusivo con su propia memoria y procesador garantizados para tu sitio. Nada de servidores compartidos donde la página de otro ralentice la tuya.' },
  { icon: Globe, title: '3. Comparte tu Enlace con el Mundo', description: 'Recibes al instante una dirección web directa para mostrar tu trabajo a clientes, reclutadores y amigos. Enciende, apaga o actualiza tu web con un solo clic.' },
];

export default function PublicationJourney() {
  const [active, setActive] = useState(0);
  return (
    <section id="como-funciona" className="py-20 sm:py-24 bg-white border-t border-brand-50">
      <div className="max-w-[1380px] mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-brand-700"><Sparkles className="w-4 h-4" />Sencillo y Veloz</span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-navy-900">Tu idea tiene un camino.<br /><span className="text-brand-600">Y termina en línea.</span></h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">Tres pasos simples para tener tu página web funcionando. Solo necesitas tu diseño o elegir una plantilla; nosotros nos ocupamos de todo lo demás.</p>
          <div className="mt-7 space-y-2" role="group" aria-label="Pasos para publicar">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <button key={title} type="button" aria-pressed={active === index} aria-controls="publication-preview"
                onClick={() => setActive(index)} className={`brand-focus w-full text-left rounded-2xl p-4 transition-colors border ${active === index ? 'border-brand-100 bg-brand-50' : 'border-transparent hover:bg-slate-50'}`}>
                <span className="flex items-start gap-4">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${active === index ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{String(index + 1).padStart(2, '0')}</span>
                  <span><span className="flex items-center gap-2 text-sm font-bold text-navy-900"><Icon aria-hidden="true" className="h-4 w-4 text-brand-600 shrink-0" />{title}</span>
                    <span className="block mt-2 text-xs leading-6 text-slate-500">{description}</span></span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="relative rounded-[32px] bg-brand-50 bg-brand-stripes-subtle p-5 sm:p-10">
          <div className="flex items-center justify-between mb-7 text-[10px] font-bold tracking-widest uppercase text-brand-700"><span>De archivo a sitio web</span><span>0{active + 1} / 03</span></div>
          <div id="publication-preview" role="status" aria-live="polite" aria-atomic="true" className="relative min-h-[330px] sm:min-h-[370px] rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_16px_35px_rgba(23,40,56,0.07)]">
            {active === 0 && <div className="text-center py-5">
              <div className="mx-auto flex h-24 w-24 rotate-[-8deg] items-center justify-center rounded-[24px] bg-navy-900 text-brand-100 shadow-lg"><FileArchive className="w-12 h-12" strokeWidth={1.4} /></div>
              <p className="mt-7 text-lg font-bold text-navy-900">Todo empieza con tus archivos</p>
              <div className="mt-5 rounded-xl border-2 border-dashed border-brand-100 py-5 text-xs text-slate-500"><Upload className="mx-auto mb-2 h-5 w-5 text-brand-600" />Tu proyecto .zip o una plantilla lista</div>
              <p className="mt-4 text-[11px] text-slate-400">HTML · CSS · JavaScript</p>
            </div>}
            {active === 1 && <div className="py-5">
              <ShieldCheck className="h-12 w-12 text-brand-600" strokeWidth={1.4} />
              <p className="mt-5 text-lg font-bold text-navy-900">Tu espacio, preparado para ti</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">La parte técnica queda en nuestras manos.</p>
              <div className="mt-6 space-y-4">{['Archivos revisados', 'Espacio exclusivo asignado', 'Sitio listo para publicar'].map(label => <div key={label} className="flex items-center gap-3 text-xs text-navy-800"><span className="rounded-full bg-brand-50 p-1 text-brand-600"><Check className="h-3 w-3" /></span>{label}</div>)}</div>
              <div aria-hidden="true" className="mt-7 h-2 rounded-full progress-brand-stripes" />
            </div>}
            {active === 2 && <div className="py-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4"><span className="h-2 w-2 rounded-full bg-brand-500" /><span className="text-xs font-semibold text-brand-700">Tu sitio, en línea</span><Globe className="ml-auto h-4 w-4 text-slate-400" /></div>
              <div className="mt-5 rounded-xl bg-brand-50 p-5"><div className="h-3 w-20 rounded bg-brand-100" /><div className="mt-4 h-6 w-3/4 rounded bg-navy-900" /><div className="mt-2 h-2 w-full rounded bg-brand-100" /><div className="mt-2 h-2 w-4/5 rounded bg-brand-100" /><div className="mt-5 h-7 w-24 rounded bg-brand-500" /></div>
              <p className="mt-5 text-lg font-bold text-navy-900">Listo para compartir</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">Un enlace propio para mostrar tu proyecto al mundo.</p>
            </div>}
          </div>
          <div aria-hidden="true" className="mt-6 flex items-center gap-3 text-xs text-brand-700"><span>Tu idea</span><span className="h-px flex-1 bg-brand-100" /><ArrowRight className="h-4 w-4" /><span>Tu web</span></div>
          <p className="mt-3 text-[10px] text-brand-700/70">Así funciona la publicación · Vista ilustrativa</p>
        </div>
      </div>
    </section>
  );
}
