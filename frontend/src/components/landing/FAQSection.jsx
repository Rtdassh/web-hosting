import React, { useState } from 'react';
import {
  ChevronDown,
  Clock,
} from 'lucide-react';

export default function FAQSection() {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const toggleFaq = (index) => {
    setOpenFaqIndex((previousIndex) =>
      previousIndex === index ? null : index
    );
  };

  const faqs = [
    {
      question:
        '¿Necesito ser un experto en programación o servidores para usar Codrop?',
      answer:
        'No, en lo absoluto. Codrop fue pensado para personas que buscan rapidez y simplicidad. Si tienes una página web en archivos HTML/CSS/JS o generada con herramientas como React, Vite o WordPress estático, solo la guardas en un archivo .zip y la subes. O mejor aún: puedes hacer clic en una de nuestras plantillas y tendrás una página lista en menos de un minuto.',
    },
    {
      question:
        '¿Qué diferencia a Codrop de un hosting tradicional compartido?',
      answer:
        'En un hosting tradicional, cientos de páginas comparten la misma memoria y procesador; si una página tiene muchas visitas, las demás se caen o se vuelven lentas. En Codrop, cada proyecto que publicas recibe su propio espacio y recursos exclusivos garantizados. Tu web siempre cargará a máxima velocidad, sin importar lo que hagan otros usuarios.',
    },
    {
      question:
        '¿Cómo funciona el proceso de pago y suscripción?',
      answer:
        'Para suscribirte a los planes Developer o Pro, nuestro sistema verifica al instante los datos de tu tarjeta de crédito o débito con los más altos estándares de validación. Al confirmarse la operación, tu cuenta se actualiza de inmediato y recibes un comprobante digital con código de autorización.',
    },
    {
      question:
        '¿Puedo cambiar de plan o cancelar cuando lo desee?',
      answer:
        'Sí, tienes total libertad. Si tu proyecto crece y necesitas más páginas o memoria, puedes mejorar tu suscripción en un clic. Si deseas bajar de plan o volver al gratuito, el sistema te avisará de forma preventiva para que elijas qué sitios mantener activos antes de aplicar el cambio.',
    },
    {
      question:
        '¿Qué son las plantillas en 1 clic y para qué me sirven?',
      answer:
        'Son páginas web profesionales ya diseñadas y preparadas para publicarse al instante. Si aún no tienes un sitio programado, puedes elegir entre una Landing Page comercial para presentar tu negocio, un Portafolio personal para tus servicios o una página de Documentación. Haces un clic y tu web ya está disponible con su enlace propio.',
    },
  ];

  return (
    <section
      id="faq"
      className="border-t border-[#edf2f0] bg-[#f8fbfc] py-24"
    >
      <div className="mx-auto max-w-[1080px] px-6 lg:px-12">

        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-[14px] font-bold uppercase tracking-[0.14em] text-brand-700">
            <Clock className="h-4 w-4 text-brand-500" />
            Resolvemos tus Dudas
          </span>

          <h2 className="mt-5 text-[34px] font-bold leading-tight tracking-[-0.03em] text-navy-900 sm:text-[42px] lg:text-[46px]">
            Preguntas Frecuentes
          </h2>

          <p className="mt-5 text-[18px] leading-8 text-[#64748b] sm:text-[20px]">
            Todo lo que necesitas saber antes de comenzar a publicar tus
            páginas con Codrop.
          </p>
        </div>

        <div className="mt-14 space-y-4">
          {faqs.map((faq, index) => (
            <FaqItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              isOpen={openFaqIndex === index}
              onToggle={() => toggleFaq(index)}
            />
          ))}
        </div>

      </div>
    </section>
  );
}

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