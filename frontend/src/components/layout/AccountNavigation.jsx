import React from 'react';
import { Globe, Sparkles, FileText, ShieldCheck, UserRound } from 'lucide-react';

export default function AccountNavigation({ currentView = 'dashboard', onNavigate, role }) {
  const items = [{ id: 'dashboard', label: 'Mis sitios', icon: Globe }, { id: 'pricing', label: 'Planes y suscripción', icon: Sparkles }, { id: 'billing', label: 'Facturación y recibos', icon: FileText }, { id: 'profile', label: 'Perfil y ajustes', icon: UserRound }];
  if (role === 'admin') items.push({ id: 'admin', label: 'Consola de administración', icon: ShieldCheck });
  return <nav aria-label="Cuenta" className="space-y-1">
    <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Mi cuenta</p>
    {items.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onNavigate?.(id)} aria-current={currentView === id ? 'page' : undefined} className={`flex min-h-10 w-full items-center gap-3 rounded-[10px] border px-3 py-2 text-left text-xs font-semibold transition btn-tactile focus-visible:ring-2 focus-visible:ring-brand-500 ${currentView === id ? 'border-brand-100 bg-brand-50 text-brand-700' : 'border-transparent text-slate-500 hover:bg-white hover:text-navy-900'}`}><Icon className="h-4 w-4 shrink-0" />{label}</button>)}
  </nav>;
}
