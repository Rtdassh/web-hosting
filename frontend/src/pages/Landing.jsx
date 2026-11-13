import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  Zap,
  Server,
  Layers3,
  Globe,
  ChevronDown,
  Users,
} from 'lucide-react';

import heroArtwork from '../assets/landing/hosting-hero.png';
import PublicNavbar from '../components/layout/PublicNavbar';
import CrocodileMascot from '../components/mascot/CrocodileMascot';
import PublicationJourney from '../components/marketing/PublicationJourney';
import HostingBenefits from '../components/marketing/HostingBenefits';

export default function Landing({
  onLogin,
  onRegister,
  onNavigateSection,
}) {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const toggleFaq = (index) => {
    setOpenFaqIndex((prevIndex) =>
      prevIndex === index ? null : index
    );
  };

  return (
    <main className="flex min-h-screen flex-col bg-white text-navy-900 selection:bg-brand-500 selection:text-white">

      {/* =====================================================
          NAVBAR
      ====================================================== */}
      <PublicNavbar
        variant="landing"
        onHome={() =>
          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          })
        }
        onLogin={onLogin}
        onRegister={onRegister}
        onNavigateSection={onNavigateSection}
      />

      {/* =====================================================
          HERO
      ====================================================== */}
      <section className="relative flex-1 overflow-hidden bg-[#f8fbfc]">

        {/* Fondos ambientales */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-180px] top-[-180px] h-[520px] w-[520px] rounded-full bg-brand-100/55 blur-[90px]" />

          <div className="absolute right-[120px] top-[-200px] h-[420px] w-[580px] rounded-full bg-brand-50 blur-[110px]" />

          <div className="absolute bottom-[-220px] right-[-150px] h-[520px] w-[520px] rounded-full bg-brand-100/45 blur-[80px]" />
        </div>

        {/* Formas decorativas */}
        <div className="pointer-events-none absolute -left-20 -top-16 h-[250px] w-[260px] rotate-[-12deg] rounded-[42%_58%_70%_30%/45%_45%_55%_55%] bg-brand-100/55" />

        <div className="pointer-events-none absolute -left-[120px] bottom-[90px] h-[210px] w-[240px] rotate-[18deg] rounded-[60%_40%_35%_65%/60%_55%_45%_40%] bg-brand-50" />

        {/* Cuadrícula */}
        <div
          className="pointer-events-none absolute right-0 top-[280px] h-[340px] w-[360px] opacity-[0.055]"
          style={{
            backgroundImage:
              'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <DotGrid className="absolute left-[70px] top-[82px]" />
        <DotGrid className="absolute bottom-[105px] right-[20px]" />

        {/* Contenido */}
        <div className="relative z-10 mx-auto flex min-h-[660px] max-w-[1380px] items-center px-6 lg:px-12">

          <div className="grid w-full items-center gap-0 py-10 lg:grid-cols-[1fr_1fr] lg:gap-10 lg:py-16 xl:gap-16">

            {/* Lado izquierdo */}
            <div className="contents max-w-[760px] lg:block">

              <div className="order-0 inline-flex items-center gap-3 rounded-full border border-brand-100 bg-brand-50/90 px-4 py-2 shadow-[0_5px_20px_rgba(40,181,134,0.08)]">

                <span className="status-dot-live h-2 w-2 rounded-full bg-brand-500" />

                <span className="text-[14px] font-semibold text-brand-700 sm:text-[15px]">
                  Tu proyecto entra como .zip y sale como URL pública
                </span>

              </div>

              <h1 className="order-1 mt-6 max-w-[760px] text-[46px] font-bold leading-[1.03] tracking-[-0.035em] text-navy-900 sm:text-[54px] lg:text-[58px]">
                De tu código a la web, sin{' '}
                <span className="text-brand-500">
                  complicaciones
                </span>
              </h1>

              <p className="order-3 mt-7 max-w-[670px] text-[18px] leading-[1.55] text-[#64748b] sm:text-[20px]">
                Olvídate de servidores difíciles y configuraciones lentas.
                Sube tus archivos o elige una plantilla lista para usar:
                en 5 segundos tu página web estará en línea, rápida y
                con su propio enlace para compartir con quien quieras.
              </p>

              <div className="order-4 mt-9 flex flex-col gap-4 sm:flex-row">

                <button
                  type="button"
                  onClick={onRegister}
                  className="btn-tactile brand-focus flex h-[54px] cursor-pointer items-center justify-center gap-3 rounded-[10px] bg-brand-500 px-8 text-[16px] font-bold text-white shadow-[0_12px_28px_rgba(40,181,134,0.28)] transition duration-150 hover:bg-brand-600"
                >
                  Empezar gratis en 1 minuto
                  <ArrowRight className="h-5 w-5" />
                </button>

                <a
                  href="#planes"
                  className="btn-tactile flex h-[54px] cursor-pointer items-center justify-center rounded-[10px] border border-[#d6dfdb] bg-white px-8 text-[16px] font-semibold text-navy-900 shadow-sm transition duration-150 hover:border-[#b9d8ca] hover:text-brand-600"
                >
                  Ver planes y precios
                </a>

              </div>

              {/* Beneficios inferiores aumentados */}
              <div className="order-5 mt-10 flex flex-wrap items-center gap-x-7 gap-y-4 text-[15px] font-medium text-[#64748b] sm:text-[16px]">

                <Benefit>
                  Tu web online al instante
                </Benefit>

                <Benefit>
                  Recursos 100% dedicados
                </Benefit>

                <Benefit>
                  Comienza gratis sin compromiso
                </Benefit>

              </div>

            </div>

            {/* Imagen principal */}
            <figure className="order-2 relative m-0 mt-6 min-w-0 lg:order-none lg:-mr-6 lg:mt-0">

              <div
                aria-hidden="true"
                className="absolute bottom-[10%] left-[12%] right-[8%] top-[15%] rounded-full bg-brand-100/35 blur-3xl"
              />

              <img
                src={heroArtwork}
                alt="Ilustración de una web publicada desde tus archivos, con un portátil y un cursor para compartirla"
                fetchPriority="high"
                decoding="async"
                width="1536"
                height="1024"
                className="relative h-auto w-full drop-shadow-[0_20px_20px_rgba(23,40,56,0.04)]"
              />

              {/* Texto inferior aumentado */}
              <figcaption className="relative mx-auto mt-3 flex max-w-md items-center justify-center gap-3 text-[15px] font-medium text-slate-600">

                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-100 bg-white text-brand-600">
                  <Globe className="h-[18px] w-[18px]" />
                </span>

                Tu idea merece su propio lugar en internet.

              </figcaption>

            </figure>

          </div>

        </div>
      </section>

      {/* =====================================================
          CÓMO FUNCIONA
      ====================================================== */}
      <PublicationJourney />

      {/* =====================================================
          BENEFICIOS
      ====================================================== */}
      <section
        id="caracteristicas"
        className="relative border-t border-brand-50 bg-white py-16 sm:py-20"
      >
        <CrocodileMascot
          variant="walking"
          position="edge-top"
          className="!right-8 !w-28 sm:!w-36 lg:!right-16"
        />

        <div
          aria-hidden="true"
          className="accent-stripes absolute inset-x-0 top-0"
        />

        <div className="mx-auto max-w-[1380px] px-6 lg:px-12">
          <HostingBenefits />
        </div>
      </section>

      {/* =====================================================
          PLANES
      ====================================================== */}
      <section
        id="planes"
        className="border-t border-[#edf2f0] bg-white py-16 sm:py-20"
      >
        <div className="mx-auto max-w-[1380px] px-6 lg:px-12">

          {/* Encabezado más compacto */}
          <div className="mx-auto max-w-3xl text-center">

            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-[13px] font-bold uppercase tracking-[0.14em] text-brand-700">
              <Zap className="h-4 w-4 text-brand-500" />
              Planes Transparentes
            </span>

            <h2 className="mt-4 text-[34px] font-bold leading-tight tracking-[-0.03em] text-navy-900 sm:text-[40px] lg:text-[44px]">
              Precios claros, sin sorpresas ni contratos forzosos
            </h2>

            <p className="mx-auto mt-4 max-w-3xl text-[17px] leading-7 text-[#64748b] sm:text-[18px]">
              Elige el plan que mejor se adapte a tu proyecto actual.
              Puedes empezar completamente gratis y mejorar tu suscripción
              en cualquier momento cuando lo necesites.
            </p>

          </div>

          {/* Cards más compactas y centradas */}
          <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-3">

            <PricingCard
              name="Free"
              icon={Server}
              price="0"
              period="/ mes"
              badge="Acceso Gratuito"
              description="Ideal para estudiantes, proyectos personales o para publicar tu primer portafolio sin pagar nada."
              buttonLabel="Comenzar con Free"
              onAction={onRegister}
              features={[
                '1 página web activa en línea',
                '128 MB de memoria rápida exclusiva',
                '0.25 vCPU de límite para tu sitio',
                'Publicación fácil con archivo .zip',
                'Enlace público propio y directo',
                'Gráficos simples de actividad y consumo',
                'Protección de archivos garantizada',
              ]}
            />

            <PricingCard
              popular
              name="Developer"
              icon={Zap}
              price="4.99"
              period="/ mes"
              badge="El Más Elegido"
              description="El favorito de freelancers y profesionales que gestionan varios proyectos con mayor velocidad."
              buttonLabel="Elegir Developer"
              onAction={onRegister}
              features={[
                'Hasta 3 sitios web simultáneos',
                '256 MB RAM por sitio (Doble de potencia)',
                '0.50 vCPU de límite para mayor velocidad',
                'Plantillas en 1 clic (Negocios, Portfolio, Docs)',
                'Monitoreo detallado y registro de visitas',
                'Pasarela de pago rápida y segura',
                'Comprobante digital inmediato para tus registros',
                'Mejora o cambia de plan cuando quieras',
              ]}
            />

            <PricingCard
              name="Pro"
              icon={Layers3}
              price="9.99"
              period="/ mes"
              badge="Máximo Rendimiento"
              description="Para negocios y agencias que necesitan alta capacidad, más sitios y soporte prioritario."
              buttonLabel="Comenzar con Pro"
              onAction={onRegister}
              features={[
                'Hasta 10 sitios web simultáneos',
                '512 MB RAM por sitio (Cuádruple de potencia)',
                '1.00 vCPU completa para máxima rapidez',
                'Prioridad en asignación de recursos',
                'Plantillas premium y personalizables',
                'Exportación de comprobantes y reportes',
                'Historial completo de pagos y consumo',
                'Soporte técnico preferencial',
              ]}
            />

          </div>

        </div>
      </section>

      {/* =====================================================
          FAQ
      ====================================================== */}
      <section
        id="faq"
        className="border-t border-[#edf2f0] bg-[#f8fbfc] bg-brand-stripes-subtle py-20"
      >
        <div className="mx-auto max-w-[1080px] px-6 lg:px-12">

          <div className="mx-auto max-w-3xl text-center">

            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-[13px] font-bold uppercase tracking-[0.14em] text-brand-700">
              <Users className="h-4 w-4 text-brand-500" />
              Resolvemos tus Dudas
            </span>

            <h2 className="mt-5 text-[34px] font-bold tracking-[-0.03em] text-navy-900 sm:text-[42px]">
              Preguntas Frecuentes
            </h2>

            <p className="mt-4 text-[18px] leading-8 text-[#64748b]">
              Todo lo que necesitas saber antes de empezar a publicar
              tus sitios web con nosotros.
            </p>

          </div>

          <div className="mt-12 space-y-4">

            <FaqItem
              question="¿Qué tipo de páginas web puedo publicar en Codrop?"
              answer="Puedes publicar cualquier sitio web estático: páginas creadas en HTML, CSS y JavaScript puro, o aplicaciones modernas exportadas desde React, Vue, Angular, Astro, Vite, Next.js (export estático) o Tailwind. Solo necesitas que el archivo de inicio sea un index.html."
              isOpen={openFaqIndex === 0}
              onToggle={() => toggleFaq(0)}
            />

            <FaqItem
              question="¿Cómo funciona el proceso de pago y suscripción?"
              answer="Para suscribirte a los planes Developer o Pro ingresas los datos de tu tarjeta a través de nuestro formulario seguro protegido con validación algorítmica. El cobro es mensual, recibes tu comprobante digital de inmediato y puedes cancelar en cualquier momento desde tu panel."
              isOpen={openFaqIndex === 1}
              onToggle={() => toggleFaq(1)}
            />

            <FaqItem
              question="¿Qué pasa si necesito apagar mi página o cambiar de plan?"
              answer="Tienes el control total en todo momento. Desde tu panel de control puedes detener, reiniciar o eliminar cualquier sitio con un solo clic. Si tus necesidades crecen, puedes subir de plan instantáneamente y tus nuevos límites se habilitarán de inmediato."
              isOpen={openFaqIndex === 2}
              onToggle={() => toggleFaq(2)}
            />

            <FaqItem
              question="¿Puedo usar Codrop si no sé nada de servidores o comandos?"
              answer="¡Totalmente! Codrop fue creado precisamente para eliminar la necesidad de usar terminales, comandos de Linux o configurar servidores complejos. Con arrastrar tu archivo comprimido o elegir una plantilla, la plataforma hace todo el trabajo técnico por ti."
              isOpen={openFaqIndex === 3}
              onToggle={() => toggleFaq(3)}
            />

          </div>

        </div>
      </section>

      {/* =====================================================
          CTA FINAL
      ====================================================== */}
      <section className="relative overflow-hidden border-t border-[#edf2f0] bg-white py-20">

        <div className="relative z-10 mx-auto max-w-[1380px] px-6 lg:px-12">

          <div className="mx-auto max-w-4xl rounded-[32px] border border-[#dfe7e4] bg-gradient-to-br from-[#f8fbfc] to-brand-50/40 p-10 text-center shadow-[0_20px_60px_rgba(40,181,134,0.08)] sm:p-14">

            <h2 className="text-[36px] font-bold leading-tight tracking-tight text-navy-900 sm:text-[48px]">
              ¿Listo para ver tu proyecto en internet?
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-[18px] leading-8 text-[#64748b] sm:text-[19px]">
              Crea tu cuenta gratuita hoy y publica tu primera página web
              en menos de 60 segundos. Sin tarjeta de crédito requerida
              para empezar.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">

              <button
                type="button"
                onClick={onRegister}
                className="btn-tactile brand-focus flex h-[56px] w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] bg-brand-500 px-9 text-[17px] font-bold text-white shadow-[0_10px_25px_rgba(40,181,134,0.3)] transition duration-150 hover:bg-brand-600 sm:w-auto"
              >
                Crear cuenta gratis
                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={onLogin}
                className="btn-tactile flex h-[56px] w-full cursor-pointer items-center justify-center rounded-[10px] border border-[#d6dfdb] bg-white px-8 text-[17px] font-semibold text-navy-900 shadow-sm transition duration-150 hover:text-brand-600 sm:w-auto"
              >
                Ya tengo una cuenta
              </button>

            </div>

          </div>

        </div>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}
      <footer className="border-t border-[#edf2f0] bg-[#f8fbfc] py-14 text-navy-900">

        <div className="mx-auto max-w-[1380px] px-6 lg:px-12">

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">

            {/* Marca */}
            <div className="sm:col-span-2">

              <div className="flex items-center gap-3">
                <span className="text-[24px] font-bold tracking-tight">
                  <span className="text-brand-500">
                    Co
                  </span>

                  <span className="text-navy-900">
                    drop
                  </span>
                </span>
              </div>

              <p className="mt-4 max-w-lg text-[16px] leading-7 text-[#64748b]">
                La plataforma de alojamiento web rápido y accesible que
                convierte tus archivos en sitios en línea en cuestión de
                segundos.
              </p>

              <p className="mt-6 text-[14px] text-[#94a3b8]">
                &copy; {new Date().getFullYear()} Codrop Platform.
                Todos los derechos reservados.
              </p>

            </div>

            {/* Plataforma */}
            <div>

              <p className="text-[14px] font-bold uppercase tracking-[0.13em] text-navy-900">
                Plataforma
              </p>

              <ul className="mt-4 space-y-3 text-[16px] text-[#64748b]">

                <li>
                  <a
                    href="#como-funciona"
                    className="transition-colors hover:text-brand-600"
                  >
                    Cómo funciona
                  </a>
                </li>

                <li>
                  <a
                    href="#caracteristicas"
                    className="transition-colors hover:text-brand-600"
                  >
                    Características
                  </a>
                </li>

                <li>
                  <a
                    href="#planes"
                    className="transition-colors hover:text-brand-600"
                  >
                    Planes y Precios
                  </a>
                </li>

                <li>
                  <a
                    href="#faq"
                    className="transition-colors hover:text-brand-600"
                  >
                    Preguntas frecuentes
                  </a>
                </li>

              </ul>

            </div>

            {/* Cuenta */}
            <div>

              <p className="text-[14px] font-bold uppercase tracking-[0.13em] text-navy-900">
                Tu Cuenta
              </p>

              <ul className="mt-4 space-y-3 text-[16px] text-[#64748b]">

                <li>
                  <button
                    type="button"
                    onClick={onLogin}
                    className="cursor-pointer text-left transition-colors hover:text-brand-600"
                  >
                    Iniciar Sesión
                  </button>
                </li>

                <li>
                  <button
                    type="button"
                    onClick={onRegister}
                    className="cursor-pointer text-left transition-colors hover:text-brand-600"
                  >
                    Registrar Cuenta
                  </button>
                </li>

              </ul>

            </div>

          </div>

        </div>
      </footer>

    </main>
  );
}


