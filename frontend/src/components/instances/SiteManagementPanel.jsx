import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Download, File, Folder, HardDrive, History, Pencil, RefreshCw, Save, Settings2 } from 'lucide-react';
import { instanceService } from '../../services/api';
import { getApiErrorMessage } from '../../services/apiErrors';
import LoadingButton from '../ui/LoadingButton';
import { toast } from '../ui/Toast';

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const TABS = [{ id: 'settings', label: 'Configuración', icon: Settings2 }, { id: 'files', label: 'Archivos', icon: Folder }, { id: 'activity', label: 'Actividad', icon: History }];

export default function SiteManagementPanel({ instance, onChanged, section }) {
  const title = section ? TABS.find((item) => item.id === section)?.label : 'Administración del sitio';
  const [tab, setTab] = useState(section || 'settings');
  const [name, setName] = useState(instance.name);
  const [files, setFiles] = useState(null);
  const [activity, setActivity] = useState([]);
  const [path, setPath] = useState('');
  const [offset, setOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  useEffect(() => setName(instance.name), [instance.name]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    Promise.resolve().then(() => tab === 'activity' ? instanceService.getActivity(instance.id) : instanceService.getFiles(instance.id, path, offset)).then((result) => {
      if (cancelled) return;
      if (tab === 'activity') setActivity(result); else setFiles(result);
    }).catch((failure) => {
      if (!cancelled) setError(getApiErrorMessage(failure, 'No se pudo cargar esta sección.'));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [instance.id, instance.container_id, instance.status, tab, path, offset, reload]);

  const perform = async (kind, operation) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(kind); setError('');
    try { await operation(); }
    catch (failure) {
      const message = getApiErrorMessage(failure, 'No se pudo completar la operación. Inténtalo nuevamente.');
      setError(message); toast.error(message);
    } finally { inFlight.current = false; setBusy(''); }
  };
  const rename = (event) => {
    event.preventDefault();
    if (!name.trim() || name.trim().length > 100) { setError('El nombre debe tener entre 1 y 100 caracteres.'); return; }
    perform('rename', async () => {
      const updated = await instanceService.rename(instance.id, name.trim());
      setName(updated.name); toast.success('Nombre del proyecto actualizado.'); onChanged?.();
    });
  };
  const backup = () => perform('backup', async () => {
    saveBlob(await instanceService.downloadBackup(instance.id), `sitio-${instance.id}.zip`);
    toast.success('Respaldo listo. La descarga se ha iniciado.');
  });
  const download = (entry) => perform(entry.path, async () => {
    saveBlob(await instanceService.downloadFile(instance.id, entry.path), entry.name);
    toast.success('La descarga del archivo se ha iniciado.');
  });
  const openFolder = (next) => { setPath(next); setOffset(0); };
  const parent = path.split('/').slice(0, -1).join('/');

  return <section className="site-detail-panel overflow-hidden" aria-label="Administración del sitio">
    <div className="site-detail-flat-heading flex items-center justify-between gap-3 px-6 pb-4 pt-6 sm:px-7 sm:pt-7">
      <div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-brand-500 bg-brand-500 text-white"><Settings2 className="h-4 w-4" /></div><div><h2 className="text-sm font-bold tracking-tight text-navy-900">{title}</h2><p className="mt-0.5 text-[11px] leading-5 text-[#64748b]">Personaliza tu proyecto, consulta sus archivos y conserva una copia.</p></div></div>
      <LoadingButton variant="ghost" size="sm" icon={RefreshCw} disabled={loading || Boolean(busy)} onClick={() => setReload((value) => value + 1)} aria-label="Actualizar administración del sitio" className="shrink-0 !px-2" />
    </div>
    {!section && <div className="mx-6 flex gap-1 overflow-x-auto rounded-xl border border-[#dce7e2] bg-[#f2f6f4] p-1 sm:mx-7" role="group" aria-label="Secciones del sitio">
      {TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)} disabled={Boolean(busy)} className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-[11px] font-bold transition duration-150 btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 ${tab === id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-navy-900'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
    </div>}
    <div className="space-y-5 p-6 sm:p-7">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}
      {tab === 'settings' && <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={rename} className="space-y-3">
          <label htmlFor={`site-name-${instance.id}`} className="flex items-center gap-2 text-xs font-bold text-[#334e5e]"><Pencil className="h-3.5 w-3.5 text-slate-400" />Nombre del proyecto</label>
          <input id={`site-name-${instance.id}`} value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required disabled={Boolean(busy)} className="h-11 w-full rounded-xl border border-[#d6dfdb] bg-white px-3.5 text-sm font-semibold text-navy-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-50" />
          <p className="text-[11px] leading-5 text-[#64748b]">Identifica tu proyecto en Codrop. Se conservan su dirección pública y sus archivos.</p>
          <LoadingButton type="submit" icon={Save} loading={busy === 'rename'} loadingText="Guardando…" disabled={Boolean(busy) || !name.trim() || name.trim() === instance.name}>Guardar nombre</LoadingButton>
        </form>
        <div className="rounded-[14px] border border-[#e1ebe6] bg-[#f8fbfa] p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold text-navy-900"><HardDrive className="h-4 w-4 text-brand-600" />Archivos y respaldo</h3>
          <div className="my-4 flex flex-wrap gap-6"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Publicado</p><p className="mt-1 font-mono text-lg font-bold text-navy-900">{files ? formatBytes(files.size_bytes) : '—'}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Archivos</p><p className="mt-1 font-mono text-lg font-bold text-navy-900">{files?.total_files ?? '—'}</p></div></div>
          <LoadingButton variant="secondary" icon={Download} loading={busy === 'backup'} loadingText="Preparando ZIP…" disabled={Boolean(busy)} onClick={backup}>Descargar respaldo ZIP</LoadingButton>
          <p className="mt-3 text-[10px] leading-5 text-slate-500">Incluye los archivos de la publicación activa. Guarda la copia en tu equipo para conservarla fuera del servidor.</p>
        </div>
      </div>}

      {tab === 'files' && <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2 text-xs"><Folder className="h-4 w-4 shrink-0 text-brand-600" /><button onClick={() => openFolder('')} className="font-bold text-brand-700">Raíz</button>{path && <><ChevronRight className="h-3 w-3 shrink-0 text-slate-400" /><span className="break-all font-mono text-[11px] text-slate-600">{path}</span></>}</div>{path && <LoadingButton variant="ghost" size="sm" icon={ArrowLeft} onClick={() => openFolder(parent)} disabled={loading}>Carpeta anterior</LoadingButton>}</div>
        <p className="text-[11px] leading-5 text-[#64748b]">Explora y descarga tus archivos publicados. Para cambiar el contenido, publica una nueva versión desde la sección de publicaciones.</p>
        {loading ? <p role="status" className="rounded-xl bg-slate-50 p-5 text-xs text-slate-500">Cargando archivos…</p> : !error && <>
          <ul className="divide-y divide-[#edf1ef] overflow-hidden rounded-[14px] border border-[#e1ebe6]">{files?.entries.map((entry) => <li key={entry.path} className="flex items-center justify-between gap-3 bg-[#fbfdfc] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-brand-600">{entry.kind === 'directory' ? <Folder className="h-4 w-4" /> : <File className="h-4 w-4 text-slate-400" />}</div><div className="min-w-0">{entry.kind === 'directory' ? <button disabled={Boolean(busy)} onClick={() => openFolder(entry.path)} className="break-all text-left text-xs font-bold text-brand-700 hover:underline">{entry.name}</button> : <p className="break-all text-xs font-semibold text-navy-900">{entry.name}</p>}<p className="mt-0.5 text-[10px] text-slate-400">{entry.kind === 'directory' ? 'Carpeta' : formatBytes(entry.size_bytes)}</p></div></div>
            {entry.kind === 'file' && <LoadingButton variant="ghost" size="sm" icon={Download} loading={busy === entry.path} disabled={Boolean(busy)} onClick={() => download(entry)} aria-label={`Descargar ${entry.name}`} className="shrink-0 !px-2" />}
          </li>)}{files?.entries.length === 0 && <li className="p-6 text-center text-xs text-slate-500">Esta carpeta está vacía.</li>}</ul>
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] text-slate-500">{files?.total_entries || 0} elementos en esta carpeta · {formatBytes(files?.size_bytes)} publicados en el sitio</p><div className="flex gap-2"><LoadingButton variant="secondary" size="sm" disabled={offset === 0 || Boolean(busy)} onClick={() => setOffset(Math.max(0, offset - 50))}>Anterior</LoadingButton><LoadingButton variant="secondary" size="sm" disabled={!files || offset + files.limit >= files.total_entries || Boolean(busy)} onClick={() => setOffset(offset + 50)}>Siguiente</LoadingButton></div></div>
        </>}
      </div>}

      {tab === 'activity' && <div className="space-y-4">
        <p className="text-[11px] leading-5 text-[#64748b]">Últimos 50 eventos registrados del proyecto. Las nuevas acciones aparecerán aquí al actualizar.</p>
        {loading ? <p role="status" className="text-xs text-slate-500">Cargando actividad…</p> : !error && (activity.length ? <ul className="divide-y divide-[#edf1ef] overflow-hidden rounded-[14px] border border-[#e1ebe6]">{activity.map((event) => <li key={event.id} className="flex items-start gap-3 bg-[#fbfdfc] p-4"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-500 bg-brand-500 text-white"><History className="h-3.5 w-3.5" /></div><div><p className="text-xs font-semibold text-navy-900">{event.reason || 'Estado del proyecto actualizado'}</p><p className="mt-1 text-[10px] leading-5 text-slate-500">{new Date(event.changed_at).toLocaleString('es-GT')} · {event.new_status}</p></div></li>)}</ul> : <div className="rounded-[14px] border border-[#e1ebe6] bg-[#f8fbfa] p-6 text-center"><CheckCircle2 className="mx-auto mb-3 h-6 w-6 text-brand-600" /><p className="text-xs font-semibold text-navy-900">Aún no hay eventos registrados.</p><p className="mt-2 text-[11px] text-slate-500">Los próximos cambios del proyecto aparecerán en este historial.</p></div>)}
      </div>}
    </div>
  </section>;
}
