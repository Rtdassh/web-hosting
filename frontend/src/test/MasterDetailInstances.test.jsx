import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';

import DashboardPage from '../pages/DashboardPage';
import InstanceDetailView from '../components/instances/InstanceDetailView';
import { instanceService } from '../services/api';
import ToastProvider from '../components/ui/Toast';

vi.mock('../services/api', () => ({
  instanceService: {
    getInstances: vi.fn(),
    triggerAction: vi.fn(),
    syncStatus: vi.fn(),
    destroyInstance: vi.fn(),
    getMetrics: vi.fn(),
    getLogs: vi.fn(),
  },
}));

describe('Master-Detail Pattern & Progressive Disclosure (Projects View)', () => {
  const mockInstances = [
    {
      id: 'inst-1',
      name: 'portfolio-dan',
      status: 'running',
      assigned_port: 30005,
      public_url: 'http://localhost:30005',
      created_at: '2026-10-15T12:00:00Z',
    },
    {
      id: 'inst-2',
      name: 'landing-promo',
      status: 'stopped',
      assigned_port: 30010,
      public_url: 'http://localhost:30010',
      created_at: '2026-10-20T15:30:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    instanceService.getInstances.mockResolvedValue(mockInstances);
    instanceService.getMetrics.mockResolvedValue({
      cpu_percent: 1.5,
      memory_usage_mb: 8.2,
      memory_limit_mb: 128.0,
      memory_percent: 6.4,
      status: 'running',
    });
  });

  describe('1. Vista Principal (Master List) - Ruido visual reducido', () => {
    it('muestra únicamente el nombre, estado, puerto monoespaciado y URL pública', async () => {
      await act(async () => {
        render(
          <ToastProvider>
            <DashboardPage onDeployClick={vi.fn()} refreshKey={0} />
          </ToastProvider>
        );
      });

      expect(screen.getByText('portfolio-dan')).toBeInTheDocument();
      expect(screen.getByText('landing-promo')).toBeInTheDocument();

      // Estados discretos
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Stopped')).toBeInTheDocument();

      // Puertos monoespaciados
      expect(screen.getByText('30005')).toBeInTheDocument();
      expect(screen.getByText('30010')).toBeInTheDocument();

      // URLs públicas
      expect(screen.getByText('http://localhost:30005')).toBeInTheDocument();
      expect(screen.getByText('http://localhost:30010')).toBeInTheDocument();
    });

    it('no exhibe fecha de despliegue ni botones operativos directos en el listado principal', async () => {
      await act(async () => {
        render(
          <ToastProvider>
            <DashboardPage onDeployClick={vi.fn()} refreshKey={0} />
          </ToastProvider>
        );
      });

      // No debe contener "Creado" ni fechas en la fila
      expect(screen.queryByText(/Creado 15/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Creado 20/i)).not.toBeInTheDocument();

      // No debe contener los botones de acción rápida en la vista maestra
      expect(screen.queryByRole('button', { name: /detener proyecto/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /iniciar proyecto/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /actualizar estado/i })).not.toBeInTheDocument();
    });

    it('la fila actúa como disparador para navegar a la vista de detalle', async () => {
      await act(async () => {
        render(
          <ToastProvider>
            <DashboardPage onDeployClick={vi.fn()} refreshKey={0} />
          </ToastProvider>
        );
      });

      const row = screen.getByRole('button', { name: /portfolio-dan/i });
      await act(async () => {
        fireEvent.click(row);
      });

      // Debe haber navegado al detalle
      expect(screen.getByRole('button', { name: /volver a proyectos/i })).toBeInTheDocument();
      expect(screen.getByText('Gestión del Proyecto')).toBeInTheDocument();
      expect(screen.getByText('Zona de Peligro')).toBeInTheDocument();
    });

    it('hacer clic en la URL o botón copiar no dispara la navegación al detalle (stopPropagation)', async () => {
      await act(async () => {
        render(
          <ToastProvider>
            <DashboardPage onDeployClick={vi.fn()} refreshKey={0} />
          </ToastProvider>
        );
      });

      const urlLink = screen.getByRole('link', { name: /http:\/\/localhost:30005/i });
      await act(async () => {
        fireEvent.click(urlLink);
      });

      // Permanece en el listado principal
      expect(screen.queryByRole('button', { name: /volver a proyectos/i })).not.toBeInTheDocument();
      expect(screen.getByText('Mis proyectos')).toBeInTheDocument();
    });
  });

  describe('2. Nueva Vista de Detalle (InstanceDetailView)', () => {
    it('renderiza cabecera con botón de retorno, nombre, estado y fecha de despliegue secundaria', async () => {
      const onBack = vi.fn();
      await act(async () => {
        render(
          <InstanceDetailView
            instance={mockInstances[0]}
            onBack={onBack}
            onAction={vi.fn()}
            onSync={vi.fn()}
            onOpenLogs={vi.fn()}
            onDestroy={vi.fn()}
          />
        );
      });

      expect(screen.getByRole('button', { name: /volver a proyectos/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: /portfolio-dan/i })).toBeInTheDocument();
      expect(screen.getByText(/desplegado el/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /volver a proyectos/i }));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('renderiza panel de metadatos de red con URL y puerto y botones de copia', async () => {
      await act(async () => {
        render(
          <InstanceDetailView
            instance={mockInstances[0]}
            onBack={vi.fn()}
            onAction={vi.fn()}
            onSync={vi.fn()}
            onOpenLogs={vi.fn()}
            onDestroy={vi.fn()}
          />
        );
      });

      expect(screen.getByText('Enlaces y Conectividad')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copiar url/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copiar puerto/i })).toBeInTheDocument();
      expect(screen.getAllByText(/30005/).length).toBeGreaterThanOrEqual(1);
    });

    it('renderiza barra de control operativo con botones de ciclo de vida y logs', async () => {
      const onAction = vi.fn();
      const onSync = vi.fn();
      const onOpenLogs = vi.fn();

      await act(async () => {
        render(
          <InstanceDetailView
            instance={mockInstances[0]}
            onBack={vi.fn()}
            onAction={onAction}
            onSync={onSync}
            onOpenLogs={onOpenLogs}
            onDestroy={vi.fn()}
          />
        );
      });

      const stopBtn = screen.getByRole('button', { name: /detener proyecto/i });
      fireEvent.click(stopBtn);
      expect(onAction).toHaveBeenCalledWith('inst-1', 'stop');

      const restartBtn = screen.getByRole('button', { name: /reiniciar/i });
      fireEvent.click(restartBtn);
      expect(onAction).toHaveBeenCalledWith('inst-1', 'restart');

      const syncBtn = screen.getByRole('button', { name: /actualizar estado/i });
      fireEvent.click(syncBtn);
      expect(onSync).toHaveBeenCalledWith('inst-1');

      const logsBtn = screen.getByRole('button', { name: /ver actividad \(logs\)/i });
      fireEvent.click(logsBtn);
      expect(onOpenLogs).toHaveBeenCalledWith(mockInstances[0]);
    });

    it('renderiza zona de peligro separada visualmente con acción de borrado', async () => {
      const onDestroy = vi.fn();

      await act(async () => {
        render(
          <InstanceDetailView
            instance={mockInstances[0]}
            onBack={vi.fn()}
            onAction={vi.fn()}
            onSync={vi.fn()}
            onOpenLogs={vi.fn()}
            onDestroy={onDestroy}
          />
        );
      });

      expect(screen.getByText('Zona de Peligro')).toBeInTheDocument();
      const deleteBtn = screen.getByRole('button', { name: /eliminar proyecto/i });
      fireEvent.click(deleteBtn);
      expect(onDestroy).toHaveBeenCalledWith(mockInstances[0]);
    });
  });
});
