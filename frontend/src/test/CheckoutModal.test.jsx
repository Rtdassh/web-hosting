import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutModal from '../components/billing/CheckoutModal';
import { billingService } from '../services/api';

vi.mock('../services/api', () => ({
  billingService: {
    checkout: vi.fn(),
  },
}));

describe('CheckoutModal UI Component (RF-09 Luhn Checkout)', () => {
  const mockPlan = {
    id: 2,
    name: 'Developer',
    price: 9.99,
    max_instances: 3,
    max_ram_mb: 256,
    cpu_quota: 0.5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no debe renderizar nada cuando isOpen es falso', () => {
    const { container } = render(
      <CheckoutModal
        isOpen={false}
        onClose={vi.fn()}
        selectedPlan={mockPlan}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('debe renderizar los datos del plan y el valor a pagar', () => {
    render(
      <CheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        selectedPlan={mockPlan}
      />
    );

    expect(screen.getByText('Plan Developer')).toBeInTheDocument();
    expect(screen.getByText('$9.99')).toBeInTheDocument();
    expect(screen.getByText('Pago simulado seguro')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('4532 0151 1283 0366')).toBeInTheDocument();
  });

  it('debe autocompletar una tarjeta válida al presionar "Auto-completar"', () => {
    render(
      <CheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        selectedPlan={mockPlan}
      />
    );

    const demoButton = screen.getByRole('button', { name: /Auto-completar/i });
    fireEvent.click(demoButton);

    const cardInput = screen.getByPlaceholderText('4532 0151 1283 0366');
    expect(cardInput.value).toBe('4532 0151 1283 0366');
    expect(screen.getByText('Checksum Luhn válido')).toBeInTheDocument();
    expect(screen.getByText('Visa · válida')).toBeInTheDocument();
  });

  it('debe detectar número de tarjeta con Luhn inválido y marcarlo en la UI', () => {
    render(
      <CheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        selectedPlan={mockPlan}
      />
    );

    const cardInput = screen.getByPlaceholderText('4532 0151 1283 0366');
    // Tarjeta con checksum adulterado
    fireEvent.change(cardInput, { target: { value: '4532015112830367' } });

    expect(screen.getByText('Checksum Luhn inválido')).toBeInTheDocument();
    expect(screen.getByText('Número inválido')).toBeInTheDocument();
  });

  it('debe invocar billingService.checkout al enviar un formulario válido', async () => {
    const onSuccessMock = vi.fn();
    const mockReceipt = {
      transaction_id: 101,
      auth_code: 'AUTH-TEST-777',
      plan_name: 'Developer',
      amount_charged: 9.99,
      card_last_four: '0366',
      card_brand: 'Visa',
      invoice_number: 'INV-2026-0101',
    };

    billingService.checkout.mockResolvedValueOnce(mockReceipt);

    render(
      <CheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        selectedPlan={mockPlan}
        onSuccess={onSuccessMock}
      />
    );

    // Llenar con datos válidos usando el botón de Auto-completar
    fireEvent.click(screen.getByRole('button', { name: /Auto-completar/i }));

    const submitBtn = screen.getByRole('button', { name: /Pagar \$9\.99/i });
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(billingService.checkout).toHaveBeenCalledTimes(1);
      expect(billingService.checkout).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_id: 2,
          card_number: '4532015112830366',
          cvv: '123',
        })
      );
    });
  });

  it('debe mostrar mensaje de error en pantalla si el backend rechaza la transacción', async () => {
    billingService.checkout.mockRejectedValueOnce({
      response: {
        data: {
          detail: 'Número de tarjeta inválido según Algoritmo de Luhn.',
        },
      },
    });

    render(
      <CheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        selectedPlan={mockPlan}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Auto-completar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Pagar \$9\.99/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Número de tarjeta inválido según Algoritmo de Luhn.')
      ).toBeInTheDocument();
    });
  });
});
