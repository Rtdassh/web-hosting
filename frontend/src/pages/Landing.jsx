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
} from 'lucide-react';

import codropIsotipo from '../assets/codrop-isotipo.png';
import PublicNavbar from '../components/layout/PublicNavbar';

export default function Landing({ onLogin, onRegister }) {
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

        {/* Cuadrícula técnica de fondo */}
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
                Sube tu proyecto en un archivo .zip o selecciona una plantilla en 1 clic.
                Codrop asigna un puerto TCP y levanta un contenedor Nginx dedicado en menos de 5 segundos.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={onRegister}
                  className="h-[50px] px-7 rounded-[9px] bg-brand-500 hover:bg-brand-600 text-white text-[15px] font-semibold shadow-[0_10px_25px_rgba(40,181,134,0.28)] flex items-center justify-center gap-3 transition-colors"
                >
                  Comenzar gratis
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#planes"
                  className="h-[50px] px-7 rounded-[9px] border border-[#d6dfdb] hover:border-[#b9d8ca] bg-white text-navy-900 hover:text-brand-600 text-[15px] font-semibold flex items-center justify-center transition-colors shadow-sm"
                >
                  Ver planes y cuotas
                </a>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-6 text-[13px] text-[#64748b]">
                <Benefit>Contenedores nginx:alpine aislados</Benefit>
                <Benefit>Protección Anti-Zip Slip</Benefit>
                <Benefit>Puertos dinámicos dedicados</Benefit>
              </div>
            </div>

            {/* Lado Derecho: Tarjeta Preview */}
            <div className="relative">
              <div className="relative bg-white/95 backdrop-blur-sm border border-[#dfe7e4] rounded-[22px] p-8 shadow-[0_24px_70px_rgba(23,40,56,0.09)] overflow-hidden">
                <div className="absolute top-0 right-0 w-[58px] h-[58px] bg-brand-100 rounded-bl-[58px]" />

                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-[64px] h-[64px] rounded-[14px] bg-brand-50 flex items-center justify-center">
                    <img
                      src={codropIsotipo}
                      alt="Codrop Logo"
                      className="w-[58px] h-[48px] object-contain"
                    />
                  </div>

                  <div>
                    <p className="text-[12px] tracking-[0.18em] font-bold text-brand-600">
                      CODE + DROP
                    </p>
                    <p className="mt-1 text-[13px] text-[#64748b]">
                      Sube. Despliega. Comparte.
                    </p>
                  </div>
                </div>

                <h2 className="mt-7 text-[28px] sm:text-[31px] leading-[1.12] font-bold tracking-[-0.03em] text-navy-900">
                  Tu sitio estático,
                  <br />
                  listo en producción
                </h2>

                <p className="mt-4 max-w-[420px] text-[14px] leading-6 text-[#64748b]">
                  Todo lo necesario para publicar y administrar tus instancias web estáticas
                  desde un panel de control desacoplado y en tiempo real.
                </p>

                <div className="mt-7 space-y-3">
                  <FeatureRow icon={Upload} text="Despliegue con archivo .ZIP" />
                  <FeatureRow icon={Rocket} text="Plantillas rápidas en 1 clic" />
                  <FeatureRow icon={Container} text="Contenedores Nginx con montaje :ro" />
                  <FeatureRow icon={Activity} text="Telemetría en vivo de CPU y RAM" />
                  <FeatureRow icon={FileText} text="Visor de logs en tiempo real" />
                </div>

                <div className="mt-7 pt-6 border-t border-[#eef2f1]">
                  <button
                    type="button"
                    onClick={onRegister}
                    className="w-full h-[50px] rounded-[10px] bg-brand-50 hover:bg-brand-100 text-brand-700 text-[14px] font-semibold flex items-center justify-center gap-3 transition-colors"
                  >
                    Crear cuenta en Codrop
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECCIÓN: CÓMO FUNCIONA (THE CORE PIPELINE)
      ====================================================== */}
      <section id="como-funciona" className="py-24 bg-white border-t border-[#edf2f0]">
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-[0.16em] uppercase bg-brand-50 text-brand-700 border border-brand-100">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              Pipeline Operativo
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-navy-900">
              Tres pasos para pasar de tu código a una URL en vivo
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#64748b]">
              Diseñado bajo el principio de menor esfuerzo: empaquetas tu aplicación web o seleccionas
              una plantilla prediseñada y el backend automatiza toda la infraestructura.
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <StepCard
              number="01"
              icon={Upload}
              title="1. Carga o Elige Plantilla"
              description="Empaqueta tus archivos estáticos (HTML5, CSS3, JS, React/Vite builds) en un archivo .zip de hasta 25 MB con index.html en la raíz, o elige una plantilla prediseñada en 1 clic."
            />
            <StepCard
              number="02"
              icon={ShieldCheck}
              title="2. Aprovisionamiento Aislado"
              description="El backend aplica verificación Anti-Zip Slip, asigna un puerto TCP libre del pool 30001-30100 e invoca a Docker Engine para instanciar nginx:alpine con límites cgroups y volumen de solo lectura (:ro)."
            />
            <StepCard
              number="03"
              icon={Globe}
              title="3. Consumo y Observabilidad"
              description="Obtienes de inmediato una URL directa accesible. Desde tu panel controlas el ciclo de vida (Start, Stop, Restart, Destroy), monitoreas telemetría de CPU/RAM y consultas logs."
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          SECCIÓN: CARACTERÍSTICAS TÉCNICAS (SYSTEM DESIGN)
      ====================================================== */}
      <section id="caracteristicas" className="py-24 bg-[#f8fbfc] border-t border-[#edf2f0]">
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-[0.16em] uppercase bg-brand-50 text-brand-700 border border-brand-100">
              <Cpu className="w-3.5 h-3.5 text-brand-500" />
              Arquitectura del PaaS
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-navy-900">
              Ingeniería confiable, confinamiento estricto y alto rendimiento
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#64748b]">
              Cumplimiento riguroso de principios de seguridad en profundidad, aislamiento multi-tenant
              sin virtual hosts compartidos y apego a la norma de calidad ISO/IEC 25010.
            </p>
          </div>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ArchitectureCard
              icon={Container}
              title="Aislamiento Multi-Tenant"
              subtitle="Docker Engine API"
              text="Cada usuario dispone de contenedores independientes nginx:1.27-alpine. Prohibidos los Virtual Hosts compartidos para evitar el problema de Noisy Neighbor."
            />
            <ArchitectureCard
              icon={Lock}
              title="Seguridad por Diseño"
              subtitle="Anti-Zip Slip + :ro"
              text="Sanitización canónica de rutas antes de descomprimir. Los artefactos se montan en modo solo lectura impidiendo escrituras en tiempo de ejecución."
            />
            <ArchitectureCard
              icon={Activity}
              title="Límites Duros (cgroups)"
              subtitle="Control del Kernel"
              text="Cada contenedor tiene límites asignados de memoria RAM (hasta 512 MB) y cuotas de vCPU para garantizar disponibilidad y consumo predecible."
            />
            <ArchitectureCard
              icon={Terminal}
              title="Observabilidad Activa"
              subtitle="Logs & Telemetría"
              text="Muestreo en tiempo real de porcentaje de CPU y memoria RAM desde los sockets de Docker, junto con acceso instantáneo a las últimas 100 líneas de logs."
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
              Catálogo Comercial
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-navy-900">
              Planes transparentes diseñados para cada etapa
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#64748b]">
              Comienza con el plan gratuito al registrarte y escala recursos según crezcan tus proyectos.
              Pasarela de pago simulada con validación matemática de Luhn.
            </p>
          </div>

          <div className="mt-16 grid lg:grid-cols-3 gap-8 items-stretch">
            {/* PLAN FREE */}
            <PricingCard
              name="Free"
              icon={Server}
              price="0"
              period="/ mes"
              badge="Acceso Inicial"
              description="La base perfecta para experimentar, aprender y desplegar tu primer sitio web sin ningún costo."
              buttonLabel="Comenzar con Free"
              onAction={onRegister}
              features={[
                '1 sitio web activo simultáneo',
                '128 MB RAM por contenedor',
                '0.25 vCPU dedicada',
                'Despliegues mediante archivo .zip',
                'Puerto dinámico TCP dedicado (30001-30100)',
                'Telemetría básica de CPU y memoria',
                'Montaje seguro en solo lectura (:ro)',
              ]}
            />

            {/* PLAN DEVELOPER (DESTACADO) */}
            <PricingCard
              popular
              name="Developer"
              icon={Zap}
              price="9.99"
              period="/ mes"
              badge="Recomendado"
              description="El equilibrio ideal para desarrolladores y profesionales que mantienen varios proyectos web activos."
              buttonLabel="Elegir Developer"
              onAction={onRegister}
              features={[
                'Hasta 3 sitios web simultáneos',
                '256 MB RAM por contenedor',
                '0.50 vCPU dedicada',
                'Plantillas en 1 clic (Landing, Portfolio, Docs)',
                'Visor de logs Nginx en tiempo real (100 líneas)',
                'Contratación simulada con Algoritmo de Luhn',
                'Comprobante digital inmediato y facturas',
                'Soporte para actualización y downgrade de plan',
              ]}
            />

            {/* PLAN PRO */}
            <PricingCard
              name="Pro"
              icon={Layers3}
              price="24.99"
              period="/ mes"
              badge="Mayor Capacidad"
              description="Máxima concurrencia y límites extendidos para proyectos exigentes, agencias y equipos de trabajo."
              buttonLabel="Elegir Pro"
              onAction={onRegister}
              features={[
                'Hasta 10 sitios web simultáneos',
                '512 MB RAM por contenedor',
                '1.00 vCPU dedicada',
                'Plantillas rápidas en 1 clic ilimitadas',
                'Telemetría completa de contenedor y host',
                'Visor avanzado de logs de acceso y errores',
                'Prioridad máxima en contención cgroups',
                'Historial financiero e inmutabilidad de recibos',
              ]}
            />
          </div>

          {/* Nota sobre pasarela académica */}
          <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-brand-100 bg-brand-50/60 p-5 flex items-start gap-4">
            <ShieldCheck className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
            <div className="text-[13px] leading-relaxed text-[#475569]">
              <strong className="text-navy-900 font-semibold">
                Pasarela de pagos académica simulada (RF-09):
              </strong>{' '}
              Codrop no procesa dinero real ni requiere tarjetas de crédito comerciales. La validación
              sintáctica se realiza mediante el Algoritmo de Luhn (Módulo 10) en cliente y backend, emitiendo
              comprobantes digitales y códigos de autorización simulados.
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECCIÓN: PREGUNTAS FRECUENTES (FAQ)
      ====================================================== */}
      <section id="faq" className="py-24 bg-[#f8fbfc] border-t border-[#edf2f0]">
        <div className="max-w-[980px] mx-auto px-6 lg:px-12">
          <div className="text-center max-w-xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-[0.16em] uppercase bg-brand-50 text-brand-700 border border-brand-100">
              <Clock className="w-3.5 h-3.5 text-brand-500" />
              Resolución de Dudas
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-navy-900">
              Preguntas Frecuentes
            </h2>
            <p className="mt-4 text-[16px] text-[#64748b]">
              Todo lo que necesitas saber sobre el funcionamiento de Codrop y el despliegue de sitios.
            </p>
          </div>

          <div className="mt-14 space-y-4">
            <FaqItem
              index={0}
              isOpen={openFaqIndex === 0}
              onToggle={() => toggleFaq(0)}
              question="¿Qué tipos de sitios web y tecnologías puedo alojar en Codrop?"
              answer="Codrop está optimizado para sitios web estáticos y Single Page Applications (SPAs). Puedes publicar código HTML5, CSS3, JavaScript nativo, y compilaciones de producción generadas por frameworks modernos como React, Vite, Vue, Svelte, Astro o Next.js exportado estáticamente. El único requisito es que el paquete .zip contenga un archivo index.html en su raíz."
            />
            <FaqItem
              index={1}
              isOpen={openFaqIndex === 1}
              onToggle={() => toggleFaq(1)}
              question="¿Cómo se asegura el aislamiento y la seguridad entre usuarios?"
              answer="Cada instancia opera dentro de un contenedor Docker dedicado basado en la imagen oficial nginx:1.27-alpine. Los artefactos del usuario se montan con el modificador de solo lectura (:ro), impidiendo escrituras no autorizadas en el contenedor. Además, el backend ejecuta una validación estricta Anti-Zip Slip antes de descomprimir cualquier archivo para bloquear intentos de directory traversal hacia el host."
            />
            <FaqItem
              index={2}
              isOpen={openFaqIndex === 2}
              onToggle={() => toggleFaq(2)}
              question="¿Cómo funciona la pasarela de pagos simulada con Algoritmo de Luhn?"
              answer="Para suscribirte a los planes Developer o Pro, el sistema solicita un número de tarjeta y verifica matemáticamente su validez aplicando el Algoritmo de Luhn (Módulo 10). La validación ocurre tanto en tiempo real en la interfaz como en el backend. Si el checksum es correcto y la tarjeta no ha expirado, se genera un comprobante digital con código de autorización simulado (AUTH-XXXXXX) y se actualiza la cuota sin transferencias de dinero real."
            />
            <FaqItem
              index={3}
              isOpen={openFaqIndex === 3}
              onToggle={() => toggleFaq(3)}
              question="¿Puedo realizar Upgrade o Downgrade de mi plan en cualquier momento?"
              answer="Sí. Desde el panel de suscripciones puedes mejorar tu plan (Upgrade) para obtener más sitios y memoria de forma inmediata. Si solicitas un Downgrade (por ejemplo, de Pro a Developer) y tienes más instancias activas de las que admite la nueva cuota, el sistema bloqueará preventivamente la operación y te pedirá detener o eliminar las instancias excedentes para garantizar la integridad de tus recursos."
            />
            <FaqItem
              index={4}
              isOpen={openFaqIndex === 4}
              onToggle={() => toggleFaq(4)}
              question="¿Qué son las plantillas en 1 clic y cómo se diferencian de subir un .zip?"
              answer="Las plantillas en 1 clic son proyectos estáticos prediseñados y preconfigurados (como Landing Pages de negocios, Portafolios de desarrollador y Documentación técnica) almacenados internamente en el host. Permiten levantar una instancia funcional en menos de 5 segundos sin necesidad de que compiles, empaquetes o subas un archivo desde tu máquina."
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          BANNER FINAL / CTA
      ====================================================== */}
      <section className="py-20 bg-navy-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-[1380px] mx-auto px-6 lg:px-12 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-100 text-[11px] font-bold tracking-[0.16em] uppercase">
            <Rocket className="w-3.5 h-3.5 text-brand-500" />
            Empieza Ahora
          </div>

          <h2 className="mt-5 text-3xl sm:text-5xl font-bold tracking-[-0.03em] max-w-3xl mx-auto">
            Publica tus sitios web hoy mismo en una plataforma dedicada
          </h2>

          <p className="mt-5 text-[17px] text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Sin configuraciones complejas de servidores, sin terminales confusas.
            Solo tu código en un .zip y un clic para ponerlo en producción.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              type="button"
              onClick={onRegister}
              className="h-[52px] px-8 rounded-[10px] bg-brand-500 hover:bg-brand-600 text-white text-[15px] font-bold shadow-[0_12px_30px_rgba(40,181,134,0.35)] flex items-center justify-center gap-3 transition-colors"
            >
              Crear cuenta gratuita
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onLogin}
              className="h-[52px] px-8 rounded-[10px] bg-navy-800 hover:bg-navy-700 border border-white/10 text-white text-[15px] font-semibold transition-colors"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER COMPLETO
      ====================================================== */}
      <footer className="bg-white border-t border-[#e2e8f0] py-12">
        <div className="max-w-[1380px] mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-4 gap-8 pb-10 border-b border-[#edf2f0]">
            {/* Columna Marca */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                <img
                  src={codropIsotipo}
                  alt="Codrop Logo"
                  className="w-[50px] h-[34px] object-contain"
                />
                <span className="text-[20px] font-bold tracking-[-0.02em]">
                  <span className="text-brand-500">Co</span>
                  <span className="text-navy-900">drop</span>
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-6 text-[#64748b] max-w-md">
                Plataforma como Servicio (PaaS) de Web Hosting para el aprovisionamiento automatizado,
                aislamiento de contenedores Nginx y control integral del ciclo de vida de aplicaciones web estáticas.
              </p>
            </div>

            {/* Columna Navegación */}
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-navy-900 mb-3">
                Plataforma
              </p>
              <ul className="space-y-2 text-[13px] text-[#64748b]">
                <li>
                  <a href="#como-funciona" className="hover:text-brand-600 transition-colors">
                    Cómo funciona
                  </a>
                </li>
                <li>
                  <a href="#caracteristicas" className="hover:text-brand-600 transition-colors">
                    Arquitectura y seguridad
                  </a>
                </li>
                <li>
                  <a href="#planes" className="hover:text-brand-600 transition-colors">
                    Planes y cuotas
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-brand-600 transition-colors">
                    Preguntas frecuentes
                  </a>
                </li>
              </ul>
            </div>

            {/* Columna Sistema */}
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-navy-900 mb-3">
                Especificación Técnica
              </p>
              <ul className="space-y-2 text-[13px] text-[#64748b]">
                <li>FastAPI + Python 3.11+</li>
                <li>PostgreSQL 16 Relacional</li>
                <li>Docker Engine + cgroups</li>
                <li>nginx:1.27-alpine (:ro)</li>
                <li>Pool dinámico TCP 30001-30100</li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#64748b]">
            <span>
              <strong className="font-semibold text-navy-900">Codrop</strong> • CloudPaaS Web Hosting Platform
            </span>
            <span>
              De tu código a la web, sin complicaciones.
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* =====================================================
    SUB-COMPONENTES MODULARES DE LA LANDING
====================================================== */

function StepCard({ number, icon: Icon, title, description }) {
  return (
    <div className="relative rounded-[22px] border border-[#dfe7e4] bg-[#fbfdfc] p-8 shadow-[0_10px_30px_rgba(23,40,56,0.04)] hover:shadow-[0_16px_40px_rgba(23,40,56,0.08)] transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className="w-12 h-12 rounded-[14px] bg-brand-50 flex items-center justify-center text-brand-600">
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-[28px] font-black tracking-tight text-brand-100">
          {number}
        </span>
      </div>
      <h3 className="text-xl font-bold tracking-tight text-navy-900">
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
    <div className="rounded-[20px] border border-[#dfe7e4] bg-white p-6 shadow-sm hover:border-brand-100 hover:shadow-md transition-all">
      <div className="w-11 h-11 rounded-[12px] bg-brand-50 flex items-center justify-center text-brand-600 mb-4">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-600">
        {subtitle}
      </p>
      <h3 className="mt-1 text-base font-bold text-navy-900">
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
      className={`relative rounded-[24px] p-8 flex flex-col justify-between transition-all duration-300 ${
        popular
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
            Recursos asignados:
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
          className={`w-full h-[48px] rounded-[10px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors ${
            popular
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
        className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 hover:bg-[#fafcfb] transition-colors"
      >
        <span className="text-[15px] sm:text-[16px] font-bold text-navy-900">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-brand-600 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-1 text-[14px] leading-relaxed text-[#64748b] border-t border-[#f1f5f3]">
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
