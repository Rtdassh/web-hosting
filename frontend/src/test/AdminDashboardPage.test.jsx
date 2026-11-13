import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import { adminService } from '../services/api';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'admin', full_name: 'Administrador' }, logout: vi.fn() }) }));
vi.mock('../services/api', () => ({ adminService: { getDashboard: vi.fn(), getInstances: vi.fn(), forceAction: vi.fn() } }));
const sites = [
  { id: 10, name: 'sitio-activo', owner_id: 7, status: 'running', owner_email: 'privado@example.com', public_url: 'https://privado.example.com' },
  { id: 11, name: 'sitio-detenido', owner_id: 8, status: 'stopped' },
];
beforeEach(() => {
  vi.clearAllMocks();
  adminService.getDashboard.mockResolvedValue({ summary: { active_instances: 1, total_instances: 2 }, host_resources: { cpu_usage_percent: 24.5, memory_usage_percent: 25 } });
  adminService.getInstances.mockResolvedValue(sites);
  adminService.forceAction.mockResolvedValue({ audit_logged: true });
});

it('muestra solo supervisión sin acceso a datos o navegación de clientes', async () => {
  const logout = vi.fn();
  render(<AdminDashboardPage onLogout={logout} />);
  expect(await screen.findByText('sitio-activo')).toBeInTheDocument();
  expect(screen.getByText('24.5%')).toBeInTheDocument();
  expect(screen.getByText('Cliente #7')).toBeInTheDocument();
  expect(screen.queryByText('privado@example.com')).not.toBeInTheDocument();
  expect(screen.queryAllByRole('link')).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Detener sitio-detenido' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Opciones de sesión' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(logout).toHaveBeenCalledOnce();
});

it('filtra proyectos por búsqueda y estado', async () => {
  render(<AdminDashboardPage />);
  await screen.findByText('sitio-activo');
  fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'stopped' } });
  expect(screen.queryByText('sitio-activo')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Buscar sitios'), { target: { value: 'inexistente' } });
  expect(screen.getByText('No hay sitios que coincidan con los filtros.')).toBeInTheDocument();
});

it('exige motivo antes de detener y refresca después del éxito', async () => {
  render(<AdminDashboardPage />);
  await screen.findByText('sitio-activo');
  fireEvent.click(screen.getByRole('button', { name: 'Detener sitio-activo' }));
  const confirm = screen.getByRole('button', { name: 'Confirmar detención' });
  expect(confirm).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Motivo obligatorio'), { target: { value: 'Uso abusivo de recursos' } });
  fireEvent.click(confirm);
  await waitFor(() => expect(adminService.forceAction).toHaveBeenCalledWith(10, 'force_stop', 'Uso abusivo de recursos'));
  expect(await screen.findByText('Sitio detenido. Acción registrada en auditoría.')).toBeInTheDocument();
});

it('exige nombre exacto y motivo para eliminar y permite cancelar', async () => {
  render(<AdminDashboardPage />);
  await screen.findByText('sitio-activo');
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar sitio-activo' }));
  fireEvent.change(screen.getByLabelText('Motivo obligatorio'), { target: { value: 'Abuso confirmado' } });
  const confirm = screen.getByRole('button', { name: 'Confirmar eliminación' });
  expect(confirm).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Escribe el nombre del proyecto para confirmar'), { target: { value: 'sitio-activo' } });
  fireEvent.click(confirm);
  await waitFor(() => expect(adminService.forceAction).toHaveBeenCalledWith(10, 'force_destroy', 'Abuso confirmado'));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar sitio-detenido' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('mantiene el diálogo y explica el fallo si la acción no se completó', async () => {
  adminService.forceAction.mockRejectedValue({ response: { data: { detail: 'Docker no disponible' } } });
  render(<AdminDashboardPage />);
  await screen.findByText('sitio-activo');
  fireEvent.click(screen.getByRole('button', { name: 'Detener sitio-activo' }));
  fireEvent.change(screen.getByLabelText('Motivo obligatorio'), { target: { value: 'Uso abusivo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar detención' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Docker no disponible');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
