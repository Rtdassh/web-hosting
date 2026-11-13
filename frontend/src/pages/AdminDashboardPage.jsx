import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, LogOut } from 'lucide-react';
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
  const control = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600';
  const destroying = selection?.action === 'force_destroy';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-3"><ShieldCheck className="text-emerald-700" aria-hidden="true" /><div><h1 className="text-xl font-bold">Administración Codrop</h1><p className="text-sm text-slate-500">Supervisión de la plataforma</p></div></div>
          <div className="flex gap-2">
            <button className={control} disabled={loading || busy} onClick={refresh}><RefreshCw size={16} className={`mr-2 inline ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />Actualizar</button>
            <button className={control} disabled={busy} onClick={onLogout}><LogOut size={16} className="mr-2 inline" aria-hidden="true" />Cerrar sesión</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-5 px-5 py-6" aria-busy={loading}>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
        {loading && <p role="status" className="text-sm text-slate-500">Actualizando plataforma…</p>}
        {data && <section aria-label="Estado del servidor" className="grid gap-3 sm:grid-cols-3">
          {[
            ['Sitios activos', `${data.summary.active_instances} / ${data.summary.total_instances}`],
            ['CPU del servidor', `${data.host_resources.cpu_usage_percent.toFixed(1)}%`],
            ['RAM del servidor', `${data.host_resources.memory_usage_percent.toFixed(1)}%`],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white px-5 py-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}
          {data.host_resources.docker_available === false && <p role="alert" className="text-sm text-amber-800 sm:col-span-3">Docker no está disponible. Los estados pueden estar desactualizados.</p>}
        </section>}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Supervisión de sitios">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4">
            <h2 className="font-bold">Sitios de la plataforma <span className="ml-2 text-sm font-normal text-slate-500">{filtered.length} de {instances.length}</span></h2>
            <div className="flex flex-wrap gap-2">
              <input aria-label="Buscar sitios" placeholder="Proyecto, ID o propietario" value={search} onChange={(e) => setSearch(e.target.value)} className={control} />
              <select aria-label="Filtrar por estado" value={status} onChange={(e) => setStatus(e.target.value)} className={control}><option value="">Todos los estados</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr>{['Proyecto', 'Propietario', 'Estado', 'Acciones'].map((label) => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{filtered.map((site) => <tr key={site.id}>
              <td className="px-4 py-4"><p className="font-semibold">{site.name}</p><p className="text-xs text-slate-500">ID {site.id}</p></td>
              <td className="px-4 py-4 text-slate-600">Cliente #{site.owner_id}</td>
              <td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${site.status === 'running' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{labels[site.status] || site.status}</span></td>
              <td className="px-4 py-4"><div className="flex gap-2"><button className={control} aria-label={`Detener ${site.name}`} disabled={loading || busy || site.status !== 'running'} onClick={() => choose(site, 'force_stop')}>Detener</button><button className={`${control} text-red-700`} aria-label={`Eliminar ${site.name}`} disabled={loading || busy} onClick={() => choose(site, 'force_destroy')}>Eliminar</button></div></td>
            </tr>)}</tbody>
          </table></div>
          {!loading && !error && filtered.length === 0 && <p className="p-8 text-center text-sm text-slate-500">{instances.length ? 'No hay sitios que coincidan con los filtros.' : 'No hay sitios registrados.'}</p>}
        </section>
      </main>
      {selection && <ModalLayer onClose={() => { if (!busy) setSelection(null); }}>
        <form onSubmit={execute} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
          <h2 className="text-lg font-bold">{destroying ? 'Eliminar sitio' : 'Detener sitio'}</h2>
          <p className="text-sm text-slate-600">Proyecto: <strong>{selection.instance.name}</strong> (ID {selection.instance.id}). {destroying ? 'Se eliminarán el contenedor, los archivos y las versiones. Esta acción es irreversible.' : 'El sitio dejará de estar disponible.'}</p>
          <label className="block text-sm font-semibold">Motivo obligatorio<textarea required minLength={3} maxLength={500} value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)} className={`${control} mt-2 block w-full`} /></label>
          {destroying && <label className="block text-sm font-semibold">Escribe el nombre del proyecto para confirmar<input required value={confirmation} disabled={busy} onChange={(e) => setConfirmation(e.target.value)} className={`${control} mt-2 block w-full`} autoComplete="off" /></label>}
          {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
          <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={control} onClick={() => setSelection(null)}>Cancelar</button><button type="submit" className={`${control} ${destroying ? 'text-red-700' : 'text-emerald-800'}`} disabled={busy || reason.trim().length < 3 || (destroying && confirmation !== selection.instance.name)}>{busy ? 'Procesando…' : destroying ? 'Confirmar eliminación' : 'Confirmar detención'}</button></div>
        </form>
      </ModalLayer>}
    </div>
  );
}
