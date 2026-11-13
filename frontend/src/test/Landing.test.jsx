import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Landing from '../pages/Landing';

describe('Landing Page UI Component', () => {
  it('recomienda un plan por cantidad de sitios y enlaza a su detalle sin iniciar el registro', () => {
    const onRegister = vi.fn();
    render(<Landing onRegister={onRegister} />);

    const recommendation = screen.getByRole('status');
    expect(within(recommendation).getByText('Free')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Hasta 3 proyectos' }));
    expect(within(recommendation).getByText('Developer')).toBeInTheDocument();
    expect(within(recommendation).getByText(/3 sitios · 256 MB/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver este plan' })).toHaveAttribute('href', '#landing-plan-developer');

    fireEvent.click(screen.getByRole('radio', { name: 'Hasta 10 proyectos' }));
    expect(within(recommendation).getByText('Pro')).toBeInTheDocument();
    expect(within(recommendation).getByText(/10 sitios · 512 MB/)).toBeInTheDocument();
    const target = screen.getByRole('link', { name: 'Ver este plan' }).getAttribute('href').slice(1);
    expect(document.getElementById(target)).toHaveTextContent('Plan Pro');
    expect(onRegister).not.toHaveBeenCalled();
  });

  it('debe renderizar el encabezado principal y propuesta de valor', () => {
    render(<Landing onLogin={vi.fn()} onRegister={vi.fn()} />);

    expect(
      screen.getByRole('heading', { level: 1, name: /De tu código a la web/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tu proyecto entra como \.zip y sale como URL pública/i)
    ).toBeInTheDocument();
  });

  it('debe exhibir la sección de cómo funciona con pasos claros', () => {
    render(<Landing onLogin={vi.fn()} onRegister={vi.fn()} />);

    expect(screen.getByText('Sencillo y Veloz')).toBeInTheDocument();
    expect(screen.getByText(/Tres pasos simples para tener tu página web funcionando/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Carga o Elige Plantilla/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Codrop lo Prepara al Instante/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Comparte tu Enlace con el Mundo/i)).toBeInTheDocument();
  });

  it('debe exhibir las 3 opciones de planes con sus límites y precios', () => {
    render(<Landing onLogin={vi.fn()} onRegister={vi.fn()} />);

    expect(screen.getByText('Plan Free')).toBeInTheDocument();
    expect(screen.getByText('Plan Developer')).toBeInTheDocument();
    expect(screen.getByText('Plan Pro')).toBeInTheDocument();

    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('$9.99')).toBeInTheDocument();
    expect(screen.getByText('$4.99')).toBeInTheDocument();

    expect(screen.getByText(/128 MB de memoria rápida exclusiva/i)).toBeInTheDocument();
    expect(screen.getByText(/256 MB RAM por sitio/i)).toBeInTheDocument();
    expect(screen.getByText(/512 MB RAM por sitio/i)).toBeInTheDocument();
  });

  it('debe invocar onRegister al presionar el botón de acción de un plan', () => {
    const onRegisterMock = vi.fn();
    render(<Landing onLogin={vi.fn()} onRegister={onRegisterMock} />);

    const freeButton = screen.getByRole('button', { name: /Comenzar con Free/i });
    fireEvent.click(freeButton);
    expect(onRegisterMock).toHaveBeenCalledTimes(1);

    const devButton = screen.getByRole('button', { name: /Elegir Developer/i });
    fireEvent.click(devButton);
    expect(onRegisterMock).toHaveBeenCalledTimes(2);
  });

  it('debe permitir expandir y colapsar preguntas frecuentes (FAQ)', () => {
    render(<Landing onLogin={vi.fn()} onRegister={vi.fn()} />);

    const faqButton = screen.getByText(/¿Cómo funciona el proceso de pago y suscripción\?/i);
    expect(faqButton).toBeInTheDocument();

    // Al hacer click, debe mostrar la respuesta
    fireEvent.click(faqButton);
    expect(
      screen.getByText(/Para suscribirte a los planes Developer o Pro/i)
    ).toBeInTheDocument();
  });
});

