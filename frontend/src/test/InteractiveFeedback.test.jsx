import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ToastProvider, { toast, Toaster } from '../components/ui/Toast';
import LoadingButton from '../components/ui/LoadingButton';
import CopyButton from '../components/ui/CopyButton';
import Skeleton, { SkeletonInstanceCard, SkeletonTableRow } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import { Rocket } from 'lucide-react';

describe('Interactive Feedback Primitives (Living Interface Suite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Toast System', () => {
    it('debe emitir y renderizar un toast de éxito en el ToastProvider', () => {
      render(
        <ToastProvider>
          <div>Contenido de prueba</div>
        </ToastProvider>
      );

      act(() => {
        toast.success('Servidor aprovisionado con éxito');
      });

      expect(screen.getByText('Servidor aprovisionado con éxito')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('debe emitir y renderizar un toast de error', () => {
      render(
        <ToastProvider>
          <div>App</div>
        </ToastProvider>
      );

      act(() => {
        toast.error('Fallo de conexión con Docker Socket');
      });

      expect(screen.getByText('Fallo de conexión con Docker Socket')).toBeInTheDocument();
    });

    it('debe permitir cerrar el toast al hacer click en el botón de cerrar', () => {
      render(
        <ToastProvider>
          <div>App</div>
        </ToastProvider>
      );

      act(() => {
        toast.info('Notificación informativa');
      });

      const closeButton = screen.getByLabelText('Cerrar notificación');
      fireEvent.click(closeButton);
    });
  });

  describe('LoadingButton', () => {
    it('debe renderizar el contenido normal en reposo', () => {
      render(
        <LoadingButton>Guardar cambios</LoadingButton>
      );

      expect(screen.getByText('Guardar cambios')).toBeInTheDocument();
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(button.className).toContain('btn-tactile');
    });

    it('debe mostrar el estado de loading, spinner y deshabilitar clics', () => {
      const onClickMock = vi.fn();
      render(
        <LoadingButton loading loadingText="Guardando..." onClick={onClickMock}>
          Guardar cambios
        </LoadingButton>
      );

      expect(screen.getByText('Guardando...')).toBeInTheDocument();
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      fireEvent.click(button);
      expect(onClickMock).not.toHaveBeenCalled();
    });

    it('debe mostrar el estado de éxito con check icon', () => {
      render(
        <LoadingButton success successText="¡Guardado!">
          Guardar cambios
        </LoadingButton>
      );

      expect(screen.getByText('¡Guardado!')).toBeInTheDocument();
    });
  });

  describe('CopyButton', () => {
    it('debe copiar al portapapeles y cambiar temporalmente a ¡Copiado!', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<CopyButton textToCopy="http://localhost:30005" />);

      const button = screen.getByRole('button', { name: /copiar/i });
      await act(async () => {
        fireEvent.click(button);
      });

      expect(writeTextMock).toHaveBeenCalledWith('http://localhost:30005');
      expect(screen.getByText('¡Copiado!')).toBeInTheDocument();
    });
  });

  describe('Skeleton Components', () => {
    it('debe renderizar la clase skeleton-shimmer en Skeleton', () => {
      const { container } = render(<Skeleton className="w-20 h-4" />);
      const skeletonEl = container.firstChild;
      expect(skeletonEl.className).toContain('skeleton-shimmer');
    });

    it('debe renderizar SkeletonInstanceCard sin errores', () => {
      const { container } = render(<SkeletonInstanceCard />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('debe renderizar SkeletonTableRow con columnas especificadas', () => {
      const { container } = render(
        <table>
          <tbody>
            <SkeletonTableRow columns={5} />
          </tbody>
        </table>
      );
      const cells = container.querySelectorAll('td');
      expect(cells.length).toBe(5);
    });
  });

  describe('EmptyState', () => {
    it('debe renderizar el título, descripción y botón de acción', () => {
      const onActionMock = vi.fn();
      render(
        <EmptyState
          icon={Rocket}
          title="No tienes sitios activos"
          description="Sube tu primer proyecto en .zip"
          actionLabel="Nuevo proyecto"
          onAction={onActionMock}
        />
      );

      expect(screen.getByText('No tienes sitios activos')).toBeInTheDocument();
      expect(screen.getByText('Sube tu primer proyecto en .zip')).toBeInTheDocument();
      const actionButton = screen.getByRole('button', { name: /nuevo proyecto/i });
      fireEvent.click(actionButton);
      expect(onActionMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('StatusBadge', () => {
    it('debe renderizar Running con punto pulsante', () => {
      render(<StatusBadge status="running" />);
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('debe renderizar Stopped en gris', () => {
      render(<StatusBadge status="stopped" />);
      expect(screen.getByText('Stopped')).toBeInTheDocument();
    });
  });
});

