import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SiteManagementPanel from '../components/instances/SiteManagementPanel';
import { instanceService } from '../services/api';

vi.mock('../services/api', () => ({ instanceService: {
  getFiles: vi.fn(), getActivity: vi.fn(), rename: vi.fn(), downloadBackup: vi.fn(), downloadFile: vi.fn(),
} }));
const site = { id: 7, name: 'Mi web', status: 'running', container_id: 'c7' };
const report = { entries: [{ name: 'assets', path: 'assets', kind: 'directory' }], size_bytes: 1024, total_files: 2, total_entries: 1, limit: 50 };

beforeEach(() => {
  vi.clearAllMocks();
  instanceService.getFiles.mockResolvedValue(report);
  instanceService.getActivity.mockResolvedValue([]);
});

it('guarda el nombre y refresca el proyecto', async () => {
  const changed = vi.fn();
  instanceService.rename.mockResolvedValue({ ...site, name: 'Portafolio' });
  render(<SiteManagementPanel instance={site} onChanged={changed} />);
  fireEvent.change(screen.getByLabelText('Nombre del proyecto'), { target: { value: '  Portafolio  ' } });
  fireEvent.click(screen.getByText('Guardar nombre'));
  await waitFor(() => expect(instanceService.rename).toHaveBeenCalledWith(7, 'Portafolio'));
  await waitFor(() => expect(changed).toHaveBeenCalledOnce());
});

it('permite explorar carpetas y consultar la actividad sin operaciones destructivas', async () => {
  render(<SiteManagementPanel instance={site} />);
  fireEvent.click(screen.getByRole('button', { name: 'Archivos', exact: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'assets' }));
  await waitFor(() => expect(instanceService.getFiles).toHaveBeenCalledWith(7, 'assets', 0));
  fireEvent.click(screen.getByRole('button', { name: 'Actividad', exact: true }));
  await screen.findByText('Aún no hay eventos registrados.');
  expect(instanceService.rename).not.toHaveBeenCalled();
  expect(instanceService.downloadBackup).not.toHaveBeenCalled();
});

it('muestra un error de validación sin romper la vista', async () => {
  instanceService.rename.mockRejectedValue({ response: { data: { detail: [{ loc: ['body', 'name'], msg: 'Nombre inválido' }] } } });
  render(<SiteManagementPanel instance={site} />);
  fireEvent.change(screen.getByLabelText('Nombre del proyecto'), { target: { value: 'Nuevo' } });
  fireEvent.click(screen.getByText('Guardar nombre'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Nombre inválido'));
});
