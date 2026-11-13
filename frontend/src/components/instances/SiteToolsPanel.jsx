import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertCircle, ArrowUpRight, CheckCircle2, Clock3, FileArchive, History, RotateCcw, ShieldCheck, UploadCloud, X } from 'lucide-react';
import LoadingButton from '../ui/LoadingButton';
import { instanceService } from '../../services/api';
import { toast } from '../ui/Toast';

const errorMessage = (error) => typeof error.response?.data?.detail === 'string'
  ? error.response.data.detail : 'No se pudo confirmar la operación. Actualiza el estado antes de reintentar.';

export default function SiteToolsPanel({ instance, onChanged, insightsOnly = false }) {
  const [versions, setVersions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null);
  const [restore, setRestore] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const submitting = useRef(false);
  const fileInput = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [releases, report] = await Promise.all([
          insightsOnly ? Promise.resolve([]) : instanceService.getVersions(instance.id), instanceService.getInsights(instance.id),
        ]);
        if (!cancelled) { setVersions(releases); setInsights(report); setError(''); setLoaded(true); }
      } catch {
        if (!cancelled) { setError(insightsOnly ? 'No se pudieron actualizar las estadísticas del sitio.' : 'No se pudieron actualizar las versiones y estadísticas.'); setInsights(null); }
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [instance.id, instance.container_id, instance.status, insightsOnly]);

  const change = async (version) => {
    if (submitting.current) return;
    if (!version && (!file || !file.name.toLowerCase().endsWith('.zip') || file.size > 25 * 1024 * 1024)) {
      setError('Selecciona un ZIP de hasta 25 MB con los archivos compilados.'); return;
    }
    submitting.current = true;
    setBusy(true); setError('');
    toast.info('Tu sitio se está publicando. Conservaremos su URL.', { title: version ? 'Restaurando versión' : 'Actualizando sitio' });
    try {
      const result = version ? await instanceService.restoreVersion(instance.id, version) : await instanceService.publishVersion(instance.id, file);
      setVersions(result); setFile(null); setRestore(null);
      if (fileInput.current) fileInput.current.value = '';
      toast.success('Publicación completada. La URL del sitio se mantiene.');
      onChanged?.();
    } catch (failure) {
      setError(errorMessage(failure)); toast.error(errorMessage(failure));
      onChanged?.();
    } finally { submitting.current = false; setBusy(false); }
  };
  const monitor = insights?.monitor;
  const latest = monitor?.latest;
  const traffic = insights?.traffic;
  const status = !latest || monitor.stale ? 'Sin medición reciente' : { up: 'Disponible', down: 'No responde correctamente', stopped: 'Detenido' }[latest.status];
  const healthy = latest?.status === 'up' && !monitor?.stale;
  const down = latest?.status === 'down' && !monitor?.stale;
  const statusStyle = healthy ? 'border-brand-100 bg-brand-50 text-brand-700' : down ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-100 text-slate-500';
  const resetFile = () => {
    setFile(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <section className="space-y-6" aria-label={insightsOnly ? 'Disponibilidad y tráfico' : 'Publicaciones y disponibilidad'}>
      {!insightsOnly && <>
      <div className="rounded-[20px] border border-[#dfe7e4] bg-white p-6 shadow-[0_8px_28px_rgba(23,40,56,0.035)] sm:p-7">
        <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-brand-100 bg-brand-50 text-brand-600"><UploadCloud className="h-4 w-4" /></div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-navy-900">Publicaciones y disponibilidad</h2>
            <p className="mt-0.5 text-[11px] leading-5 text-[#64748b]">Actualiza tu sitio y conserva su dirección. Recupera una versión anterior cuando lo necesites.</p>
          </div>
        </div>

        {error && <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium leading-5 text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-7">
          <form onSubmit={(event) => { event.preventDefault(); change(); }} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-bold text-[#334e5e]" htmlFor={`update-zip-${instance.id}`}>Nueva versión del sitio (.zip, hasta 25 MB)</label>
            </div>
            <div className={`relative rounded-[14px] border-2 border-dashed p-5 text-center transition duration-150 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15 ${file ? 'border-brand-100 bg-brand-50/50' : 'border-[#d6e5dd] bg-[#f8fbfa] hover:border-brand-500 hover:bg-brand-50/50'} ${busy ? 'opacity-60' : ''}`}>
              <input ref={fileInput} id={`update-zip-${instance.id}`} type="file" accept=".zip" disabled={busy} onChange={(event) => setFile(event.target.files?.[0] || null)} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
              <div aria-hidden="true" className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-brand-100 bg-white text-brand-600 shadow-sm">{file ? <FileArchive className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}</div>
              <p className="break-all text-xs font-bold text-navy-900">{file ? file.name : 'Selecciona tu paquete .zip'}</p>
              <p className="mt-1.5 text-[11px] text-[#64748b]">{file ? `${(file.size / 1048576).toFixed(2)} MB · Haz clic para cambiar el archivo` : 'Explora tus archivos para publicar una nueva versión'}</p>
            </div>
            <p className="text-[11px] leading-5 text-[#64748b]">Sube el contenido de <span className="font-mono font-semibold text-navy-900">dist/</span> o <span className="font-mono font-semibold text-navy-900">build/</span> con index.html. Excluye archivos privados y .env.</p>
            <div className="flex flex-wrap items-center gap-2">
              <LoadingButton type="submit" icon={ArrowUpRight} loading={busy} loadingText="Publicando…" disabled={!file}>Publicar actualización</LoadingButton>
              {file && <LoadingButton variant="ghost" size="sm" icon={X} disabled={busy} onClick={resetFile}>Quitar archivo</LoadingButton>}
            </div>
            <div className="flex items-start gap-2 text-[10px] leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /><p>Conservamos la versión anterior. El sitio puede interrumpirse unos segundos durante la publicación.</p></div>
            {busy && <p role="status" className="rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">Validando y preparando la publicación. Mantén esta pestaña abierta.</p>}
          </form>

          <div className="border-t border-slate-100 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-xs font-bold text-navy-900"><History className="h-4 w-4 text-slate-400" />Versiones guardadas</h3>
              {versions.length > 0 && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">{versions.length}</span>}
            </div>
            {!versions.length ? <div className="flex min-h-[170px] flex-col items-center justify-center rounded-[14px] border border-[#e1ebe6] bg-[#f8fbfa] p-5 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe7e4] bg-white text-slate-400"><History className="h-5 w-5" /></div>
              <p className="text-xs font-semibold text-[#334e5e]">{loaded ? 'Aún no hay actualizaciones guardadas.' : 'Cargando versiones…'}</p>
              <p className="mt-1.5 max-w-[260px] text-[11px] leading-5 text-[#64748b]">Al publicar por primera vez también guardaremos la versión original.</p>
            </div> : <ul className="divide-y divide-[#edf1ef] overflow-hidden rounded-[14px] border border-[#e1ebe6]">{versions.map((version) => <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 bg-[#fbfdfc] px-3.5 py-3">
              <div className="flex items-center gap-2.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400"><FileArchive className="h-3.5 w-3.5" /></div><div><p className="text-[11px] font-semibold text-navy-900">{new Date(version.created_at).toLocaleString('es-GT')}</p><p className="mt-0.5 font-mono text-[10px] text-slate-500">{(version.size_bytes / 1048576).toFixed(2)} MB</p></div></div>
              {version.active ? <span className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-brand-700"><CheckCircle2 className="h-3 w-3" />Actual</span> : <LoadingButton variant="secondary" size="sm" icon={RotateCcw} disabled={busy} onClick={() => setRestore(version.id)}>Restaurar</LoadingButton>}
            </li>)}</ul>}
            {versions.length > 0 && <p className="mt-3 text-[10px] leading-5 text-slate-500">El historial conserva un número limitado de versiones, incluida la publicación activa.</p>}
            {restore && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5" role="group" aria-label="Confirmar restauración">
              <p className="text-xs font-semibold leading-5 text-amber-900">¿Publicar esta versión anterior en la misma URL?</p>
              <div className="mt-3 flex flex-wrap gap-2"><LoadingButton variant="amber" size="sm" disabled={busy} onClick={() => change(restore)}>Confirmar restauración</LoadingButton><LoadingButton variant="ghost" size="sm" disabled={busy} onClick={() => setRestore(null)}>Cancelar</LoadingButton></div>
            </div>}
          </div>
        </div>
      </div>

      </>}

      <div className="rounded-[20px] border border-[#dfe7e4] bg-white p-6 shadow-[0_8px_28px_rgba(23,40,56,0.035)] sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-brand-100 bg-brand-50 text-brand-600"><Activity className="h-4 w-4" /></div><div><h2 className="text-sm font-bold tracking-tight text-navy-900">Disponibilidad y tráfico</h2><p className="mt-0.5 text-[11px] leading-5 text-[#64748b]">Estado de tu sitio y actividad reciente</p></div></div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500"><Clock3 className="h-3 w-3" />Comprobación automática</span>
        </div>
        {insightsOnly && error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">{error}</p>}
        <div className="grid gap-4 md:grid-cols-3">
          <InsightCard icon={Activity} label="Disponibilidad HTTP">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${statusStyle}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${healthy ? 'bg-brand-500' : down ? 'bg-red-500' : 'bg-slate-400'}`} />{status}</span>
            {latest?.latency_ms != null && <p className="mt-3 font-mono text-sm font-bold text-navy-900">{latest.latency_ms} ms <span className="text-[10px] font-medium text-slate-400">· HTTP {latest.http_status || 'sin respuesta'}</span></p>}
            <p className="mt-2 text-[10px] leading-5 text-[#64748b]">{latest ? `Última comprobación: ${new Date(latest.checked_at).toLocaleString('es-GT')}` : 'Esperando la primera comprobación del sitio.'}</p>
          </InsightCard>
          <InsightCard icon={ShieldCheck} label="Muestras disponibles">
            <p className="text-[24px] font-bold leading-none tracking-tight text-navy-900">{monitor?.availability_percent == null ? '—' : `${monitor.availability_percent}%`}</p>
            <p className="mt-2 text-[11px] font-semibold text-[#334e5e]">{monitor?.samples || 0} muestras registradas</p>
            <p className="mt-2 text-[10px] leading-5 text-[#64748b]">Disponibilidad observada desde el servidor. Excluye las paradas intencionales.</p>
          </InsightCard>
          <InsightCard icon={ArrowUpRight} label="Tráfico observado">
            <p className="text-[24px] font-bold leading-none tracking-tight text-navy-900">{traffic?.available ? traffic.requests : '—'}</p>
            <p className="mt-2 text-[11px] font-semibold text-[#334e5e]">Solicitudes recientes</p>
            {traffic?.available && <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-600"><span className="rounded-md border border-[#e1ebe6] bg-white px-2 py-1">{(traffic.response_body_bytes / 1048576).toFixed(2)} MB</span><span className="rounded-md border border-[#e1ebe6] bg-white px-2 py-1">{traffic.errors} errores HTTP</span></div>}
            <p className="mt-2 text-[10px] leading-5 text-[#64748b]">{traffic?.scope || 'Estadísticas de los logs recientes de Nginx.'}</p>
          </InsightCard>
        </div>
      </div>
    </section>
  );
}

function InsightCard({ icon: Icon, label, children }) {
  return <article className="min-w-0 rounded-[14px] border border-[#e1ebe6] bg-[#f8fbfa] p-4">
    <h3 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500"><Icon className="h-3.5 w-3.5 shrink-0 text-brand-600" />{label}</h3>
    {children}
  </article>;
}
