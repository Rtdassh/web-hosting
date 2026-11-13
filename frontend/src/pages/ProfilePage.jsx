import React, { useState } from 'react';
import { UserRound, ShieldCheck, Mail, LogOut, Settings2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { getApiErrorMessage } from '../services/apiErrors';
import LoadingButton from '../components/ui/LoadingButton';
import { toast } from '../components/ui/Toast';

export default function ProfilePage({ onLogout }) {
  const { user, logout } = useAuth();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [compact, setCompact] = useState(() => localStorage.getItem('codrop_compact_projects') === 'true');
  const requestPassword = async () => {
    if (sending) return;
    setSending(true); setError('');
    try { await authService.forgotPassword(user.email); }
    catch (failure) { setError(getApiErrorMessage(failure, 'No se pudo solicitar el cambio de contraseña.')); }
    finally { setSending(false); }
  };
  const changeCompact = (event) => {
    setCompact(event.target.checked);
    localStorage.setItem('codrop_compact_projects', String(event.target.checked));
    toast.success('Preferencia guardada en este navegador.');
  };
  const card = 'rounded-[20px] border border-[#dfe7e4] bg-white p-6 sm:p-7 shadow-[0_8px_28px_rgba(23,40,56,0.035)]';
  return <div className="space-y-6 px-5 py-8 sm:px-6 lg:px-8 xl:px-10">
    <header><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">Mi cuenta</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900">Perfil y ajustes</h1><p className="mt-2 text-xs text-slate-500">Consulta tu cuenta y administra tu seguridad y preferencias.</p></header>
    <section className={card}><h2 className="flex items-center gap-2 text-sm font-bold text-navy-900"><UserRound className="h-4 w-4 text-brand-600" />Tu perfil</h2><dl className="mt-5 grid gap-5 sm:grid-cols-2">{[['Nombre', user?.full_name || 'Sin nombre'], ['Correo electrónico', user?.email], ['Plan', user?.plan?.name || 'Free'], ['Tipo de cuenta', user?.role === 'admin' ? 'Administrador' : 'Cliente']].map(([label, value]) => <div key={label}><dt className="text-[11px] text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-navy-900">{value}</dd></div>)}</dl></section>
    <section className={card}><h2 className="flex items-center gap-2 text-sm font-bold text-navy-900"><ShieldCheck className="h-4 w-4 text-brand-600" />Seguridad</h2><p className="my-4 text-xs leading-6 text-slate-500">Para cambiar tu contraseña, solicita un enlace seguro a tu correo. El enlace abre el formulario de nueva contraseña.</p>{error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}<LoadingButton icon={Mail} variant="secondary" onClick={requestPassword} loading={sending} loadingText="Solicitando…">Cambiar contraseña por correo</LoadingButton></section>
    <section className={card}><h2 className="flex items-center gap-2 text-sm font-bold text-navy-900"><Settings2 className="h-4 w-4 text-brand-600" />Preferencias</h2><label className="mt-5 flex cursor-pointer items-start gap-3 text-xs font-semibold text-navy-900"><input type="checkbox" checked={compact} onChange={changeCompact} className="mt-0.5 h-4 w-4 accent-brand-500" /><span>Lista de proyectos compacta<span className="mt-1 block font-normal leading-5 text-slate-500">Reduce el espacio de las filas. Se guarda solo en este navegador.</span></span></label></section>
    <section className={card}><h2 className="text-sm font-bold text-navy-900">Sesión</h2><p className="my-4 text-xs leading-5 text-slate-500">Cierra tu sesión en este navegador. Tus sitios seguirán funcionando.</p>{confirmLogout ? <div className="flex flex-wrap items-center gap-3"><p className="w-full text-xs text-slate-600">¿Quieres cerrar tu sesión?</p><LoadingButton variant="danger" icon={LogOut} onClick={() => { logout(); onLogout?.(); }}>Confirmar cierre de sesión</LoadingButton><LoadingButton variant="secondary" onClick={() => setConfirmLogout(false)}>Cancelar</LoadingButton></div> : <LoadingButton variant="secondary" icon={LogOut} onClick={() => setConfirmLogout(true)}>Cerrar sesión</LoadingButton>}</section>
  </div>;
}
