import React from 'react';
import { Globe, ShieldCheck, Layers3, ArrowUpRight, Check } from 'lucide-react';

/** An illustrative composition; values are not presented as live account metrics. */
export default function HostingOverview() {
  return (
    <div className="relative rounded-[28px] bg-navy-900 p-6 sm:p-8 text-white shadow-[0_20px_50px_rgba(23,40,56,0.14)]">
      <div aria-hidden="true" className="absolute top-0 inset-x-0 accent-stripes rounded-t-[28px]" />
      <div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[0.18em] text-brand-100">Menos vueltas. Más control.</span><span className="rounded-full border border-white/15 px-2 py-1 text-[9px] text-white/50">Vista ilustrativa</span></div>
      <div className="mt-7 flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-500"><Globe className="h-6 w-6" /></span><div><p className="text-lg font-bold">Mi próximo gran proyecto</p><p className="mt-1 text-xs text-slate-400">Todo lo que importa, en un lugar.</p></div></div>
      <div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="h-5 w-5 text-brand-500" /><p className="mt-3 text-xs font-semibold">Archivos protegidos</p><p className="mt-1 text-[11px] text-slate-400">Tu contenido, a salvo</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Layers3 className="h-5 w-5 text-brand-500" /><p className="mt-3 text-xs font-semibold">Espacio exclusivo</p><p className="mt-1 text-[11px] text-slate-400">Recursos para tu sitio</p></div></div>
      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5"><span className="rounded-full bg-brand-500/15 p-1 text-brand-500"><Check className="h-3 w-3" /></span><span className="text-xs text-slate-300">De publicar a compartir, sin salir del panel</span><ArrowUpRight className="ml-auto h-4 w-4 text-brand-500" /></div>
    </div>
  );
}