/* =========================================================
   PRICING CARD
========================================================= */

function PricingCard({
  name,
  icon: Icon,
  price,
  period,
  badge,
  description,
  buttonLabel,
  onAction,
  features,
  popular = false,
}) {
  return (
    <div
      id={`landing-plan-${name.toLowerCase()}`}
      tabIndex={-1}
      data-interactive="true"
      className={`card-tactile brand-focus scroll-mt-28 relative flex flex-col justify-between rounded-[24px] p-6 sm:p-7 ${
        popular
          ? 'border-2 border-brand-500 bg-white shadow-[0_20px_50px_rgba(40,181,134,0.14)]'
          : 'border border-[#dfe7e4] bg-[#fbfdfc] shadow-[0_10px_30px_rgba(23,40,56,0.04)] hover:shadow-md'
      }`}
    >

      {popular && (
        <div
          aria-hidden="true"
          className="accent-stripes absolute inset-x-0 top-0 rounded-t-[22px]"
        />
      )}

      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-500 px-4 py-1.5 text-[12px] font-black uppercase tracking-[0.14em] text-white shadow-sm">
          {badge}
        </div>
      )}

      <div>

        <div className="flex items-center justify-between">

          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-brand-50 text-brand-600">
            <Icon className="h-6 w-6" />
          </div>

          {!popular && (
            <span className="rounded-full border border-[#dfe7e4] bg-white px-3 py-1.5 text-[12px] font-bold text-[#64748b]">
              {badge}
            </span>
          )}

        </div>

        <h3 className="mt-5 text-[25px] font-bold tracking-tight text-navy-900">
          Plan {name}
        </h3>

        <div className="mt-3 flex items-baseline gap-1.5">

          <span className="text-[40px] font-black tracking-tight text-navy-900">
            ${price}
          </span>

          <span className="text-[13px] font-semibold text-[#64748b]">
            USD {period}
          </span>

        </div>

        <p className="mt-3 text-[15px] leading-6 text-[#64748b]">
          {description}
        </p>

        <div className="mt-5 space-y-2.5 border-t border-[#edf2f0] pt-5">

          <p className="text-[12px] font-bold uppercase tracking-[0.13em] text-[#94a3b8]">
            Lo que incluye:
          </p>

          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-2.5 text-[14px] leading-5 text-[#475569]"
            >

              <span className="mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Check className="h-3 w-3 stroke-[2.5]" />
              </span>

              <span>
                {feature}
              </span>

            </div>
          ))}

        </div>

      </div>

      <div className="mt-6 border-t border-[#edf2f0] pt-5">

        <button
          type="button"
          onClick={onAction}
          className={`btn-tactile brand-focus flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold transition duration-150 ${
            popular
              ? 'bg-brand-500 text-white shadow-[0_8px_20px_rgba(40,181,134,0.25)] hover:bg-brand-600'
              : 'bg-navy-900 text-white hover:bg-navy-800'
          }`}
        >
          {buttonLabel}

          <ArrowRight className="h-4 w-4" />
        </button>

      </div>

    </div>
  );
}


