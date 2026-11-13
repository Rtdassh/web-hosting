import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppContent } from '../App';
import { AuthContext } from '../context/AuthContext';
vi.mock('../services/api', () => ({ authService: {}, billingService: {}, instanceService: {}, adminService: {}, templateService: {} }));
vi.mock('../pages/AdminDashboardPage', () => ({ default: ({ onLogout }) => <div><h1>Consola exclusiva</h1><button onClick={onLogout}>Cerrar sesión</button></div> }));
afterEach(() => window.history.replaceState({}, '', '/'));
it('envía al admin directamente a su consola sin montar herramientas de clientes', () => {
  const logout = vi.fn();
  render(<AuthContext.Provider value={{ isAuthenticated: true, user: { role: 'admin' }, logout }}><AppContent /></AuthContext.Provider>);
  expect(screen.getByText('Consola exclusiva')).toBeInTheDocument();
  expect(screen.queryByText('Mis proyectos')).not.toBeInTheDocument();
  expect(window.location.pathname).toBe('/admin');
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(logout).toHaveBeenCalledOnce();
  expect(window.location.pathname).toBe('/');
});
it('espera identidad antes de montar herramientas autenticadas', () => {
  render(<AuthContext.Provider value={{ isAuthenticated: true, user: null }}><AppContent /></AuthContext.Provider>);
  expect(screen.getByRole('status')).toHaveTextContent('Verificando sesión');
  expect(screen.queryByText('Consola exclusiva')).not.toBeInTheDocument();
});
