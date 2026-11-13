import React from 'react';
import { Server } from 'lucide-react';
export default function AccountQuota({ user }) {
  if (!user?.plan) return null;
  const plan = user.plan;
  const used = plan.active_instances ?? 0;
  const max = plan.max_instances ?? 0;
  const full = max > 0 && used >= max;
  return <section aria-label="Cuota del plan" className="rounded-xl border border-[#dfe7e4] bg-white p-3.5">
    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400"><Server className="h-4 w-4 text-brand-600" />Cuota {plan.name || 'Free'}</p>
    <p className="mt-2 text-xs text-navy-900"><strong>{used} / {max}</strong> sitios <span className={full ? 'text-amber-700' : 'text-brand-700'}> · {full ? 'Límite alcanzado' : `${plan.available_slots ?? Math.max(0, max - used)} disponibles`}</span></p>
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-50"><div className={`h-full rounded-full ${full ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${max ? Math.min(100, used / max * 100) : 0}%` }} /></div>
  </section>;
}
