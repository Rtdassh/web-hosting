import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Landing from '../pages/Landing';

describe('Landing Page UI Component', () => {
  it('reserva el protagonismo al producto y limita la mascota a dos apariciones', () => {
    const { container } = render(<Landing />);
    expect(container.querySelectorAll('img[src*="codrop-isotipo"], .mascot-brand img')).toHaveLength(2);
    expect(screen.getByRole('img', { name: /Ilustración de una web publicada/ })).toBeInTheDocument();
    expect(screen.queryByText('HOSTING MODERNO')).not.toBeInTheDocument();
  });

  it('explora el proceso de publicación sin crear una cuenta ni publicar datos', () => {
    const onRegister = vi.fn();
    render(<Landing onRegister={onRegister} />);
    const preview = screen.getByRole('status');
    expect(within(preview).getByText('Todo empieza con tus archivos')).toBeInTheDocument();
    const prepare = screen.getByRole('button', { name: /2\. Codrop lo Prepara/ });
    fireEvent.click(prepare);
    expect(prepare).toHaveAttribute('aria-pressed', 'true');
    expect(within(preview).getByText('Tu espacio, preparado para ti')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /3\. Comparte tu Enlace/ }));
    expect(within(preview).getByText('Listo para compartir')).toBeInTheDocument();
    expect(onRegister).not.toHaveBeenCalled();
    expect(screen.queryByText('Encuentra tu punto de partida')).not.toBeInTheDocument();
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

