import React from 'react';
import {
  Cloud,
  Upload,
  Container,
  Activity,
  FileText,
  ArrowRight,
  Check,
} from 'lucide-react';

export default function Landing({ onLogin, onRegister }) {
  const handlePlans = () => {
    document.getElementById('features')?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-900">
      {/* Navbar */}
      <header className="h-[72px] bg-white border-b border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto h-full px-6 lg:px-12 flex items-center justify-between">
          {/* Brand */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <Cloud className="w-5 h-5 text-white" />
            </div>

            <div className="text-left">
              <div className="text-xl font-semibold tracking-tight text-[#0f172a]">
                CloudPaaS
              </div>
              <div className="text-[11px] text-[#64748b] -mt-0.5 hidden sm:block">
                Hosting simplificado
              </div>
            </div>
          </button>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onLogin}
              className="hidden sm:block px-4 py-2 text-sm font-semibold text-[#0f172a] hover:text-blue-600 transition-colors"
            >
              Iniciar sesión
            </button>

            <button
              type="button"
              onClick={onRegister}
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-600/20 transition-all"
            >
              Crear cuenta
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 pt-20 lg:pt-24 pb-20">
        <div className="grid lg:grid-cols-[1fr_470px] gap-14 lg:gap-20 items-center">
          {/* Left */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              Plataforma PaaS para sitios web
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[48px] leading-[1.12] font-semibold tracking-tight text-[#0f172a] max-w-[760px]">
              Publica tu sitio web en minutos
            </h1>

            <p className="mt-6 text-lg lg:text-[20px] leading-8 text-[#64748b] max-w-[650px]">
              Sube tu proyecto, elige un plan y obtén una URL pública.
              <br className="hidden sm:block" />
              Infraestructura aislada con contenedores nginx.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onRegister}
                className="h-11 px-6 rounded-[9px] bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition-all"
              >
                Comenzar ahora
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handlePlans}
                className="h-11 px-6 rounded-[9px] bg-white border border-[#e2e8f0] hover:border-blue-200 hover:bg-blue-50/40 text-[#2563eb] text-sm font-semibold transition-all"
              >
                Ver planes
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[#64748b]">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600" />
                Despliegues con ZIP
              </div>

              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600" />
                Contenedores aislados
              </div>

              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600" />
                URL pública
              </div>
            </div>
          </div>

          {/* Right feature card */}
          <div className="bg-white border border-[#e2e8f0] rounded-[24px] p-8 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
              <Cloud className="w-5 h-5 text-[#2563eb]" />
            </div>

            <h2 className="text-[28px] leading-tight font-semibold tracking-tight text-[#0f172a]">
              Tu hosting, simplificado
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#64748b]">
              Todo lo necesario para publicar y administrar tus sitios desde
              una sola plataforma.
            </p>

            <div id="features" className="mt-7 space-y-3">
              <Feature
                icon={Upload}
                text="Despliegues con ZIP"
              />

              <Feature
                icon={Container}
                text="Contenedores aislados"
              />

              <Feature
                icon={Activity}
                text="Métricas CPU / RAM"
              />

              <Feature
                icon={FileText}
                text="Logs de Nginx"
              />
            </div>

            <div className="mt-7 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={onRegister}
                className="w-full h-11 rounded-lg bg-[#eff6ff] hover:bg-blue-100 text-[#2563eb] text-sm font-semibold transition-colors"
              >
                Empieza a desplegar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Small footer */}
      <footer className="border-t border-[#e2e8f0] bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748b]">
          <span>CloudPaaS • Web Hosting Platform</span>
          <span>Infraestructura para sitios web estáticos</span>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 h-12 px-4 rounded-[10px] bg-[#eff6ff]">
      <Icon className="w-4 h-4 text-[#2563eb] flex-shrink-0" />
      <span className="text-sm font-semibold text-[#2563eb]">
        {text}
      </span>
    </div>
  );
}