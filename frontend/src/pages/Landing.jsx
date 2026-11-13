import React, { useState } from 'react';
import {
  Upload,
  Container,
  Activity,
  FileText,
  ArrowRight,
  Check,
  Zap,
  Server,
  ShieldCheck,
  Layers3,
  Cpu,
  Lock,
  Sparkles,
  Globe,
  Terminal,
  ChevronDown,
  Rocket,
  Clock,
  ExternalLink,
  Award,
  Users,
} from 'lucide-react';

import codropIsotipo from '../assets/codrop-isotipo.png';
import PublicNavbar from '../components/layout/PublicNavbar';

export default function Landing({ onLogin, onRegister, onNavigateSection }) {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const toggleFaq = (index) => {
    setOpenFaqIndex((prevIndex) => (prevIndex === index ? null : index));
  };

  return (
    <main className="min-h-screen bg-white text-navy-900 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* =====================================================
          NAVBAR COMPARTIDO
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
          HERO SECTION
      ====================================================== */}
      <section className="relative flex-1 overflow-hidden bg-[#f8fbfc]">
        {/* Fondos ambientales */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-180px] left-[-180px] w-[520px] h-[520px] rounded-full bg-brand-100/55 blur-[90px]" />
          <div className="absolute top-[-200px] right-[120px] w-[580px] h-[420px] rounded-full bg-brand-50 blur-[110px]" />
          <div className="absolute bottom-[-220px] right-[-150px] w-[520px] h-[520px] rounded-full bg-brand-100/45 blur-[80px]" />
        </div>

        {/* Formas decorativas */}
        <div className="absolute -top-16 -left-20 w-[260px] h-[250px] rounded-[42%_58%_70%_30%/45%_45%_55%_55%] bg-brand-100/55 rotate-[-12deg] pointer-events-none" />
        <div className="absolute bottom-[90px] -left-[120px] w-[240px] h-[210px] rounded-[60%_40%_35%_65%/60%_55%_45%_40%] bg-brand-50 rotate-[18deg] pointer-events-none" />

        {/* Cuadrícula sutil de fondo */}
        <div
          className="absolute right-0 top-[280px] w-[360px] h-[340px] opacity-[0.055] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <DotGrid className="absolute left-[70px] top-[82px]" />
        <DotGrid className="absolute right-[20px] bottom-[105px]" />

        {/* Cocodrilo decorativo */}
        <img
          src={codropIsotipo}
          alt=""
          aria-hidden="true"
          className="absolute left-[-38px] bottom-[-24px] w-[520px] max-w-none opacity-[0.09] pointer-events-none select-none"
        />

        {/* Contenido Hero */}
        <div className="relative z-10 max-w-[1380px] mx-auto px-6 lg:px-12 min-h-[735px] flex items-center">
          <div className="w-full grid lg:grid-cols-[1fr_520px] gap-16 xl:gap-24 items-center py-16">
            {/* Lado Izquierdo */}
            <div className="max-w-[760px]">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-brand-50/90 border border-brand-100 shadow-[0_5px_20px_rgba(40,181,134,0.08)]">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <span className="text-[13px] font-semibold text-brand-700">
                  Tu proyecto entra como .zip y sale como URL pública
                </span>
              </div>

              <h1 className="mt-6 max-w-[760px] text-[46px] sm:text-[54px] lg:text-[58px] leading-[1.03] font-bold tracking-[-0.035em] text-navy-900">
                De tu código a la web, sin{' '}
                <span className="text-brand-500">
                  complicaciones
                </span>
              </h1>

              <p className="mt-7 max-w-[670px] text-[18px] sm:text-[19px] leading-[1.55] text-[#64748b]">
                Olvídate de servidores difíciles y configuraciones lentas. Sube tus archivos o
                elige una plantilla lista para usar: en 5 segundos tu página web estará en línea,
                rápida y con su propio enlace para compartir con quien quieras.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={onRegister}
                  className="h-[52px] px-8 rounded-[10px] bg-brand-500 hover:bg-brand-600 text-white text-[15px] font-bold shadow-[0_12px_28px_rgba(40,181,134,0.28)] flex items-center justify-center gap-3 transition duration-150 btn-tactile cursor-pointer"
                >
                  Empezar gratis en 1 minuto
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#planes"
                  className="h-[52px] px-8 rounded-[10px] border border-[#d6dfdb] hover:border-[#b9d8ca] bg-white text-navy-900 hover:text-brand-600 text-[15px] font-semibold flex items-center justify-center transition duration-150 btn-tactile shadow-sm cursor-pointer"
                >
                  Ver planes y precios
                </a>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-6 text-[13px] text-[#64748b]">
                <Benefit>Tu web online al instante</Benefit>
                <Benefit>Recursos 100% dedicados</Benefit>
                <Benefit>Comienza gratis sin compromiso</Benefit>
              </div>
            </div>

            {/* Lado Derecho: Tarjeta Preview */}
            <div className="relative">
              <div className="relative bg-white/95 backdrop-blur-sm border border-[#dfe7e4] rounded-[22px] p-8 shadow-[0_24px_70px_rgba(23,40,56,0.09)] overflow-hidden">
                <div className="absolute top-0 right-0 w-[58px] h-[58px] bg-brand-100 rounded-bl-[58px]" />

                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 rounded-[16px] bg-brand-50 border border-brand-100 flex items-center justify-center shadow-sm">
                    <img
                      src={codropIsotipo}
                      alt="Codrop"
                      className="w-9 h-9 object-contain"
                    />
                  </div>

                  <div>
                    <p className="text-[12px] tracking-[0.18em] font-bold text-brand-600">
                      HOSTING MODERNO
                    </p>
                    <p className="mt-1 text-[13px] text-[#64748b]">
                      Sube. Enciende. Comparte.
                    </p>
                  </div>
                </div>

                <h2 className="mt-7 text-[28px] sm:text-[31px] leading-[1.12] font-bold tracking-[-0.03em] text-navy-900">
                  Tu sitio en internet,
                  <br />
                  sin enredos técnicos
                </h2>

                <p className="mt-4 max-w-[420px] text-[14px] leading-6 text-[#64748b]">
                  La forma más rápida de tener presencia en la web. Diseñado para que cualquier
                  persona o negocio publique su proyecto sin depender de expertos en servidores.
                </p>

                <div className="mt-7 space-y-3">
                  <FeatureRow icon={Upload} text="Arrastra y suelta tu archivo .ZIP" />
                  <FeatureRow icon={Rocket} text="Plantillas listas para usar en 1 clic" />
                  <FeatureRow icon={ShieldCheck} text="Tu web segura y siempre protegida" />
                  <FeatureRow icon={Activity} text="Monitoreo claro de visitas y consumo" />
                  <FeatureRow icon={Globe} text="Dirección web lista para compartir" />
                </div>

                <div className="mt-7 pt-6 border-t border-[#eef2f1]">
                  <button
                    type="button"
                    onClick={onRegister}
                    className="w-full h-[50px] rounded-[10px] bg-brand-50 hover:bg-brand-100 text-brand-700 text-[14px] font-semibold flex items-center justify-center gap-3 transition duration-150 btn-tactile cursor-pointer"
                  >
                    Crear mi cuenta gratuita
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECCIÓN: CÓMO FUNCIONA (PASO A PASO FÁCIL)
      ====================================================== */}
      <section id="como-funciona" className="py-24 bg-white border-t border-[#edf2f0]">
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-[0.16em] uppercase bg-brand-50 text-brand-700 border border-brand-100">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              Sencillo y Veloz
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-navy-900">
              Tres pasos simples para tener tu página web funcionando
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#64748b]">
              Eliminamos toda la fricción. Solo necesitas tu diseño o elegir una plantilla
              y nosotros nos ocupamos de todo lo demás.
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <StepCard
              number="01"
              icon={Upload}
              title="1. Carga o Elige Plantilla"
              description="Sube tu página en un archivo comprimido (.zip) o elige una plantilla profesional de nuestro catálogo: landing comercial, portafolio de trabajo o sitio de documentación."
            />
            <StepCard
              number="02"
              icon={ShieldCheck}
              title="2. Codrop lo Prepara al Instante"
              description="Asignamos un espacio exclusivo con su propia memoria y procesador garantizados para tu sitio. Nada de servidores compartidos donde la página de otro ralentice la tuya."
            />
            <StepCard
              number="03"
              icon={Globe}
              title="3. Comparte tu Enlace con el Mundo"
              description="Recibes al instante una dirección web directa para mostrar tu trabajo a clientes, reclutadores y amigos. Enciende, apaga o actualiza tu web con un solo clic."
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          SECCIÓN: BENEFICIOS CLAVE (VENTAJAS COMERCIALES)
      ====================================================== */}
      <section id="caracteristicas" className="py-24 bg-[#f8fbfc] border-t border-[#edf2f0]">
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-[0.16em] uppercase bg-brand-50 text-brand-700 border border-brand-100">
              <Award className="w-3.5 h-3.5 text-brand-500" />
              ¿Por qué elegir Codrop?
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-navy-900">
              La tranquilidad de que tu sitio siempre cargará rápido y seguro
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#64748b]">
              Construido para darte la máxima estabilidad. Diseñado para que tú te enfoques en hacer
              crecer tu proyecto, mientras nuestra plataforma mantiene tu web activa 24/7.
            </p>
          </div>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ArchitectureCard
              icon={Container}
              title="Recursos Exclusivos"
              subtitle="Cero Interrupciones"
              text="Cada proyecto cuenta con su propia memoria RAM y CPU reservadas. Si otros sitios reciben muchas visitas, el tuyo no se verá afectado jamás."
            />
            <ArchitectureCard
              icon={Lock}
              title="Protección Automática"
              subtitle="Seguridad Garantizada"
              text="Tus archivos quedan blindados contra modificaciones externas no autorizadas. Publica con la confianza de que tu sitio estará siempre a salvo."
            />
            <ArchitectureCard
              icon={Rocket}
              title="Plantillas en 1 Clic"
              subtitle="Listas para Usar"
              text="¿No tienes código preparado? Elige una plantilla moderna y comienza hoy mismo tu presencia digital sin escribir una sola línea de código."
            />
            <ArchitectureCard
              icon={Activity}
              title="Panel Claro y Simple"
              subtitle="Control Total"
              text="Visualiza fácilmente el estado de tu web, su velocidad y rendimiento en tiempo real a través de gráficos limpios y comprensibles."
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          SECCIÓN: PLANES Y SUSCRIPCIONES
      ====================================================== */}
      <section id="planes" className="py-24 bg-white border-t border-[#edf2f0]">
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-[0.16em] uppercase bg-brand-50 text-brand-700 border border-brand-100">
              <Zap className="w-3.5 h-3.5 text-brand-500" />
              Planes Transparentes
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-navy-900">
              Precios claros, sin sorpresas ni contratos forzosos
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#64748b]">
              Elige el plan que mejor se adapte a tu proyecto actual. Puedes empezar completamente
              gratis y mejorar tu suscripción en cualquier momento cuando lo necesites.
            </p>
          </div>

          <div className="mt-16 grid lg:grid-cols-3 gap-8 items-stretch">
            {/* PLAN FREE */}
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
                '0.25 vCPU dedicada para tu sitio',
                'Publicación fácil con archivo .zip',
                'Enlace público propio y directo',
                'Gráficos simples de actividad y consumo',
                'Protección de archivos garantizada',
              ]}
            />

            {/* PLAN DEVELOPER (DESTACADO) */}
            <PricingCard
              popular
              name="Developer"
              icon={Zap}
              price="9.99"
              period="/ mes"
              badge="El Más Elegido"
              description="El favorito de freelancers y profesionales que gestionan varios proyectos con mayor velocidad."
              buttonLabel="Elegir Developer"
              onAction={onRegister}
              features={[
                'Hasta 3 sitios web simultáneos',
                '256 MB RAM por sitio (Doble de potencia)',
                '0.50 vCPU dedicada para mayor velocidad',
                'Plantillas en 1 clic (Negocios, Portfolio, Docs)',
                'Monitoreo detallado y registro de visitas',
                'Pasarela de pago rápida y segura',
                'Comprobante digital inmediato para tus registros',
                'Mejora o cambia de plan cuando quieras',
              ]}
            />

            {/* PLAN PRO */}
            <PricingCard
              name="Pro"
              icon={Layers3}
              price="24.99"
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
          SECCIÓN: PREGUNTAS FRECUENTES (FAQ)
      ====================================================== */}
      <section id="faq" className="py-24 bg-[#f8fbfc] border-t border-[#edf2f0]">
        <div className="max-w-[980px] mx-auto px-6 lg:px-12">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-[0.16em] uppercase bg-brand-50 text-brand-700 border border-brand-100">
              <Users className="w-3.5 h-3.5 text-brand-500" />
              Resolvemos tus Dudas
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-navy-900">
              Preguntas Frecuentes
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#64748b]">
              Todo lo que necesitas saber antes de empezar a publicar tus sitios web con nosotros.
            </p>
          </div>

          <div className="mt-14 space-y-4">
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
          SECCIÓN: LLAMADO A LA ACCIÓN FINAL (CTA)
      ====================================================== */}
      <section className="py-20 bg-white border-t border-[#edf2f0] relative overflow-hidden">
        <img
          src={codropIsotipo}
          alt=""
          aria-hidden="true"
          className="absolute right-[-60px] top-1/2 -translate-y-1/2 w-[440px] opacity-[0.06] pointer-events-none select-none"
        />

        <div className="max-w-[1380px] mx-auto px-6 lg:px-12 relative z-10 text-center">
          <div className="max-w-3xl mx-auto bg-gradient-to-br from-[#f8fbfc] to-brand-50/40 border border-[#dfe7e4] rounded-[32px] p-10 sm:p-16 shadow-[0_20px_60px_rgba(40,181,134,0.08)]">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-navy-900">
              ¿Listo para ver tu proyecto en internet?
            </h2>
            <p className="mt-5 text-[17px] sm:text-[18px] leading-relaxed text-[#64748b] max-w-xl mx-auto">
              Crea tu cuenta gratuita hoy y publica tu primera página web en menos de 60 segundos.
              Sin tarjeta de crédito requerida para empezar.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={onRegister}
                className="w-full sm:w-auto h-[54px] px-9 rounded-[10px] bg-brand-500 hover:bg-brand-600 text-white text-[15px] font-bold shadow-[0_10px_25px_rgba(40,181,134,0.3)] flex items-center justify-center gap-3 transition duration-150 btn-tactile cursor-pointer"
              >
                Crear cuenta gratis
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onLogin}
                className="w-full sm:w-auto h-[54px] px-8 rounded-[10px] border border-[#d6dfdb] bg-white text-navy-900 hover:text-brand-600 text-[15px] font-semibold flex items-center justify-center transition duration-150 btn-tactile shadow-sm cursor-pointer"
              >
                Ya tengo una cuenta
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER PRINCIPAL
      ====================================================== */}
      <footer className="border-t border-[#edf2f0] bg-[#f8fbfc] py-16 text-navy-900">
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {/* Columna Marca */}
            <div className="col-span-2">
              <div className="flex items-center gap-3">
                <img
                  src={codropIsotipo}
                  alt="Codrop"
                  className="w-10 h-7 object-contain flex-shrink-0"
                />
                <span className="text-xl font-bold tracking-tight">
                  <span className="text-brand-500">Co</span>
                  <span className="text-navy-900">drop</span>
                </span>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-[#64748b] max-w-sm">
                La plataforma de alojamiento web rápido y accesible que convierte tus archivos
                en sitios en línea en cuestión de segundos.
              </p>
              <p className="mt-6 text-xs text-[#94a3b8]">
                &copy; {new Date().getFullYear()} Codrop Platform. Todos los derechos reservados.
              </p>
            </div>

            {/* Columna Navegación */}
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-navy-900">
                Plataforma
              </p>
              <ul className="mt-4 space-y-2.5 text-[14px] text-[#64748b]">
                <li>
                  <a href="#como-funciona" className="hover:text-brand-600 transition-colors">
                    Cómo funciona
                  </a>
                </li>
                <li>
                  <a href="#caracteristicas" className="hover:text-brand-600 transition-colors">
                    Características
                  </a>
                </li>
                <li>
                  <a href="#planes" className="hover:text-brand-600 transition-colors">
                    Planes y Precios
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-brand-600 transition-colors">
                    Preguntas frecuentes
                  </a>
                </li>
              </ul>
            </div>

            {/* Columna Acceso */}
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-navy-900">
                Tu Cuenta
              </p>
              <ul className="mt-4 space-y-2.5 text-[14px] text-[#64748b]">
                <li>
                  <button
                    type="button"
                    onClick={onLogin}
                    className="hover:text-brand-600 transition-colors cursor-pointer text-left"
                  >
                    Iniciar Sesión
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onRegister}
                    className="hover:text-brand-600 transition-colors cursor-pointer text-left"
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
   COMPONENTES AUXILIARES DE SECCIONES (DISEÑO LIMPIO)
