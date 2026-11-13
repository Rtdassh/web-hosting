import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppContent } from '../App';
import { AuthContext } from '../context/AuthContext';
vi.mock('../components/layout/Navbar', () => ({ default: ({ onProfile }) => <button onClick={onProfile}>Abrir perfil</button> }));
vi.mock('../components/instances/SiteHealthNotifications', () => ({ default: () => null }));
vi.mock('../components/instances/DeployModal', () => ({ default: () => null }));
vi.mock('../pages/DashboardPage', () => ({ default: () => <h1>Resumen de sitios</h1> }));
vi.mock('../pages/PricingPage', () => ({ default: () => <h1>Planes disponibles</h1> }));
vi.mock('../pages/BillingHistoryPage', () => ({ default: () => <h1>Recibos de cuenta</h1> }));
it('conserva la columna, la navegación y la cuota al cambiar de sección', () => {
  const user = { email: 'test@example.com', full_name: 'Test', plan: { name: 'Developer', max_instances: 3, active_instances: 2 } };
  render(<AuthContext.Provider value={{ isAuthenticated: true, user, logout: vi.fn() }}><AppContent /></AuthContext.Provider>);
  const nav = screen.getByRole('navigation', { name: 'Cuenta' });
  const aside = nav.closest('aside');
  const quota = screen.getByRole('region', { name: 'Cuota del plan' });
  for (const [label, heading] of [['Planes y suscripción', 'Planes disponibles'], ['Facturación y recibos', 'Recibos de cuenta'], ['Mis sitios', 'Resumen de sitios'], ['Perfil y ajustes', 'Perfil y ajustes']]) {
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Cuenta' })).toBe(nav);
    expect(nav.closest('aside')).toBe(aside);
    expect(screen.getByRole('region', { name: 'Cuota del plan' })).toBe(quota);
  }
});
