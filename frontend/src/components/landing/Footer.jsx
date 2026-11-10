import React from 'react';

import codropIsotipo from '../../assets/codrop-isotipo.png';

export default function Footer() {
  return (
    <footer className="border-t border-[#e2e8f0] bg-white py-14">
      <div className="mx-auto max-w-[1380px] px-6 lg:px-12">

        <div className="grid gap-10 border-b border-[#edf2f0] pb-12 md:grid-cols-4">

          {/* Marca */}
          <div className="md:col-span-2">

            <div className="flex items-center gap-3">
              <img
                src={codropIsotipo}
                alt="Codrop Logo"
                className="h-[40px] w-[58px] object-contain"
              />

              <span className="text-[24px] font-bold tracking-[-0.02em]">
                <span className="text-brand-500">
                  Co
                </span>

                <span className="text-navy-900">
                  drop
                </span>
              </span>
            </div>

            <p className="mt-4 max-w-xl text-[16px] leading-7 text-[#64748b] sm:text-[17px]">
              La plataforma de web hosting moderna que automatiza la publicación
              y gestión de tus páginas web. De tu código a internet en segundos,
              con total seguridad y control.
            </p>

          </div>

          {/* Navegación */}
          <div>

            <p className="mb-4 text-[14px] font-bold uppercase tracking-[0.13em] text-navy-900">
              Explorar
            </p>

            <ul className="space-y-3 text-[16px] text-[#64748b]">
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
                  Ventajas y seguridad
                </a>
              </li>

              <li>
                <a
                  href="#planes"
                  className="transition-colors hover:text-brand-600"
                >
                  Planes y precios
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

          {/* Garantías */}
          <div>

            <p className="mb-4 text-[14px] font-bold uppercase tracking-[0.13em] text-navy-900">
              Garantías
            </p>

            <ul className="space-y-3 text-[16px] leading-7 text-[#64748b]">
              <li>
                Recursos dedicados por sitio
              </li>

              <li>
                Protección contra modificaciones
              </li>

              <li>
                Publicación en menos de 5 segundos
              </li>

              <li>
                Sin cobros forzosos ni letras pequeñas
              </li>

              <li>
                Comprobantes digitales al instante
              </li>
            </ul>

          </div>

        </div>

        {/* Parte inferior */}
        <div className="flex flex-col items-center justify-between gap-4 pt-7 text-center text-[14px] leading-6 text-[#64748b] sm:flex-row sm:text-left sm:text-[15px]">

          <span>
            <strong className="font-semibold text-navy-900">
              Codrop
            </strong>{' '}
            • Tu plataforma de hosting web
          </span>

          <span>
            De tu código a la web, sin complicaciones.
          </span>

        </div>

      </div>
    </footer>
  );
}