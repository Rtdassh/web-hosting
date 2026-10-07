import React, { useState } from 'react';
import { CheckCircle2, Mail } from 'lucide-react';

export default function Verification({ email, onLogin }) {
  const [resent, setResent] = useState(false);

  const handleResend = () => {
    // Por ahora es únicamente una interacción visual.
    // El backend todavía no tiene endpoint de envío de correo.
    setResent(true);
  };

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-900">
      {/* Header */}
      <header className="h-[72px] bg-white border-b border-[#e2e8f0]">
        <div className="h-full px-6 lg:px-12 flex items-center justify-between">
          <div>
            <h1 className="text-[24px] leading-none font-semibold tracking-tight text-[#0f172a]">
              Verifica tu correo
            </h1>

            <p className="text-[13px] text-[#64748b] mt-1.5">
              Confirma tu dirección para activar tu cuenta.
            </p>
          </div>

          <span className="hidden sm:block text-[14px] font-semibold text-[#0f172a]">
            CloudPaaS
          </span>
        </div>
      </header>

      {/* Contenido */}
      <section className="px-4 py-16">
        <div className="w-full max-w-[500px] mx-auto">
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-8 sm:p-[50px] shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
              <Mail className="w-6 h-6 text-[#2563eb]" />
            </div>

            <h2 className="text-[28px] leading-tight font-semibold tracking-tight text-[#0f172a]">
              Revisa tu correo
            </h2>

            <p className="mt-4 text-[17px] leading-7 text-[#64748b]">
              Enviamos un enlace de verificación a
              <br />
              <span className="font-medium text-[#0f172a]">
                {email || 'correo@ejemplo.com'}
              </span>
            </p>

            <button
              type="button"
              onClick={handleResend}
              className="mt-7 w-full h-[44px] rounded-[9px] bg-white hover:bg-blue-50 border border-transparent text-[#2563eb] text-[14px] font-semibold transition-colors"
            >
              Enviar enlace nuevamente
            </button>

            {resent ? (
              <div className="mt-5 flex items-center gap-2 text-[13px] text-[#16a34a]">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  Tu cuenta ya está lista para iniciar sesión.
                </span>
              </div>
            ) : (
              <p className="mt-5 text-[13px] text-[#16a34a]">
                Enlace válido una sola vez
              </p>
            )}

            <div className="mt-8 pt-6 border-t border-[#e2e8f0] text-center">
              <button
                type="button"
                onClick={onLogin}
                className="text-[13px] text-[#2563eb] hover:text-blue-700 transition-colors"
              >
                Continuar al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}