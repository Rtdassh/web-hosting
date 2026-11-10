import React from 'react';
import {
  Activity,
  Award,
  Container,
  Lock,
  Rocket,
} from 'lucide-react';

export default function Features() {
  return (
    <section
      id="caracteristicas"
      className="border-t border-[#edf2f0] bg-[#f8fbfc] py-24"
    >
      <div className="mx-auto max-w-[1380px] px-6 lg:px-12">

        <div className="max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-[14px] font-bold uppercase tracking-[0.14em] text-brand-700">
            <Award className="h-4 w-4 text-brand-500" />
            ¿Por qué elegir Codrop?
          </span>

          <h2 className="mt-5 max-w-4xl text-[34px] font-bold leading-tight tracking-[-0.03em] text-navy-900 sm:text-[42px] lg:text-[46px]">
            La tranquilidad de que tu sitio siempre cargará rápido y seguro
          </h2>

          <p className="mt-5 max-w-3xl text-[18px] leading-8 text-[#64748b] sm:text-[20px]">
            Construido para darte la máxima estabilidad. Diseñado para que tú
            te enfoques en hacer crecer tu proyecto, mientras nuestra plataforma
            mantiene tu web activa 24/7.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

          <FeatureCard
            icon={Container}
            title="Recursos Exclusivos"
            subtitle="Cero Interrupciones"
            text="Cada proyecto cuenta con su propia memoria RAM y CPU reservadas. Si otros sitios reciben muchas visitas, el tuyo no se verá afectado jamás."
          />

          <FeatureCard
            icon={Lock}
            title="Protección Automática"
            subtitle="Seguridad Garantizada"
            text="Tus archivos quedan blindados contra modificaciones externas no autorizadas. Publica con la confianza de que tu sitio estará siempre a salvo."
          />

          <FeatureCard
            icon={Rocket}
            title="Plantillas en 1 Clic"
            subtitle="Listas para Usar"
            text="¿No tienes código preparado? Elige una plantilla moderna y comienza hoy mismo tu presencia digital sin escribir una sola línea de código."
          />

          <FeatureCard
            icon={Activity}
            title="Panel Claro y Simple"
            subtitle="Control Total"
            text="Visualiza fácilmente el estado de tu web, su velocidad y rendimiento en tiempo real a través de gráficos limpios y comprensibles."
          />

        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  subtitle,
  text,
}) {
  return (
    <div className="rounded-[20px] border border-[#dfe7e4] bg-white p-7 shadow-sm transition-all hover:border-brand-100 hover:shadow-md">

      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[14px] bg-brand-50 text-brand-600">
        <Icon className="h-7 w-7" />
      </div>

      <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-600">
        {subtitle}
      </p>

      <h3 className="mt-2 text-[21px] font-bold leading-snug text-navy-900">
        {title}
      </h3>

      <p className="mt-3 text-[16px] leading-7 text-[#64748b]">
        {text}
      </p>

    </div>
  );
}