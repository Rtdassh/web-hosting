import React, { useState } from 'react';
import {
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onRegister }) {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    if (!email || !password) {
      setError('Completa todos los campos.');
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'No fue posible iniciar sesión.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-900">
      {/* Encabezado */}
      <header className="h-[72px] bg-white border-b border-[#e2e8f0]">
        <div className="h-full px-6 lg:px-12 flex items-center justify-between">
          <div>
            <h1 className="text-[24px] leading-none font-semibold tracking-tight text-[#0f172a]">
              Iniciar sesión
            </h1>

            <p className="text-[13px] text-[#64748b] mt-1.5">
              Accede a tu panel de CloudPaaS.
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
              Bienvenido de nuevo
            </h2>

            <p className="mt-2 text-[14px] leading-6 text-[#64748b]">
              Ingresa tus credenciales para administrar tus sitios.
            </p>

            <div className="mt-8">
              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 mb-5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />

                  <span>
                    {error}
                  </span>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-[13px] font-semibold text-[#0f172a] mb-2"
                  >
                    Correo electrónico
                  </label>

                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full h-[46px] bg-white border border-[#e2e8f0] rounded-[8px] px-3.5 text-[14px] text-[#0f172a] placeholder-[#64748b] focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-[13px] font-semibold text-[#0f172a] mb-2"
                  >
                    Contraseña
                  </label>

                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full h-[46px] bg-white border border-[#e2e8f0] rounded-[8px] px-3.5 text-[14px] text-[#0f172a] placeholder-[#64748b] focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                {/* Botón login */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[44px] rounded-[9px] bg-[#2563eb] hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>
              </form>

              {/* Ir a registro */}
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={onRegister}
                  className="text-[13px] text-[#2563eb] hover:text-blue-700 transition-colors"
                >
                  ¿No tienes cuenta? Crear cuenta
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}