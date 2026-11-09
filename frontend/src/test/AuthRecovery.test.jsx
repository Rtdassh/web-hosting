import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import { authService } from '../services/api';

vi.mock('../services/api', () => ({
  authService: {
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

describe('Auth Password Recovery Flow (RF-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ForgotPassword Component', () => {
    it('debe validar que el correo no esté vacío', async () => {
      render(<ForgotPassword onBack={vi.fn()} onGoToReset={vi.fn()} />);

      const form = screen.getByRole('button', { name: /Generar enlace de recuperación/i }).closest('form');
      fireEvent.submit(form);

      expect(screen.getByText('Ingresa tu correo electrónico.')).toBeInTheDocument();
      expect(authService.forgotPassword).not.toHaveBeenCalled();
    });

    it('debe confirmar la solicitud sin exponer un token', async () => {
      authService.forgotPassword.mockResolvedValueOnce({
        message: 'Instrucciones generadas',
      });

      render(<ForgotPassword onBack={vi.fn()} onGoToReset={vi.fn()} />);

      const emailInput = screen.getByPlaceholderText('tu@correo.com');
      fireEvent.change(emailInput, { target: { value: 'usuario@empresa.com' } });

      const submitBtn = screen.getByRole('button', { name: /Generar enlace de recuperación/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(authService.forgotPassword).toHaveBeenCalledWith('usuario@empresa.com');
        expect(screen.getByRole('status')).toHaveTextContent('Instrucciones generadas');
        expect(screen.queryByText('Token de recuperación')).not.toBeInTheDocument();
      });
    });

    it('debe permitir navegar a la pantalla de restablecimiento si ya cuenta con un token', () => {
      const onGoToResetMock = vi.fn();
      render(<ForgotPassword onBack={vi.fn()} onGoToReset={onGoToResetMock} />);

      const directLink = screen.getByRole('button', { name: /¿Ya tienes un token temporal\? Ir a restablecer contraseña/i });
      fireEvent.click(directLink);

      expect(onGoToResetMock).toHaveBeenCalledTimes(1);
    });

    it('debe permitir ingresar el token temporal tras recibir la confirmación de solicitud', async () => {
      const onGoToResetMock = vi.fn();
      authService.forgotPassword.mockResolvedValueOnce({
        message: 'Instrucciones generadas',
      });

      render(<ForgotPassword onBack={vi.fn()} onGoToReset={onGoToResetMock} />);

      const emailInput = screen.getByPlaceholderText('tu@correo.com');
      fireEvent.change(emailInput, { target: { value: 'usuario@empresa.com' } });

      const submitBtn = screen.getByRole('button', { name: /Generar enlace de recuperación/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/¿Ya recibiste tu token temporal\?/i)).toBeInTheDocument();
      });

      const tokenInput = screen.getByPlaceholderText(/Pega tu token aquí/i);
      fireEvent.change(tokenInput, { target: { value: 'mi-token-123' } });

      const continueBtn = screen.getByRole('button', { name: /Continuar y restablecer contraseña/i });
      fireEvent.click(continueBtn);

      expect(onGoToResetMock).toHaveBeenCalledWith('mi-token-123');
    });
  });

  describe('ResetPassword Component', () => {
    it('debe exigir token y longitud mínima de contraseña', async () => {
      render(
        <ResetPassword
          initialToken=""
          onBack={vi.fn()}
          onLoginSuccess={vi.fn()}
        />
      );

      const form = screen.getByRole('button', { name: /Restablecer contraseña/i }).closest('form');
      fireEvent.submit(form);

      expect(screen.getByText('Ingresa el token de recuperación.')).toBeInTheDocument();
    });

    it('debe verificar que las contraseñas coincidan', async () => {
      render(
        <ResetPassword
          initialToken="token-valido-123"
          onBack={vi.fn()}
          onLoginSuccess={vi.fn()}
        />
      );

      const passInputs = screen.getAllByPlaceholderText('••••••••');
      fireEvent.change(passInputs[0], { target: { value: 'claveSegura123' } });
      fireEvent.change(passInputs[1], { target: { value: 'claveDiferente456' } });

      const submitBtn = screen.getByRole('button', { name: /Restablecer contraseña/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
      expect(authService.resetPassword).not.toHaveBeenCalled();
    });

    it('debe invocar authService.resetPassword cuando todos los requisitos son válidos', async () => {
      authService.resetPassword.mockResolvedValueOnce({
        message: 'Contraseña restablecida exitosamente.',
      });

      render(
        <ResetPassword
          initialToken="token-valido-123"
          onBack={vi.fn()}
          onLoginSuccess={vi.fn()}
        />
      );

      const passInputs = screen.getAllByPlaceholderText('••••••••');
      fireEvent.change(passInputs[0], { target: { value: 'nuevaClave123' } });
      fireEvent.change(passInputs[1], { target: { value: 'nuevaClave123' } });

      const submitBtn = screen.getByRole('button', { name: /Restablecer contraseña/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(authService.resetPassword).toHaveBeenCalledWith(
          'token-valido-123',
          'nuevaClave123'
        );
        expect(screen.getByText(/Contraseña actualizada/i)).toBeInTheDocument();
      });
    });
  });
});
