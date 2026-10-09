import React from 'react';
import codropIsotipo from '../../assets/codrop-isotipo.png';

export default function PublicNavbar({
  onHome,
  onLogin,
  onRegister,
  variant = 'landing',
}) {
  return (
    <header className="h-[74px] bg-white border-b border-[#e2e8f0] relative z-40">
      <div className="max-w-[1380px] mx-auto h-full px-6 lg:px-12 flex items-center justify-between">

        {/* =====================================================
            MARCA CODROP
        ====================================================== */}
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-3 group"
          aria-label="Volver al inicio"
        >
          <img
            src={codropIsotipo}
            alt="Codrop"
            className="w-[72px] h-[48px] object-contain flex-shrink-0 transition-transform group-hover:scale-[1.03]"
          />

          <div className="text-left">
            <div className="text-[23px] leading-none font-bold tracking-[-0.02em] whitespace-nowrap">
              <span className="text-brand-500">Co</span>
              <span className="text-navy-900">drop</span>
            </div>

            <div className="mt-1 text-[11px] leading-none text-[#64748b] whitespace-nowrap">
              De tu código a la web
            </div>
          </div>
        </button>


        {/* =====================================================
            LANDING
        ====================================================== */}
        {variant === 'landing' && (
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={onLogin}
              className="hidden sm:block text-[14px] font-semibold text-navy-900 hover:text-brand-600 transition-colors"
            >
              Iniciar sesión
            </button>

            <button
              type="button"
              onClick={onRegister}
              className="h-[42px] px-6 rounded-[8px] bg-brand-500 hover:bg-brand-600 text-white text-[14px] font-semibold shadow-sm transition-colors"
            >
              Crear cuenta
            </button>
          </div>
        )}


        {/* =====================================================
            REGISTER
        ====================================================== */}
        {variant === 'register' && (
          <button
            type="button"
            onClick={onLogin}
            className="text-[14px] font-semibold text-navy-900 hover:text-brand-600 transition-colors"
          >
            Ya tengo una cuenta
          </button>
        )}


        {/* =====================================================
            LOGIN
        ====================================================== */}
        {variant === 'login' && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[13px] text-[#64748b]">
              ¿No tienes cuenta?
            </span>

            <button
              type="button"
              onClick={onRegister}
              className="text-[14px] font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              Crear cuenta
            </button>
          </div>
        )}


        {/* =====================================================
            VERIFICATION
        ====================================================== */}
        {variant === 'verification' && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[13px] text-[#64748b]">
              ¿Ya verificaste tu correo?
            </span>

            <button
              type="button"
              onClick={onLogin}
              className="text-[14px] font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              Iniciar sesión
            </button>
          </div>
        )}

      </div>
    </header>
  );
}