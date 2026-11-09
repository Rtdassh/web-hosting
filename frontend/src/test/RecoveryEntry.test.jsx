import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppContent } from '../App';
import { AuthContext } from '../context/AuthContext';
vi.mock('../services/api', () => ({
  authService: { resetPassword: vi.fn() },
  billingService: {}, instanceService: {}, adminService: {}, templateService: {},
}));
afterEach(() => window.history.replaceState({}, '', '/'));
describe('Password reset email entry', () => {
  for (const isAuthenticated of [false, true]) {
    it(`opens the email token with authenticated=${isAuthenticated}`, () => {
      window.history.replaceState({}, '', '/?reset_token=synthetic-token&keep=1');
      render(<AuthContext.Provider value={{ isAuthenticated, user: null }}><AppContent /></AuthContext.Provider>);
      expect(screen.getByDisplayValue('synthetic-token')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Restablecer contraseña/i })).toBeInTheDocument();
      expect(window.location.search).toBe('?keep=1');
    });
  }
});
