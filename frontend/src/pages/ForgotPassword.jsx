import React, { useState } from 'react';
import { Mail, ArrowLeft, KeyRound, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '../services/api';

/**
 * ForgotPassword: Solicitud de restablecimiento con token temporal de 15 min (RF-05).
 */
export default function ForgotPassword({ onBack, onGoToReset }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulatedToken, setSimulatedToken] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await authService.forgotPassword(email);
      setLoading(false);
      if (res.reset_token_simulated) {
        setSimulatedToken(res.reset_token_simulated);
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.detail || 'No se pudo generar la solicitud de recuperación.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Inicio de Sesión
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-500/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Recuperar Contraseña</h1>
          <p className="text-xs text-slate-400 mt-1">
            Ingresa tu correo para generar un token de restablecimiento válido por 15 minutos (RF-05).
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {simulatedToken ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4" /> Enlace de Recuperación Generado
              </div>
              <p className="text-slate-300">
                En entorno local, tu token de seguridad temporal de 15 minutos es:
              </p>
              <div className="font-mono text-xs bg-slate-950 p-2 rounded border border-slate-800 break-all select-all text-indigo-300">
                {simulatedToken}
              </div>
            </div>
            <button
              onClick={() => onGoToReset && onGoToReset(simulatedToken)}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition shadow-lg shadow-indigo-600/30"
            >
              Continuar a Restablecer Contraseña →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generando token...
                </>
              ) : (
                'Enviar Enlace de Recuperación'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
