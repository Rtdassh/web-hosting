import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReceiptModal from '../components/billing/ReceiptModal';

describe('ReceiptModal UI Component (RF-10 Comprobantes Digitales)', () => {
  const mockInvoice = {
    id: 42,
    transaction_id: 101,
    invoice_number: 'INV-2026-0042',
    auth_code: 'AUTH-ABC123XYZ',
    plan_name: 'Developer',
    amount: 9.99,
    card_brand: 'Visa',
    card_last_four: '0366',
    created_at: '2026-10-31T12:00:00Z',
  };

  it('no debe renderizar nada cuando isOpen es falso o invoice es nulo', () => {
    const { container: c1 } = render(
      <ReceiptModal isOpen={false} onClose={vi.fn()} invoice={mockInvoice} />
    );
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(
      <ReceiptModal isOpen={true} onClose={vi.fn()} invoice={null} />
    );
    expect(c2).toBeEmptyDOMElement();
  });

  it('debe exhibir la información requerida del comprobante digital', () => {
    render(
      <ReceiptModal isOpen={true} onClose={vi.fn()} invoice={mockInvoice} />
    );

    expect(screen.getByText('Comprobante Codrop')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-0042')).toBeInTheDocument();
    expect(screen.getByText('AUTH-ABC123XYZ')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText(/0366/)).toBeInTheDocument();
    expect(screen.getByText('$9.99')).toBeInTheDocument();
    expect(screen.getByText('Aprobada')).toBeInTheDocument();
  });

  it('debe llamar a onClose al hacer click en el botón de cerrar', () => {
    const onCloseMock = vi.fn();
    render(
      <ReceiptModal isOpen={true} onClose={onCloseMock} invoice={mockInvoice} />
    );

    const closeBtn = screen.getByRole('button', { name: /^Cerrar$/i });
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('debe invocar window.print al hacer click en Imprimir / PDF', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(
      <ReceiptModal isOpen={true} onClose={vi.fn()} invoice={mockInvoice} />
    );

    const printBtn = screen.getByRole('button', { name: /Imprimir \/ PDF/i });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});
