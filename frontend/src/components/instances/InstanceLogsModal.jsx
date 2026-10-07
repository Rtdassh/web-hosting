import React, { useEffect, useState, useRef } from 'react';
import {
  Terminal,
  X,
  RefreshCw,
  Copy,
  Check,
  ArrowDown,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { instanceService } from '../../services/api';

export default function InstanceLogsModal({ instance, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [filterStream, setFilterStream] = useState('all'); // all, access, error
  const logContainerRef = useRef(null);

  const fetchLogs = async () => {
    if (!instance?.id) return;
    setLoading(true);
    setError('');
    try {
      const data = await instanceService.getLogs(instance.id, 100);
      setLogs(data.lines || []);
    } catch (err) {
      console.error('Error al obtener logs:', err);
      setError(err.response?.data?.detail || 'No se pudieron recuperar los registros del contenedor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => {
      if (instance?.status === 'running') {
        fetchLogs();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [instance?.id, instance?.status]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopy = () => {
    if (!logs.length) return;
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter((line) => {
    if (filterStream === 'error') {
      return line.toLowerCase().includes('[error]') || line.toLowerCase().includes('stderr') || line.includes(' 404 ') || line.includes(' 500 ');
    }
    if (filterStream === 'access') {
      return !line.toLowerCase().includes('[error]');
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col h-[640px] overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Consola de Logs: {instance?.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Port: {instance?.assigned_port}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Container ID: {instance?.container_id ? instance.container_id.slice(0, 12) : 'N/A'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Stream Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilterStream('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filterStream === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({logs.length})
            </button>
            <button
              onClick={() => setFilterStream('access')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filterStream === 'access' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Access Log
            </button>
            <button
              onClick={() => setFilterStream('error')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filterStream === 'error' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Errores
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                autoScroll
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Alternar auto-scroll al recibir nuevas líneas"
            >
              <ArrowDown className="w-3 h-3" />
              <span>Auto-scroll</span>
            </button>

            <button
              onClick={handleCopy}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Refrescar</span>
            </button>
          </div>
        </div>

        {/* Terminal Screen */}
        <div
          ref={logContainerRef}
          className="flex-1 p-4 bg-[#0a0f1d] font-mono text-[12px] leading-relaxed overflow-y-auto space-y-1 select-text scroll-smooth"
        >
          {loading && logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <p className="text-xs">Conectando con Docker daemon...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-red-400 gap-2">
              <AlertCircle className="w-6 h-6" />
              <p className="text-xs">{error}</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <p className="text-xs">No hay líneas de log registradas aún en el stream seleccionado.</p>
              <p className="text-[11px] text-slate-600 mt-1">Genera peticiones HTTP a tu sitio para observar la salida.</p>
            </div>
          ) : (
            filteredLogs.map((line, idx) => {
              const isError = line.toLowerCase().includes('[error]') || line.includes(' 404 ') || line.includes(' 500 ');
              return (
                <div key={idx} className="flex items-start gap-3 hover:bg-slate-800/40 px-1 py-0.5 rounded">
                  <span className="text-slate-600 select-none text-[10px] w-8 text-right flex-shrink-0 pt-0.5">
                    {idx + 1}
                  </span>
                  <span className={`break-all ${isError ? 'text-rose-300' : 'text-emerald-300/90'}`}>
                    {line}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Últimas 100 líneas retenidas (política de rotación: 5MB / 2 archivos)</span>
          <span className="font-mono">{filteredLogs.length} líneas mostradas</span>
        </div>

      </div>
    </div>
  );
}
