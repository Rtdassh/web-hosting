import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeployModal from '../components/instances/DeployModal';
import { templateService } from '../services/api';

vi.mock('../services/api', () => ({
  templateService: {
    deployTemplate: vi.fn(),
  },
  instanceService: {
    deployInstance: vi.fn(),
  },
}));

describe('DeployModal UI Component (RF-14 Plantillas 1-Clic y Subida ZIP)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no debe renderizar nada cuando isOpen es falso', () => {
    const { container } = render(
      <DeployModal isOpen={false} onClose={vi.fn()} onInstanceDeployed={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('debe exhibir las pestañas de Subir .ZIP y Plantillas 1-Clic', () => {
    render(
      <DeployModal isOpen={true} onClose={vi.fn()} onInstanceDeployed={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: /Subir \.ZIP/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Plantillas 1-Clic/i })).toBeInTheDocument();
  });

  it('debe exhibir las 3 opciones de plantillas al activar la pestaña de plantillas', () => {
    render(
      <DeployModal isOpen={true} onClose={vi.fn()} onInstanceDeployed={vi.fn()} />
    );

    const templateTab = screen.getByRole('button', { name: /Plantillas 1-Clic/i });
    fireEvent.click(templateTab);

    expect(screen.getAllByText('Landing Page')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Portafolio')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Documentación')[0]).toBeInTheDocument();
  });

  it('debe permitir seleccionar una plantilla distinta y enviar el despliegue', async () => {
    const onInstanceDeployedMock = vi.fn();
    const onCloseMock = vi.fn();

    templateService.deployTemplate.mockResolvedValueOnce({
      id: 88,
      name: 'mi-sitio-express',
      public_url: 'http://localhost:30005',
    });

    render(
      <DeployModal
        isOpen={true}
        onClose={onCloseMock}
        onInstanceDeployed={onInstanceDeployedMock}
      />
    );

    // Cambiar a pestaña plantillas
    fireEvent.click(screen.getByRole('button', { name: /Plantillas 1-Clic/i }));

    const portfolioCard = screen.getAllByText('Portafolio')[0].closest('button');
    fireEvent.click(portfolioCard);

    const nameInput = screen.getByPlaceholderText('Ej. Mi portafolio');
    fireEvent.change(nameInput, { target: { value: 'mi-sitio-express' } });

    const deployBtn = screen.getByRole('button', { name: /Desplegar plantilla/i });
    expect(deployBtn).toBeEnabled();

    fireEvent.click(deployBtn);

    await waitFor(() => {
      expect(templateService.deployTemplate).toHaveBeenCalledTimes(1);
      expect(templateService.deployTemplate).toHaveBeenCalledWith(
        'mi-sitio-express',
        'personal-portfolio'
      );
    });
  });
});
