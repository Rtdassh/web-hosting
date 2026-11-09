import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import { adminService } from '../services/api';

vi.mock('../services/api', () => ({
  adminService: {
    getDashboard: vi.fn(),
    getInstances: vi.fn(),
    forceAction: vi.fn(),
  },
}));

describe('AdminDashboardPage UI Component (RF-22, RF-23 Consola de Gobernanza)', () => {
  const mockDashboardData = {
    summary: {
      total_users: 15,
      total_revenue_simulated: 189.95,
      total_instances: 22,
      active_instances: 8,
      stopped_instances: 14,
    },
    host_resources: {
      cpu_usage_percent: 24.5,
      memory_used_mb: 2048,
      memory_total_mb: 8192,
      memory_usage_percent: 25.0,
      storage_used_gb: 12.4,
      storage_total_gb: 100.0,
      storage_usage_percent: 12.4,
    },
    users: [],
  };

  const mockInstances = [
    {
      id: 10,
      name: 'proyecto-anomalo',
      owner_email: 'inquilino@test.local',
      assigned_port: 30015,
      status: 'running',
      container_id: 'abc123container',
      cpu_percent: 88.5,
      memory_usage_mb: 240,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    adminService.getDashboard.mockResolvedValue(mockDashboardData);
    adminService.getInstances.mockResolvedValue(mockInstances);
  });

  it('debe exhibir las métricas de plataforma y de hardware del host', async () => {
    render(<AdminDashboardPage onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument(); // total_users
      expect(screen.getByText('8 / 22')).toBeInTheDocument(); // active_instances / total_instances
      expect(screen.getByText('$189.95')).toBeInTheDocument(); // total_revenue_simulated
      expect(screen.getByText('24.5%')).toBeInTheDocument(); // cpu_usage_percent
    });
  });

  it('debe listar las instancias en la tabla de auditoría global', async () => {
    render(<AdminDashboardPage onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('proyecto-anomalo')).toBeInTheDocument();
      expect(screen.getByText('inquilino@test.local')).toBeInTheDocument();
      expect(screen.getByText('30015')).toBeInTheDocument();
    });
  });

  it('debe abrir modal de confirmación y ejecutar force-action de detención', async () => {
    adminService.forceAction.mockResolvedValueOnce({
      success: true,
      message: 'Instancia detenida forzosamente.',
    });

    render(<AdminDashboardPage onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('proyecto-anomalo')).toBeInTheDocument();
    });

    const stopButton = screen.getByRole('button', { name: /Forzar detención/i });
    fireEvent.click(stopButton);

    // Modal de acción forzosa abierto
    expect(screen.getByText('Acción administrativa')).toBeInTheDocument();

    const confirmActionBtn = screen.getByRole('button', { name: /Confirmar detención/i });
    fireEvent.click(confirmActionBtn);

    await waitFor(() => {
      expect(adminService.forceAction).toHaveBeenCalledWith(
        10,
        'force_stop',
        expect.any(String)
      );
    });
  });

  it('debe permitir seleccionar y ejecutar force_destroy sobre una instancia', async () => {
    adminService.forceAction.mockResolvedValueOnce({
      success: true,
      message: 'Instancia destruida forzosamente.',
    });

    render(<AdminDashboardPage onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('proyecto-anomalo')).toBeInTheDocument();
    });

    const destroyButton = screen.getByRole('button', { name: /Forzar eliminación/i });
    fireEvent.click(destroyButton);

    expect(screen.getByText('Acción administrativa')).toBeInTheDocument();

    const confirmActionBtn = screen.getByRole('button', { name: /Confirmar eliminación/i });
    fireEvent.click(confirmActionBtn);

    await waitFor(() => {
      expect(adminService.forceAction).toHaveBeenCalledWith(
        10,
        'force_destroy',
        expect.any(String)
      );
    });
  });
});
