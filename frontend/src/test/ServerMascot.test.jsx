import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ServerMascot, { getMascotMeta, MASCOT_STATUS_META } from '../components/mascot/ServerMascot';

describe('ServerMascot UI Component (Ciclo de Vida del Servidor)', () => {
  it('debe mapear el estado "creating" o "pending" a la ilustración de huevo naciendo', () => {
    const { rerender } = render(<ServerMascot status="creating" />);
    const imgCreating = screen.getByRole('img');
    expect(imgCreating).toHaveAttribute('alt', 'Mascota Codrop: Creando');
    expect(imgCreating.getAttribute('src')).toContain('mascot-creating');

    rerender(<ServerMascot status="pending" />);
    const imgPending = screen.getByRole('img');
    expect(imgPending).toHaveAttribute('alt', 'Mascota Codrop: Pendiente');
    expect(imgPending.getAttribute('src')).toContain('mascot-creating');
  });

  it('debe mapear el estado "running" a la ilustración del cocodrilo activo con zip', () => {
    render(<ServerMascot status="running" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Mascota Codrop: Activo');
    expect(img.getAttribute('src')).toContain('mascot-running');
  });

  it('debe mapear el estado "stopped" a la ilustración del cocodrilo durmiendo con Zzz', () => {
    render(<ServerMascot status="stopped" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Mascota Codrop: Detenido');
    expect(img.getAttribute('src')).toContain('mascot-stopped');
  });

  it('debe mapear el estado "failed" o "error" a la ilustración del cocodrilo mareado con curita', () => {
    const { rerender } = render(<ServerMascot status="failed" />);
    const imgFailed = screen.getByRole('img');
    expect(imgFailed).toHaveAttribute('alt', 'Mascota Codrop: Error');
    expect(imgFailed.getAttribute('src')).toContain('mascot-failed');

    rerender(<ServerMascot status="error" />);
    const imgError = screen.getByRole('img');
    expect(imgError).toHaveAttribute('alt', 'Mascota Codrop: Error');
    expect(imgError.getAttribute('src')).toContain('mascot-failed');
  });

  it('debe mapear el estado "destroying" o action="destroy" al cocodrilo noqueado con ojos en X', () => {
    const { rerender } = render(<ServerMascot status="destroying" />);
    const imgDestroying = screen.getByRole('img');
    expect(imgDestroying).toHaveAttribute('alt', 'Mascota Codrop: Eliminando');
    expect(imgDestroying.getAttribute('src')).toContain('mascot-destroying');

    // Al ejecutarse acción de destroy sobre un servidor running, debe mostrar la mascota muriendo
    rerender(<ServerMascot status="running" action="destroy" />);
    const imgAction = screen.getByRole('img');
    expect(imgAction).toHaveAttribute('alt', 'Mascota Codrop: Eliminando');
    expect(imgAction.getAttribute('src')).toContain('mascot-destroying');
  });

  it('debe renderizar la etiqueta y badge cuando showLabel es true', () => {
    render(<ServerMascot status="running" showLabel={true} />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('la función getMascotMeta debe resolver estados desconocidos con un fallback seguro', () => {
    const fallbackMeta = getMascotMeta('unknown_state');
    expect(fallbackMeta).toEqual(MASCOT_STATUS_META.stopped);
  });
});

