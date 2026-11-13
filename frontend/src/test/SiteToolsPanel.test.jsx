import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SiteToolsPanel from '../components/instances/SiteToolsPanel';
import { instanceService } from '../services/api';

vi.mock('../services/api', () => ({ instanceService: {
  getVersions: vi.fn(), getInsights: vi.fn(), publishVersion: vi.fn(), restoreVersion: vi.fn(),
} }));
const instance = { id: 3, container_id: 'c3' };
const versions = [{ id: 'v1', created_at: '2026-11-12T12:00:00Z', size_bytes: 1024, active: false }];

beforeEach(() => {
  vi.clearAllMocks();
  instanceService.getVersions.mockResolvedValue(versions);
  instanceService.getInsights.mockResolvedValue({ monitor: { stale: true, samples: 0 }, traffic: { available: false } });
});

describe('Publicaciones de sitios', () => {
  it('muestra tráfico en el resumen sin consultar versiones ni ofrecer publicaciones', async () => {
    instanceService.getInsights.mockResolvedValue({ monitor: { stale: true, samples: 0 }, traffic: { available: true, requests: 42, response_body_bytes: 1024, errors: 2 } });
    render(<SiteToolsPanel instance={instance} insightsOnly />);
    await screen.findByText('42');
    expect(instanceService.getVersions).not.toHaveBeenCalled();
    expect(screen.getByText('2 errores HTTP')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar actualización' })).not.toBeInTheDocument();
  });

  it('publica el ZIP y solicita refrescar el estado', async () => {
    const changed = vi.fn();
    instanceService.publishVersion.mockResolvedValue([]);
    render(<SiteToolsPanel instance={instance} onChanged={changed} />);
    await screen.findByText('Restaurar');
    const file = new File(['zip'], 'dist.zip', { type: 'application/zip' });
    fireEvent.change(screen.getByLabelText(/Nueva versión/), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar actualización' }));
    await waitFor(() => expect(instanceService.publishVersion).toHaveBeenCalledWith(3, file));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
  });

  it('exige confirmar antes de restaurar y mantiene visible el fallo', async () => {
    instanceService.restoreVersion.mockRejectedValue({ response: { data: { detail: 'No se pudo publicar' } } });
    render(<SiteToolsPanel instance={instance} />);
    fireEvent.click(await screen.findByText('Restaurar'));
    expect(instanceService.restoreVersion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Confirmar restauración'));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo publicar');
    expect(instanceService.restoreVersion).toHaveBeenCalledWith(3, 'v1');
  });

  it('no anuncia disponibilidad si la medición está antigua', async () => {
    render(<SiteToolsPanel instance={instance} />);
    await screen.findByText('Restaurar');
    expect(screen.getByText('Sin medición reciente')).toBeInTheDocument();
  });
});
