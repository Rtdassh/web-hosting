import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PublicNavbar from '../components/layout/PublicNavbar';

describe('PublicNavbar Component', () => {
  it('debe exhibir los enlaces globales de navegación (Cómo funciona, Características, Planes, FAQ)', () => {
    render(<PublicNavbar variant="landing" onHome={vi.fn()} onLogin={vi.fn()} onRegister={vi.fn()} />);

    expect(screen.getByRole('link', { name: /Cómo funciona/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Características/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Planes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /FAQ/i })).toBeInTheDocument();
  });

  it('debe invocar onNavigateSection al hacer click en el enlace FAQ', () => {
    const onNavigateSectionMock = vi.fn();
    render(
      <PublicNavbar
        variant="forgot-password"
        onHome={vi.fn()}
        onLogin={vi.fn()}
        onNavigateSection={onNavigateSectionMock}
      />
    );

    const faqLink = screen.getByRole('link', { name: /FAQ/i });
    fireEvent.click(faqLink);

    expect(onNavigateSectionMock).toHaveBeenCalledWith('faq');
  });

  it('debe invocar onNavigateSection al hacer click en Planes desde la pantalla de recuperación', () => {
    const onNavigateSectionMock = vi.fn();
    render(
      <PublicNavbar
        variant="forgot-password"
        onHome={vi.fn()}
        onLogin={vi.fn()}
        onNavigateSection={onNavigateSectionMock}
      />
    );

    const planesLink = screen.getByRole('link', { name: /Planes/i });
    fireEvent.click(planesLink);

    expect(onNavigateSectionMock).toHaveBeenCalledWith('planes');
  });

  it('debe invocar onHome al hacer click en el logo de Codrop', () => {
    const onHomeMock = vi.fn();
    render(<PublicNavbar variant="reset-password" onHome={onHomeMock} onLogin={vi.fn()} />);

    const brandButton = screen.getByRole('button', { name: /Volver al inicio/i });
    fireEvent.click(brandButton);

    expect(onHomeMock).toHaveBeenCalledTimes(1);
  });

  it('debe alternar el menú móvil al hacer click en el botón de hamburguesa', () => {
    render(<PublicNavbar variant="landing" onHome={vi.fn()} onLogin={vi.fn()} onRegister={vi.fn()} />);

    const toggleButton = screen.getByRole('button', { name: /Abrir menú/i });
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);
    // Tras abrir el menú móvil, deben existir múltiples enlaces de FAQ (desktop + mobile)
    const faqLinks = screen.getAllByRole('link', { name: /FAQ/i });
    expect(faqLinks.length).toBeGreaterThan(1);
  });

  it('debe mostrar las acciones contextuales correspondientes a la pantalla de recuperación', () => {
    render(<PublicNavbar variant="forgot-password" onHome={vi.fn()} onLogin={vi.fn()} />);

    expect(screen.getByText(/¿Recordaste tu contraseña\?/i)).toBeInTheDocument();
  });
});

