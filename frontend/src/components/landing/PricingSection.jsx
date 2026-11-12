import React from 'react';
import {
  ArrowRight,
  Check,
  Layers3,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function PricingSection({ onRegister }) {
  return (
    <section
      id="planes"
      className="border-t border-[#edf2f0] bg-white py-24"
    >
      <div className="mx-auto max-w-[1380px] px-6 lg:px-12">

        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-[14px] font-bold uppercase tracking-[0.14em] text-brand-700">
            <Zap className="h-4 w-4 text-brand-500" />
            Planes Transparentes
          </span>

          <h2 className="mt-5 text-[34px] font-bold leading-tight tracking-[-0.03em] text-navy-900 sm:text-[42px] lg:text-[46px]">
            Precios claros, sin sorpresas ni contratos forzosos
          </h2>

          <p className="mt-5 text-[18px] leading-8 text-[#64748b] sm:text-[20px]">
            Elige el plan que mejor se adapte a tu proyecto actual.
            Puedes empezar completamente gratis y mejorar tu suscripción
            en cualquier momento cuando lo necesites.
          </p>
        </div>

        <div className="mt-16 grid items-stretch gap-8 lg:grid-cols-3">

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

          <PricingCard
            name="Pro"
            icon={Layers3}
            price="24.99"
            period="/ mes"
            badge="Máxima Capacidad"
            description="Diseñado para negocios, agencias y sitios con alta afluencia que demandan la máxima velocidad."
            buttonLabel="Elegir Pro"
            onAction={onRegister}
            features={[
              'Hasta 10 sitios web simultáneos',
              '512 MB RAM por sitio (Máxima potencia)',
              '1.00 vCPU completa dedicada por sitio',
              'Acceso ilimitado a todas las plantillas en 1 clic',
              'Prioridad máxima de recursos y velocidad de carga',
              'Monitoreo avanzado de visitas y rendimiento',
              'Historial completo de pagos y recibos digitales',
              'Control administrativo preferencial',
            ]}
          />

        </div>

        <div className="mx-auto mt-12 flex max-w-4xl items-start gap-4 rounded-2xl border border-brand-100 bg-brand-50/70 p-6">

          <ShieldCheck className="mt-0.5 h-6 w-6 flex-shrink-0 text-brand-600" />

          <div className="text-[16px] leading-7 text-[#475569] sm:text-[17px]">
            <strong className="font-semibold text-navy-900">
              Suscripción rápida y segura:
            </strong>{' '}
            En Codrop procesamos tu suscripción de manera inmediata con
            validación segura en tiempo real. Activa funciones premium y
            recibe tus comprobantes digitales al instante.
          </div>

        </div>

      </div>
    </section>
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
      className={`relative flex flex-col justify-between rounded-[24px] p-8 transition-all duration-300 ${
        popular
          ? 'border-2 border-brand-500 bg-white shadow-[0_20px_50px_rgba(40,181,134,0.14)] lg:-translate-y-2'
          : 'border border-[#dfe7e4] bg-[#fbfdfc] shadow-[0_10px_30px_rgba(23,40,56,0.04)] hover:shadow-md'
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-5 py-1.5 text-[12px] font-black uppercase tracking-[0.14em] text-white shadow-sm">
          {badge}
        </div>
      )}

      <div>

        <div className="flex items-center justify-between">

          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-brand-50 text-brand-600">
            <Icon className="h-7 w-7" />
          </div>

          {!popular && (
            <span className="rounded-full border border-[#dfe7e4] bg-white px-3 py-1.5 text-[13px] font-bold text-[#64748b]">
              {badge}
            </span>
          )}

        </div>

        <h3 className="mt-6 text-[28px] font-bold tracking-tight text-navy-900">
          Plan {name}
        </h3>

        <div className="mt-4 flex items-baseline gap-2">

          <span className="text-[46px] font-black tracking-tight text-navy-900">
            ${price}
          </span>

          <span className="text-[15px] font-semibold text-[#64748b]">
            USD {period}
          </span>

        </div>

        <p className="mt-4 text-[16px] leading-7 text-[#64748b]">
          {description}
        </p>

        <div className="mt-7 space-y-3.5 border-t border-[#edf2f0] pt-7">

          <p className="text-[13px] font-bold uppercase tracking-[0.13em] text-[#94a3b8]">
            Lo que incluye:
          </p>

          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-3 text-[15px] leading-6 text-[#475569]"
            >
              <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Check className="h-3 w-3 stroke-[2.5]" />
              </span>

              <span>
                {feature}
              </span>
            </div>
          ))}

        </div>

      </div>

      <div className="mt-9 border-t border-[#edf2f0] pt-7">

        <button
          type="button"
          onClick={onAction}
          className={`btn-tactile flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] text-[16px] font-semibold transition duration-150 ${
            popular
              ? 'bg-brand-500 text-white shadow-[0_8px_20px_rgba(40,181,134,0.25)] hover:bg-brand-600'
              : 'bg-navy-900 text-white hover:bg-navy-800'
          }`}
        >
          {buttonLabel}
          <ArrowRight className="h-5 w-5" />
        </button>

      </div>

    </div>
  );
}