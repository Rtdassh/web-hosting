import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { authService } from '../services/api';

export default function Register({ onLogin, onVerification }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess(false);

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Completa todos los campos.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await authService.register({
        full_name: fullName,
        email,
        password,
      });

      setSuccess(true);

      if (onVerification) {
        setTimeout(() => {
          onVerification(email);
        }, 700);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No fue posible crear la cuenta.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-900">
      {/* Header */}
      <header className="h-[72px] bg-white border-b border-[#e2e8f0]">
        <div className="h-full px-6 lg:px-12 flex items-center justify-between">
          <div>
            <h1 className="text-[24px] leading-none font-semibold tracking-tight text-[#0f172a]">
              Crear cuenta
            </h1>

            <p className="text-[13px] text-[#64748b] mt-1.5">
              Regístrate para comenzar a publicar tus sitios.
            </p>
          </div>

          <span className="hidden sm:block text-[14px] font-semibold text-[#0f172a]">
            CloudPaaS
          </span>
        </div>
      </header>

      {/* Contenido */}
      <section className="px-4 py-12 sm:py-16">
        <div className="w-full max-w-[580px] mx-auto">
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-8 sm:p-[50px] shadow-sm">
            <h2 className="text-[30px] leading-tight font-semibold tracking-tight text-[#0f172a]">
              Crear cuenta
            </h2>

            <div className="mt-8">
              {error && (
                <div className="flex items-start gap-2.5 p-3 mb-5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2.5 p-3 mb-5 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Cuenta creada correctamente. Verifica tu correo para continuar.
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nombre */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                    Nombre completo
                  </label>

                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Fernando Espinoza"
                    className="w-full h-[46px] bg-white border border-[#e2e8f0] rounded-[8px] px-3.5 text-[14px] text-[#0f172a] placeholder-[#64748b] focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                {/* Correo */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                    Correo electrónico
                  </label>

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full h-[46px] bg-white border border-[#e2e8f0] rounded-[8px] px-3.5 text-[14px] text-[#0f172a] placeholder-[#64748b] focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                    Contraseña
                  </label>

                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full h-[46px] bg-white border border-[#e2e8f0] rounded-[8px] px-3.5 text-[14px] text-[#0f172a] placeholder-[#64748b] focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                    Confirmar contraseña
                  </label>

                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full h-[46px] bg-white border border-[#e2e8f0] rounded-[8px] px-3.5 text-[14px] text-[#0f172a] placeholder-[#64748b] focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                {/* Botón */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[44px] rounded-[9px] bg-[#2563eb] hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    'Crear cuenta'
                  )}
                </button>
              </form>

              {/* Login */}
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={onLogin}
                  className="text-[13px] text-[#2563eb] hover:text-blue-700 transition-colors"
                >
                  ¿Ya tienes cuenta? Iniciar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}