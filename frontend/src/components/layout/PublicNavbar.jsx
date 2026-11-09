import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import codropIsotipo from '../../assets/codrop-isotipo.png';

export default function PublicNavbar({
  onHome,
  onLogin,
  onRegister,
  onNavigateSection,
  variant = 'landing',
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSectionClick = (e, sectionId) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (onNavigateSection) {
      onNavigateSection(sectionId);
      return;
    }

    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (onHome) {
      onHome();
      setTimeout(() => {
        const target = document.getElementById(sectionId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.location.hash = `#${sectionId}`;
    }
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (onHome) {
      onHome();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navLinks = [
    { label: 'Cómo funciona', id: 'como-funciona' },
    { label: 'Características', id: 'caracteristicas' },
    { label: 'Planes', id: 'planes' },
    { label: 'FAQ', id: 'faq' },
  ];

  return (
    <header className="h-[74px] bg-white border-b border-[#e2e8f0] relative z-40">
      <div className="max-w-[1380px] mx-auto h-full px-6 lg:px-12 flex items-center justify-between">

        {/* Marca Codrop */}
        <button
          type="button"
          onClick={handleHomeClick}
          className="flex items-center gap-3 group text-left cursor-pointer"
          aria-label="Volver al inicio"
        >
          <img
            src={codropIsotipo}
            alt="Codrop"
            className="w-[72px] h-[48px] object-contain flex-shrink-0 transition-transform duration-200 group-hover:scale-[1.03]"
          />

          <div>
            <div className="text-[23px] leading-none font-bold tracking-[-0.02em] whitespace-nowrap">
              <span className="text-brand-500">Co</span>
              <span className="text-navy-900">drop</span>
            </div>

            <div className="mt-1 text-[11px] leading-none text-[#64748b] whitespace-nowrap">
              De tu código a la web
            </div>
          </div>
        </button>

        {/* Enlaces de Navegación Global (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-[13px] font-semibold text-[#64748b]">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => handleSectionClick(e, link.id)}
              className="hover:text-brand-600 transition-colors py-1 cursor-pointer"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Acciones de Autenticación Contextuales (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center gap-3">
          {variant === 'landing' && (
            <>
              <button
                type="button"
                onClick={onLogin}
                className="text-[14px] font-semibold text-navy-900 hover:text-brand-600 transition duration-150 btn-tactile cursor-pointer px-3 py-2"
              >
                Iniciar sesión
              </button>

              <button
                type="button"
                onClick={onRegister}
                className="h-[42px] px-6 rounded-[8px] bg-brand-500 hover:bg-brand-600 text-white text-[14px] font-semibold shadow-sm transition duration-150 btn-tactile cursor-pointer"
              >
                Crear cuenta
              </button>
            </>
          )}

          {variant === 'login' && (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#64748b]">¿No tienes cuenta?</span>
              <button
                type="button"
                onClick={onRegister}
                className="text-[14px] font-semibold text-brand-600 hover:text-brand-700 transition duration-150 btn-tactile cursor-pointer"
              >
                Crear cuenta
              </button>
            </div>
          )}

          {variant === 'register' && (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#64748b]">¿Ya tienes una cuenta?</span>
              <button
                type="button"
                onClick={onLogin}
                className="text-[14px] font-semibold text-navy-900 hover:text-brand-600 transition duration-150 btn-tactile cursor-pointer"
              >
                Iniciar sesión
              </button>
            </div>
          )}

          {(variant === 'forgot-password' || variant === 'reset-password') && (
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-[#64748b]">¿Recordaste tu contraseña?</span>
              <button
                type="button"
                onClick={onLogin}
                className="text-[14px] font-semibold text-navy-900 hover:text-brand-600 transition duration-150 btn-tactile cursor-pointer"
              >
                Iniciar sesión
              </button>
            </div>
          )}

          {variant === 'verification' && (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#64748b]">¿Ya verificaste tu correo?</span>
              <button
                type="button"
                onClick={onLogin}
                className="text-[14px] font-semibold text-brand-600 hover:text-brand-700 transition duration-150 btn-tactile cursor-pointer"
              >
                Iniciar sesión
              </button>
            </div>
          )}
        </div>

        {/* Botón Menú Móvil (< md) */}
        <div className="flex md:hidden items-center gap-2">
          {variant !== 'landing' && onLogin && (
            <button
              type="button"
              onClick={onLogin}
              className="text-[13px] font-semibold text-brand-600 hover:text-brand-700 sm:hidden"
            >
              Iniciar sesión
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-lg text-slate-600 hover:text-navy-900 hover:bg-slate-100 transition duration-150 btn-tactile cursor-pointer"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Menú Desplegable Móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-[74px] left-0 right-0 bg-white/98 backdrop-blur-md border-b border-[#e2e8f0] shadow-lg px-6 py-5 animate-fade-in z-50">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => handleSectionClick(e, link.id)}
                className="text-[14px] font-semibold text-navy-900 hover:text-brand-600 py-2 border-b border-slate-100 cursor-pointer"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              {onLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogin();
                  }}
                  className="w-full h-[40px] rounded-lg border border-slate-200 text-slate-800 text-[13px] font-semibold flex items-center justify-center transition duration-150 btn-tactile"
                >
                  Iniciar sesión
                </button>
              )}
              {onRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onRegister();
                  }}
                  className="w-full h-[40px] rounded-lg bg-brand-500 text-white text-[13px] font-semibold flex items-center justify-center shadow-sm transition duration-150 btn-tactile"
                >
                  Crear cuenta
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
