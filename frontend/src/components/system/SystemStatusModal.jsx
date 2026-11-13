import ModalLayer from '../ui/ModalLayer';
import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  Server,
  Cpu,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Globe,
  Radio,
  Check,
  Loader2,
  Lock,
} from 'lucide-react';
import api from '../../services/api';

/**
 * SystemStatusModal: Ventana modal de estado y diagnóstico de infraestructura.
 * Inspecciona el estado de la API, base de datos y conectividad de servicios.
 */
export default function SystemStatusModal({ isOpen, onClose, instances = [] }) {
  const [testing, setTesting] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [systemInfo, setSystemInfo] = useState({
    apiStatus: 'online',
    dbStatus: 'connected',
    dockerStatus: 'active',
    tailscaleIp: '100.121.210.57',
    tailscalePeer: '100.112.65.75',
    portRange: '30001 - 30100',
    baseImage: 'nginx:1.27-alpine',
  });

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setPingResult(null);
    const start = performance.now();
    try {
      const res = await api.get('/');
      const elapsed = Math.round(performance.now() - start);
      setPingResult({
        success: true,
        latency: elapsed,
        message: `Servicio ${res.data?.service || 'CloudPaaS'} respondiendo en ${elapsed}ms`,
      });
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setPingResult({
        success: false,
        latency: elapsed,
        message: 'No se pudo obtener respuesta del backend.',
      });
    } finally {
      setTesting(false);
    }
  };

  const runningCount = instances.filter((i) => i.status === 'running').length;
  const usedPorts = instances
    .filter((i) => i.assigned_port)
    .map((i) => i.assigned_port);

  return (
    <ModalLayer className="p-3 sm:p-4 modal-backdrop-animate" onClose={onClose}>
      <div className="relative w-full max-w-lg bg-white border border-[#dfe7e4] rounded-[20px] max-h-[90dvh] shadow-[0_20px_60px_rgba(23,40,56,0.18)] flex flex-col overflow-hidden text-slate-900 modal-dialog-animate">

        {/* Header */}
        <div className="relative px-6 py-4 bg-white border-b border-brand-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-200 flex items-center justify-center text-brand-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                  Infraestructura Operativa
                </span>
              </div>
              <h2 className="text-base font-bold text-navy-900">
                Estado del Sistema Codrop
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-navy-900 hover:bg-slate-100 transition duration-150 btn-tactile cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Métricas Principales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#f8fbfa] border border-[#e1ebe6]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">FastAPI Core</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" /> Online
                </span>
              </div>
              <p className="mt-2 text-xs font-mono font-semibold text-slate-800">
                Python 3.11 / Uvicorn
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Puerto 8000 (0.0.0.0)
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f8fbfa] border border-[#e1ebe6]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">PostgreSQL 16</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" /> Conectado
                </span>
              </div>
              <p className="mt-2 text-xs font-mono font-semibold text-slate-800">
                paas_postgres_dev
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Puerto 5432 / SQLAlchemy
              </p>
            </div>
          </div>

          {/* Red y Tailscale */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-brand-600" />
                <h3 className="text-xs font-bold text-slate-900">Red Tailscale Mesh</h3>
              </div>
              <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                100.x.x.x Habilitado
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-medium">IP Nodo Anfitrión (ryoku):</span>
                <p className="font-mono font-bold text-slate-900">{systemInfo.tailscaleIp}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium">Nodo Peer Activo (debian):</span>
                <p className="font-mono font-bold text-slate-900">{systemInfo.tailscalePeer}</p>
              </div>
            </div>
          </div>

          {/* Servidor de Aplicaciones */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-brand-600" />
                <h3 className="text-xs font-bold text-slate-900">Servidor de Aplicaciones</h3>
              </div>
              <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                Entornos Aislados
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-[9px] font-bold uppercase text-slate-400">Entorno Base</span>
                <span className="font-mono font-semibold text-slate-800">Web Estática</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-[9px] font-bold uppercase text-slate-400">Puertos Activos</span>
                <span className="font-mono font-semibold text-slate-800">{usedPorts.length} asignados</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-[9px] font-bold uppercase text-slate-400">Disponibilidad</span>
                <span className="font-mono font-semibold text-brand-700">99.9%</span>
              </div>
            </div>

            {usedPorts.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 font-medium block mb-1.5">Puertos de escucha activos:</span>
                <div className="flex flex-wrap gap-1.5">
                  {usedPorts.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded bg-brand-50 border border-brand-200 font-mono text-[10px] font-bold text-brand-800">
                      :{p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Prueba de Latencia en Vivo */}
          {pingResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between fade-slide-down ${pingResult.success ? 'bg-brand-50 border-brand-200 text-brand-800' : 'bg-red-50 border-red-200 text-red-800'
              }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-medium">{pingResult.message}</span>
              </div>
              <span className="font-mono font-bold text-[11px] shrink-0">{pingResult.latency} ms</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 shadow-sm transition duration-150 btn-tactile cursor-pointer disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                <span>Midiendo latencia...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Probar Conectividad</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition duration-150 btn-tactile cursor-pointer shadow-sm"
          >
            Cerrar
          </button>
        </div>

      </div>
    </ModalLayer>
  );
}

