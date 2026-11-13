import React, { useEffect, useRef, useState } from 'react';
import { instanceService } from '../../services/api';
import { toast } from '../ui/Toast';

const errorMessage = (error) => typeof error.response?.data?.detail === 'string'
  ? error.response.data.detail : 'No se pudo confirmar la operación. Actualiza el estado antes de reintentar.';

export default function SiteToolsPanel({ instance, onChanged }) {
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
          instanceService.getVersions(instance.id), instanceService.getInsights(instance.id),
        ]);
        if (!cancelled) { setVersions(releases); setInsights(report); setError(''); setLoaded(true); }
      } catch {
        if (!cancelled) { setError('No se pudieron actualizar las versiones y estadísticas.'); setInsights(null); }
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [instance.id, instance.container_id]);

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
  return (
    <section className="space-y-5 rounded-[20px] border border-slate-200 bg-white p-6 text-slate-700" aria-label="Publicaciones y disponibilidad">
      <div><h2 className="text-sm font-bold text-navy-900">Publicaciones y disponibilidad</h2>
        <p className="mt-1 text-xs">Actualiza tu sitio sin cambiar la URL. Cada publicación puede interrumpir el servicio unos segundos.</p></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      <form onSubmit={(event) => { event.preventDefault(); change(); }} className="space-y-3">
        <label className="block text-xs font-bold" htmlFor={`update-zip-${instance.id}`}>Nueva versión del sitio (.zip, hasta 25 MB)</label>
        <input ref={fileInput} id={`update-zip-${instance.id}`} type="file" accept=".zip" disabled={busy} onChange={(event) => setFile(event.target.files?.[0] || null)} className="block w-full text-xs" />
        <p className="text-xs">Sube el contenido de dist/ o build/ con index.html; no incluyas fuentes privadas ni .env.</p>
        <button disabled={busy || !file} className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Publicando…' : 'Publicar actualización'}</button>
        {busy && <p role="status" className="animate-pulse text-xs">Validando y preparando la publicación. Mantén esta pestaña abierta.</p>}
      </form>
      <div className="border-t border-slate-100 pt-4">
        <h3 className="text-xs font-bold">Versiones guardadas</h3>
        <p className="mt-1 text-xs text-slate-500">Se conserva un historial limitado. Al actualizar por primera vez también guardamos la versión original.</p>
        {!versions.length && <p className="mt-2 text-xs">{loaded ? 'Aún no hay actualizaciones guardadas.' : 'Cargando versiones…'}</p>}
        <ul className="mt-2 divide-y divide-slate-100">{versions.map((version) => <li key={version.id} className="flex items-center justify-between gap-3 py-3 text-xs">
          <span>{new Date(version.created_at).toLocaleString('es-GT')} · {(version.size_bytes / 1048576).toFixed(2)} MB</span>
          {version.active ? <span className="font-bold text-brand-700">Actual</span> : <button disabled={busy} onClick={() => setRestore(version.id)} className="font-bold text-brand-700 disabled:opacity-50">Restaurar</button>}
        </li>)}</ul>
        {restore && <div className="mt-2 rounded-lg bg-amber-50 p-3 text-xs" role="group" aria-label="Confirmar restauración">
          <p>¿Publicar esta versión anterior en la misma URL?</p>
          <button disabled={busy} onClick={() => change(restore)} className="mr-4 mt-2 font-bold">Confirmar restauración</button>
          <button disabled={busy} onClick={() => setRestore(null)}>Cancelar</button>
        </div>}
      </div>
      <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
        <div><h3 className="text-xs font-bold">Disponibilidad HTTP</h3><p className="mt-2 text-sm">{status}</p>
          {latest && <p className="mt-1 text-xs">Última comprobación: {new Date(latest.checked_at).toLocaleString('es-GT')}</p>}
          {latest?.latency_ms != null && <p className="mt-1 text-xs">{latest.latency_ms} ms · HTTP {latest.http_status || 'sin respuesta'}</p>}</div>
        <div><h3 className="text-xs font-bold">Muestras disponibles</h3><p className="mt-2 text-sm">{monitor?.availability_percent == null ? 'Sin datos' : `${monitor.availability_percent}% disponible`}</p><p className="mt-1 text-xs">{monitor?.samples || 0} muestras. No incluye paradas intencionales ni garantiza disponibilidad pública.</p></div>
        <div><h3 className="text-xs font-bold">Tráfico observado</h3><p className="mt-2 text-sm">{traffic?.available ? `${traffic.requests} solicitudes` : 'Sin datos'}</p>
          {traffic?.available && <p className="mt-1 text-xs">{(traffic.response_body_bytes / 1048576).toFixed(2)} MB de cuerpos de respuesta · {traffic.errors} errores HTTP</p>}
          <p className="mt-1 text-xs text-slate-500">{traffic?.scope || 'Estadísticas de los logs recientes de Nginx.'}</p></div>
      </div>
    </section>
  );
}
