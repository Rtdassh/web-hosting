import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PricingPage from '../pages/PricingPage';
import { billingService } from '../services/api';
import { AuthContext } from '../context/AuthContext';

vi.mock('../services/api', () => ({
  billingService: {
    getPlans: vi.fn(),
    changePlan: vi.fn(),
    checkout: vi.fn(),
  },
}));

describe('PricingPage UI Component (RF-07, RF-08, RF-11 Gestión de Suscripciones)', () => {
  const mockPlans = [
    {
      id: 1,
      name: 'Free',
      description: 'Una base simple para aprender',
      price: 0,
      max_instances: 1,
      max_ram_mb: 128,
      cpu_quota: 0.25,
      features: ['1 sitio activo', '128 MB RAM por contenedor'],
    },
    {
      id: 2,
      name: 'Developer',
      description: 'El equilibrio ideal para desarrollar',
      price: 9.99,
      max_instances: 3,
      max_ram_mb: 256,
      cpu_quota: 0.5,
      popular: true,
      features: ['Hasta 3 sitios simultáneos', '256 MB RAM por contenedor'],
    },
    {
      id: 3,
      name: 'Pro',
      description: 'Más capacidad para equipos',
      price: 24.99,
      max_instances: 10,
      max_ram_mb: 512,
      cpu_quota: 1.0,
      features: ['Hasta 10 sitios simultáneos', '512 MB RAM por contenedor'],
    },
  ];

  const renderWithAuth = (ui, planName = 'Free') => {
    return render(
      <AuthContext.Provider
        value={{
          user: { id: 1, email: 'user@test.local', plan: { name: planName } },
          refreshUser: vi.fn(),
        }}
      >
        {ui}
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    billingService.getPlans.mockResolvedValue(mockPlans);
  });

  it('debe exhibir las 3 opciones de planes con sus límites de hardware', async () => {
    renderWithAuth(
      <PricingPage currentPlan="Free" onBack={vi.fn()} onGoToBilling={vi.fn()} />,
      'Free'
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Developer' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    });

    expect(screen.getByText(/128 MB RAM por contenedor/i)).toBeInTheDocument();
    expect(screen.getByText(/256 MB RAM por contenedor/i)).toBeInTheDocument();
  });

  it('debe identificar el plan activo como no seleccionable', async () => {
    renderWithAuth(
      <PricingPage currentPlan="Free" onBack={vi.fn()} onGoToBilling={vi.fn()} />,
      'Free'
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Plan actual$/i })).toBeDisabled();
    });
  });

  it('debe abrir CheckoutModal al seleccionar un plan superior de pago', async () => {
    renderWithAuth(
      <PricingPage currentPlan="Free" onBack={vi.fn()} onGoToBilling={vi.fn()} />,
      'Free'
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mejorar a Developer/i })).toBeInTheDocument();
    });

    const upgradeBtn = screen.getByRole('button', { name: /Mejorar a Developer/i });
    fireEvent.click(upgradeBtn);

    // Modal de checkout debe abrirse
    expect(screen.getByText('Pago simulado seguro')).toBeInTheDocument();
  });

  it('debe solicitar confirmación antes de solicitar un downgrade a plan gratuito', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    billingService.changePlan.mockResolvedValueOnce({
      message: 'Plan cambiado a Free con éxito.',
    });

    renderWithAuth(
      <PricingPage currentPlan="Developer" onBack={vi.fn()} onGoToBilling={vi.fn()} />,
      'Developer'
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cambiar a Free/i })).toBeInTheDocument();
    });

    const downgradeBtn = screen.getByRole('button', { name: /Cambiar a Free/i });
    fireEvent.click(downgradeBtn);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(billingService.changePlan).toHaveBeenCalledWith(1);
    });

    confirmSpy.mockRestore();
  });
});
