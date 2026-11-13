import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, Activity, Cpu, MemoryStick } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import ModalLayer from '../components/ui/ModalLayer';
import { adminService } from '../services/api';
import { getApiErrorMessage } from '../services/apiErrors';

export default function AdminDashboardPage({ onLogout }) {
  const [data, setData] = useState(null);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selection, setSelection] = useState(null);
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [summary, sites] = await Promise.all([adminService.getDashboard(), adminService.getInstances()]);
      setData(summary);
      setInstances(sites);
    } catch (e) {
      setData(null);
      setInstances([]);
      setError(getApiErrorMessage(e, 'No se pudo cargar la consola. Intenta actualizar.'));
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  function choose(instance, action) {
    setSelection({ instance, action });
    setReason('');
    setConfirmation('');
    setActionError('');
    setNotice('');
  }

  async function execute(event) {
    event.preventDefault();
    if (busy || reason.trim().length < 3 || (selection.action === 'force_destroy' && confirmation !== selection.instance.name)) return;
    setBusy(true);
    setActionError('');
    try {
      await adminService.forceAction(selection.instance.id, selection.action, reason.trim());
      setNotice(selection.action === 'force_stop' ? 'Sitio detenido. Acción registrada en auditoría.' : 'Sitio eliminado. Acción registrada en auditoría.');
      setSelection(null);
      await refresh();
    } catch (e) { setActionError(getApiErrorMessage(e)); }
    finally { setBusy(false); }
  }

  const filtered = instances.filter((site) => (!status || site.status === status) && `${site.name} ${site.id} ${site.owner_id}`.toLowerCase().includes(search.trim().toLowerCase()));
  const labels = { running: 'En ejecución', stopped: 'Detenido', pending: 'Pendiente', failed: 'Error' };
  const control = 'input-brand brand-focus';
  const destroying = selection?.action === 'force_destroy';

  return (
    <div className="min-h-screen bg-[#f5f9f7] text-navy-900 flex flex-col">
      <Navbar onLogout={onLogout} />
      <main className="mx-auto w-full max-w-[1380px] flex-1 space-y-6 px-6 py-8 lg:px-12" aria-busy={loading}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-brand-700"><ShieldCheck size={14} aria-hidden="true" />Rol administrador</p>
            <h1 className="text-2xl font-bold tracking-tight">Administración Codrop</h1>
            <p className="mt-1 text-sm text-slate-500">Supervisión y acciones de emergencia sobre la plataforma.</p>
          </div>
          <Button variant="secondary" icon={RefreshCw} loading={loading} loadingText="Actualizando…" disabled={busy} onClick={refresh}>Actualizar</Button>
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
        {loading && <p role="status" className="text-sm text-slate-500">Actualizando plataforma…</p>}
        {data && <section aria-label="Estado del servidor" className="grid gap-3 sm:grid-cols-3">
          {[
            ['Sitios activos', `${data.summary.active_instances} / ${data.summary.total_instances}`, Activity],
            ['CPU del servidor', `${data.host_resources.cpu_usage_percent.toFixed(1)}%`, Cpu],
            ['RAM del servidor', `${data.host_resources.memory_usage_percent.toFixed(1)}%`, MemoryStick],
          ].map(([label, value, Icon]) => <Card key={label} className="overflow-hidden"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><span className="rounded-xl border border-brand-100 bg-brand-50 p-2.5 text-brand-600"><Icon size={20} aria-hidden="true" /></span></div><p className="mt-2 text-[30px] font-bold tracking-tight">{value}</p></Card>)}
          {data.host_resources.docker_available === false && <p role="alert" className="text-sm text-amber-800 sm:col-span-3">Docker no está disponible. Los estados pueden estar desactualizados.</p>}
        </section>}
        <Card className="overflow-hidden [&>div]:p-0" role="region" aria-label="Supervisión de sitios">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 border-l-[3px] border-l-brand-500 px-6 py-5">
            <h2 className="font-bold">Sitios de la plataforma <span className="ml-2 text-sm font-normal text-slate-500">{filtered.length} de {instances.length}</span></h2>
            <div className="flex flex-wrap gap-2">
              <Input aria-label="Buscar sitios" placeholder="Proyecto, ID o propietario" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select aria-label="Filtrar por estado" value={status} onChange={(e) => setStatus(e.target.value)} className={control}><option value="">Todos los estados</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr>{['Proyecto', 'Propietario', 'Estado', 'Acciones'].map((label) => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{filtered.map((site) => <tr key={site.id}>
              <td className="px-4 py-4"><p className="font-semibold">{site.name}</p><p className="text-xs text-slate-500">ID {site.id}</p></td>
              <td className="px-4 py-4 text-slate-600">Cliente #{site.owner_id}</td>
              <td className="px-4 py-4"><Badge status={site.status} /></td>
              <td className="px-4 py-4"><div className="flex gap-2"><Button variant="secondary" size="sm" aria-label={`Detener ${site.name}`} disabled={loading || busy || site.status !== 'running'} onClick={() => choose(site, 'force_stop')}>Detener</Button><Button variant="ghost" size="sm" className="text-red-700 hover:text-red-800 hover:bg-red-50" aria-label={`Eliminar ${site.name}`} disabled={loading || busy} onClick={() => choose(site, 'force_destroy')}>Eliminar</Button></div></td>
            </tr>)}</tbody>
          </table></div>
          {!loading && !error && filtered.length === 0 && <p className="p-8 text-center text-sm text-slate-500">{instances.length ? 'No hay sitios que coincidan con los filtros.' : 'No hay sitios registrados.'}</p>}
        </Card>
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">Codrop • De tu código a la web, sin complicaciones.</footer>
      {selection && <ModalLayer onClose={() => { if (!busy) setSelection(null); }}>
        <form onSubmit={execute} className="w-full max-w-md space-y-4 rounded-[22px] border border-brand-100 bg-white p-7 shadow-xl">
          <h2 className="text-lg font-bold">{destroying ? 'Eliminar sitio' : 'Detener sitio'}</h2>
          <p className="text-sm text-slate-600">Proyecto: <strong>{selection.instance.name}</strong> (ID {selection.instance.id}). {destroying ? 'Se eliminarán el contenedor, los archivos y las versiones. Esta acción es irreversible.' : 'El sitio dejará de estar disponible.'}</p>
          <label className="block text-sm font-semibold">Motivo obligatorio<textarea required minLength={3} maxLength={500} value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)} className={`${control} mt-2 block w-full`} /></label>
          {destroying && <label className="block text-sm font-semibold">Escribe el nombre del proyecto para confirmar<Input required value={confirmation} disabled={busy} onChange={(e) => setConfirmation(e.target.value)} className={`${control} mt-2 block w-full`} autoComplete="off" /></label>}
          {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
          <div className="flex justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={() => setSelection(null)}>Cancelar</Button><Button type="submit" variant={destroying ? 'danger' : 'primary'} loading={busy} loadingText="Procesando…" disabled={ reason.trim().length < 3 || (destroying && confirmation !== selection.instance.name)}>{destroying ? 'Confirmar eliminación' : 'Confirmar detención'}</Button></div>
        </form>
      </ModalLayer>}
    </div>
  );
}
