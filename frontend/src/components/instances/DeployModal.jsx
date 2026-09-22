import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { instanceService } from '../../services/api';

export default function DeployModal({ isOpen, onClose, onInstanceDeployed }) {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !file) {
      setError('Por favor indica un nombre y selecciona un paquete .zip.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const newInstance = await instanceService.deployInstance(name, file);
      onInstanceDeployed(newInstance);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al desplegar la instancia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-lg text-white">Desplegar Nuevo Servidor Web</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Nombre de la Aplicación
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej: Mi Portafolio Personal"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Paquete Web (.zip con index.html)
            </label>
            <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl p-6 text-center bg-slate-950/50 transition">
              <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <input
                type="file"
                accept=".zip"
                required
                onChange={(e) => setFile(e.target.files[0])}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-2">Máximo 25 MB. Debe contener archivos estáticos.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-lg shadow-indigo-600/20 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Aprovisionando en Docker...</span>
                </>
              ) : (
                <span>Lanzar Contenedor</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
