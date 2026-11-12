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

  const navLinks = [
    { label: 'Cómo funciona', id: 'como-funciona' },
    { label: 'Características', id: 'caracteristicas' },
    { label: 'Planes', id: 'planes' },
    { label: 'FAQ', id: 'faq' },
  ];

  const handleSectionClick = (event, sectionId) => {
    event.preventDefault();
    setMobileMenuOpen(false);

    if (onNavigateSection) {
      onNavigateSection(sectionId);
      return;
    }

    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (onHome) {
      onHome();

      setTimeout(() => {
        document
          .getElementById(sectionId)
          ?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      return;
    }

    window.location.hash = `#${sectionId}`;
  };

  const handleHomeClick = (event) => {
    event.preventDefault();
    setMobileMenuOpen(false);

    if (onHome) {
      onHome();
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <header className="sticky top-0 z-50 h-[78px] border-b border-[#e2e8f0] bg-white md:h-[86px]">
      <div className="mx-auto flex h-full max-w-[1380px] items-center justify-between px-5 sm:px-6 lg:px-12">

        {/* Marca */}
        <button
          type="button"
          onClick={handleHomeClick}
          className="group flex cursor-pointer items-center gap-3 text-left"
          aria-label="Volver al inicio"
        >
          <img
            src={codropIsotipo}
            alt="Codrop"
            className="h-[48px] w-[70px] flex-shrink-0 object-contain transition-transform duration-200 group-hover:scale-[1.03] md:h-[52px] md:w-[78px]"
          />

          <div>
            <div className="whitespace-nowrap text-[23px] font-bold leading-none tracking-[-0.02em] md:text-[26px]">
              <span className="text-brand-500">Co</span>
              <span className="text-navy-900">drop</span>
            </div>

            <div className="mt-1.5 whitespace-nowrap text-[12px] font-medium leading-none text-[#64748b] md:text-[13px]">
              De tu código a la web
            </div>
          </div>
        </button>

        {/* Navegación escritorio */}
        <nav className="hidden items-center gap-5 text-[16px] font-semibold text-[#64748b] md:flex lg:gap-8">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(event) => handleSectionClick(event, link.id)}
              className="cursor-pointer whitespace-nowrap py-2 transition-colors hover:text-brand-600"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Acciones escritorio */}
        <div className="hidden items-center gap-3 sm:flex">
          {variant === 'landing' && (
            <>
              <button
                type="button"
                onClick={onLogin}
                className="btn-tactile cursor-pointer whitespace-nowrap px-3 py-2.5 text-[16px] font-semibold text-navy-900 transition hover:text-brand-600"
              >
                Iniciar sesión
              </button>

              <button
                type="button"
                onClick={onRegister}
                className="btn-tactile h-[48px] cursor-pointer whitespace-nowrap rounded-[8px] bg-brand-500 px-7 text-[16px] font-semibold text-white shadow-sm transition hover:bg-brand-600"
              >
                Crear cuenta
              </button>
            </>
          )}

          {variant === 'login' && (
            <AuthPrompt
              label="¿No tienes cuenta?"
              action="Crear cuenta"
              onClick={onRegister}
              accent
            />
          )}

          {variant === 'register' && (
            <AuthPrompt
              label="¿Ya tienes una cuenta?"
              action="Iniciar sesión"
              onClick={onLogin}
            />
          )}

          {(variant === 'forgot-password' || variant === 'reset-password') && (
            <AuthPrompt
              label="¿Recordaste tu contraseña?"
              action="Iniciar sesión"
              onClick={onLogin}
            />
          )}

          {variant === 'verification' && (
            <AuthPrompt
              label="¿Ya verificaste tu correo?"
              action="Iniciar sesión"
              onClick={onLogin}
              accent
            />
          )}
        </div>

        {/* Menú móvil */}
        <div className="flex items-center gap-2 md:hidden">
          {variant !== 'landing' && onLogin && (
            <button
              type="button"
              onClick={onLogin}
              className="text-[15px] font-semibold text-brand-600 hover:text-brand-700 sm:hidden"
            >
              Iniciar sesión
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((previous) => !previous)}
            className="btn-tactile cursor-pointer rounded-lg p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-navy-900"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Desplegable móvil */}
      {mobileMenuOpen && (
        <div className="animate-fade-in absolute left-0 right-0 top-[78px] z-50 border-b border-[#e2e8f0] bg-white/98 px-6 py-6 shadow-lg backdrop-blur-md md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(event) => handleSectionClick(event, link.id)}
                className="cursor-pointer border-b border-slate-100 py-3 text-[16px] font-semibold text-navy-900 hover:text-brand-600"
              >
                {link.label}
              </a>
            ))}

            <div className="flex flex-col gap-3 pt-3">
              {onLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogin();
                  }}
                  className="btn-tactile flex h-[46px] w-full items-center justify-center rounded-lg border border-slate-200 text-[16px] font-semibold text-slate-800"
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
                  className="btn-tactile flex h-[46px] w-full items-center justify-center rounded-lg bg-brand-500 text-[16px] font-semibold text-white shadow-sm"
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

function AuthPrompt({
  label,
  action,
  onClick,
  accent = false,
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="whitespace-nowrap text-[15px] text-[#64748b]">
        {label}
      </span>

      <button
        type="button"
        onClick={onClick}
        className={`btn-tactile cursor-pointer whitespace-nowrap text-[16px] font-semibold transition ${
          accent
            ? 'text-brand-600 hover:text-brand-700'
            : 'text-navy-900 hover:text-brand-600'
        }`}
      >
        {action}
      </button>
    </div>
  );
}