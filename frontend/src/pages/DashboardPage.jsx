import React, { useState, useEffect } from 'react';
import { ExternalLink, Play, Square, RotateCcw, Trash2, Cpu, HardDrive, Globe, ServerOff } from 'lucide-react';
import { instanceService } from '../services/api';

export default function DashboardPage({ onDeployClick, refreshKey }) {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInstances = async () => {
    try {
      const data = await instanceService.getInstances();
      setInstances(data);
    } catch (err) {
      console.error("Error al cargar instancias:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, [refreshKey]);

  const handleAction = async (id, action) => {
    try {
      await instanceService.triggerAction(id, action);
      fetchInstances();
    } catch (err) {
      alert("Error al ejecutar acción: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDestroy = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta instancia y liberar el puerto?")) return;
    try {
      await instanceService.destroyInstance(id);
      fetchInstances();
    } catch (err) {
      alert("Error al eliminar instancia: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Resumen del Hito */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Servidores Web Desplegados</h1>
          <p className="text-sm text-slate-400 mt-1">
            Aprovisionamiento automatizado sobre contenedores aislados con <span className="text-indigo-400 font-mono">nginx:alpine</span>.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : instances.length === 0 ? (
        <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-12 text-center max-w-xl mx-auto mt-8">
          <ServerOff className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white">Aún no tienes sitios desplegados</h3>
          <p className="text-sm text-slate-400 mt-2 mb-6">
            Empaqueta un archivo <code>index.html</code> en un <code>.zip</code> y lanza tu primer servidor en segundos.
          </p>
          <button
            onClick={onDeployClick}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-indigo-600/20 transition"
          >
            Lanzar Primer Servidor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instances.map((inst) => (
            <div
              key={inst.id}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    inst.status === 'running'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${inst.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                    {inst.status.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-slate-500 bg-slate-800/60 px-2 py-1 rounded">
                    Puerto: {inst.assigned_port}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 truncate">{inst.name}</h3>

                <div className="mt-4 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-indigo-400" /> Enlace Público</span>
                  </div>
                  <a
                    href={inst.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition truncate w-full"
                  >
                    <span className="truncate">{inst.public_url}</span>
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  </a>
                </div>
              </div>

              {/* Botonera de control de ciclo de vida (RF-16, RF-17) */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {inst.status === 'running' ? (
                    <button
                      title="Detener Servidor"
                      onClick={() => handleAction(inst.id, 'stop')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      title="Iniciar Servidor"
                      onClick={() => handleAction(inst.id, 'start')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    title="Reiniciar Servidor"
                    onClick={() => handleAction(inst.id, 'restart')}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <button
                  title="Destruir Instancia"
                  onClick={() => handleDestroy(inst.id)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