/* =========================================================
   FAQ ITEM
========================================================= */

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[#dfe7e4] bg-white shadow-sm transition-all">

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-5 px-6 py-6 text-left transition-colors hover:bg-[#fafcfb] sm:px-7"
      >

        <span className="text-[17px] font-bold leading-7 text-navy-900 sm:text-[18px]">
          {question}
        </span>

        <ChevronDown
          className={`h-6 w-6 flex-shrink-0 text-brand-600 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />

      </button>

      {isOpen && (
        <div className="animate-fade-in border-t border-[#f1f5f3] px-6 pb-7 pt-5 text-[16px] leading-7 text-[#64748b] sm:px-7 sm:text-[17px]">
          {answer}
        </div>
      )}

    </div>
  );
}


/* =========================================================
   BENEFIT
========================================================= */

function Benefit({ children }) {
  return (
    <div className="flex items-center gap-2.5">

      <Check className="h-[18px] w-[18px] flex-shrink-0 stroke-[2.5] text-brand-500" />

      <span>
        {children}
      </span>

    </div>
  );
}


/* =========================================================
   DOT GRID
========================================================= */

function DotGrid({ className = '' }) {
  const dots = Array.from({ length: 20 });

  return (
    <div
      className={`pointer-events-none grid grid-cols-5 gap-[9px] opacity-30 ${className}`}
    >
      {dots.map((_, index) => (
        <span
          key={index}
          className="h-[3px] w-[3px] rounded-full bg-brand-500"
        />
      ))}
    </div>
  );
}