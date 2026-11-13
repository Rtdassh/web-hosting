import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthContext } from '../context/AuthContext';
import ProfilePage from '../pages/ProfilePage';
import { authService } from '../services/api';
vi.mock('../services/api', () => ({ authService: { forgotPassword: vi.fn() } }));
vi.mock('../components/ui/Toast', () => ({ toast: { success: vi.fn() } }));
const user = { full_name: 'Juan', email: 'juan@example.com', plan: { name: 'Developer' }, role: 'client' };
function mount(logout = vi.fn(), onLogout = vi.fn()) {
  render(<AuthContext.Provider value={{ user, logout }}><ProfilePage onLogout={onLogout} /></AuthContext.Provider>);
  return { logout, onLogout };
}
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });
describe('Perfil y ajustes', () => {
  it('muestra el perfil y solicita el enlace al correo de la cuenta', async () => {
    authService.forgotPassword.mockResolvedValue({});
    mount();
    expect(screen.getByText(user.email)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña por correo' }));
    await waitFor(() => expect(authService.forgotPassword).toHaveBeenCalledWith(user.email));
  });
  it('guarda preferencias y exige confirmar el cierre de sesión', () => {
    const { logout, onLogout } = mount();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(localStorage.getItem('codrop_compact_projects')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(logout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(logout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cierre de sesión' }));
    expect(logout).toHaveBeenCalledOnce();
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