========================================================= */

function StepCard({ number, icon: Icon, title, description }) {
  return (
    <div className="rounded-[22px] border border-[#dfe7e4] bg-[#fbfdfc] p-8 shadow-[0_10px_30px_rgba(23,40,56,0.03)] hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-[14px] bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-2xl font-black text-brand-200">{number}</span>
      </div>
      <h3 className="mt-6 text-xl font-bold tracking-tight text-navy-900">
        {title}
      </h3>
      <p className="mt-3 text-[14px] leading-relaxed text-[#64748b]">
        {description}
      </p>
    </div>
  );
}

function ArchitectureCard({ icon: Icon, title, subtitle, text }) {
  return (
    <div className="rounded-[20px] border border-[#dfe7e4] bg-white p-7 shadow-[0_8px_24px_rgba(23,40,56,0.03)] hover:shadow-md transition-shadow">
      <div className="w-11 h-11 rounded-[12px] bg-brand-50 flex items-center justify-center text-brand-600">
        <Icon className="w-5 h-5" />
      </div>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">
        {subtitle}
      </p>
      <h3 className="mt-1 text-lg font-bold tracking-tight text-navy-900">
        {title}
      </h3>
      <p className="mt-2.5 text-[13px] leading-relaxed text-[#64748b]">
        {text}
      </p>
    </div>
  );
}

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
      className={`relative rounded-[24px] p-8 flex flex-col justify-between transition-all duration-300 ${popular
        ? 'bg-white border-2 border-brand-500 shadow-[0_20px_50px_rgba(40,181,134,0.14)] lg:-translate-y-2'
        : 'bg-[#fbfdfc] border border-[#dfe7e4] shadow-[0_10px_30px_rgba(23,40,56,0.04)] hover:shadow-md'
        }`}
    >
      {popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-500 text-white text-[10px] font-black uppercase tracking-[0.16em] shadow-sm">
          {badge}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-[14px] bg-brand-50 flex items-center justify-center text-brand-600">
            <Icon className="w-6 h-6" />
          </div>
          {!popular && (
            <span className="text-[11px] font-bold text-[#64748b] bg-white border border-[#dfe7e4] px-2.5 py-1 rounded-full">
              {badge}
            </span>
          )}
        </div>

        <h3 className="mt-5 text-2xl font-bold tracking-tight text-navy-900">
          Plan {name}
        </h3>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-[38px] font-black tracking-tight text-navy-900">
            ${price}
          </span>
          <span className="text-xs font-semibold text-[#64748b]">
            USD {period}
          </span>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-[#64748b]">
          {description}
        </p>

        <div className="mt-6 pt-6 border-t border-[#edf2f0] space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Lo que incluye:
          </p>
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-[13px] text-[#475569]">
              <span className="w-4 h-4 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-2.5 h-2.5 stroke-[2.5]" />
              </span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-[#edf2f0]">
        <button
          type="button"
          onClick={onAction}
          className={`w-full h-[48px] rounded-[10px] text-[14px] font-semibold flex items-center justify-center gap-2 transition duration-150 btn-tactile cursor-pointer ${popular
            ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-[0_8px_20px_rgba(40,181,134,0.25)]'
            : 'bg-navy-900 hover:bg-navy-800 text-white'
            }`}
        >
          {buttonLabel}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function FaqItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="rounded-[18px] border border-[#dfe7e4] bg-white overflow-hidden transition-all shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 hover:bg-[#fafcfb] transition-colors cursor-pointer"
      >
        <span className="text-[15px] sm:text-[16px] font-bold text-navy-900">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-brand-600 flex-shrink-0 transition-transform duration-200 ease-emil-out ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-1 text-[14px] leading-relaxed text-[#64748b] border-t border-[#f1f5f3] animate-fade-in">
          {answer}
        </div>
      )}
    </div>
  );
}

function FeatureRow({ icon: Icon, text }) {
  return (
    <div className="group h-[48px] px-4 rounded-[10px] bg-brand-50 hover:bg-brand-100 flex items-center transition-colors">
      <Icon className="w-[18px] h-[18px] text-brand-600 flex-shrink-0" />
      <span className="ml-3 text-[13px] font-semibold text-brand-700">
        {text}
      </span>
      <ArrowRight className="ml-auto w-3.5 h-3.5 text-brand-600 transition-transform group-hover:translate-x-0.5" />
    </div>
  );
}

function Benefit({ children }) {
  return (
    <div className="flex items-center gap-2">
      <Check className="w-4 h-4 text-brand-500 stroke-[2.5]" />
      <span>{children}</span>
    </div>
  );
}

function DotGrid({ className = '' }) {
  const dots = Array.from({ length: 20 });

  return (
    <div
      className={`
        grid
        grid-cols-5
        gap-[9px]
        opacity-30
        pointer-events-none
        ${className}
      `}
    >
      {dots.map((_, index) => (
        <span
          key={index}
          className="w-[3px] h-[3px] rounded-full bg-brand-500"
        />
      ))}
    </div>
  );
}
