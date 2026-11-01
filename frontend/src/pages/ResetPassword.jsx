import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';

import PublicNavbar from '../components/layout/PublicNavbar';
import { authService } from '../services/api';

export default function ResetPassword({
  initialToken = '',
  onBack,
  onLoginSuccess,
}) {
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const passwordChecks = useMemo(
    () => ({
      minLength: newPassword.length >= 6,
      matches:
        confirmPassword.length > 0 &&
        newPassword === confirmPassword,
    }),
    [newPassword, confirmPassword]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError('Ingresa el token de recuperación.');
      return;
    }

    if (!passwordChecks.minLength) {
      setError(
        'La contraseña debe tener al menos 6 caracteres.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(
        token.trim(),
        newPassword
      );

      setSuccess(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          'El token es inválido o ha expirado.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f9f7] text-[#172838]">
      <PublicNavbar />

      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-40 h-80 w-80 rounded-full bg-[#28B586]/10 blur-3xl" />
        <div className="absolute -right-24 top-48 h-96 w-96 rounded-full bg-[#172838]/[0.055] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.028]"
          style={{
            backgroundImage:
              'linear-gradient(#172838 1px, transparent 1px), linear-gradient(90deg, #172838 1px, transparent 1px)',
            backgroundSize: '34px 34px',
          }}
        />
      </div>

      <main className="relative mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-7xl items-center px-5 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[30px] border border-[#dce7e2] bg-white shadow-[0_28px_80px_rgba(23,40,56,0.11)] lg:grid-cols-[0.9fr_1.1fr]">
          {/* Brand side */}
          <section className="relative hidden overflow-hidden bg-[#172838] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
            />

            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#28B586]/20 blur-3xl" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#28B586]/30 bg-[#28B586]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#7de0bd]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Seguridad Codrop
              </span>

              <h1 className="mt-6 max-w-md text-4xl font-black leading-[1.08] tracking-[-0.045em]">
                Una nueva clave.
                <span className="text-[#55d3a6]">
                  {' '}El mismo control.
                </span>
              </h1>

              <p className="mt-5 max-w-md text-sm font-medium leading-7 text-slate-300">
                Usa tu token temporal para establecer una nueva contraseña
                y recuperar el acceso a todos tus despliegues.
              </p>
            </div>

            <div className="relative rounded-[22px] border border-white/[0.08] bg-white/[0.045] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#28B586]/10 text-[#55d3a6]">
                  <KeyRound className="h-4 w-4" />
                </div>

                <div>
                  <h3 className="text-sm font-black">
                    Restablecimiento protegido
                  </h3>

                  <p className="mt-1 text-xs font-medium leading-6 text-slate-400">
                    El token de recuperación es temporal y solo debe utilizarse
                    para completar este proceso.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Form */}
          <section className="px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
            <button
              type="button"
              onClick={onBack}
              className="mb-9 inline-flex items-center gap-2 text-xs font-black text-[#64748B] transition hover:text-[#1C7F62]"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancelar y volver
            </button>

            <div className="mx-auto max-w-lg">
              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF7F1] text-[#1C7F62]">
                  <Lock className="h-5 w-5" />
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#28B586]">
                  Nueva contraseña
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-[#172838]">
                  Restablece tu acceso
                </h2>

                <p className="mt-3 text-sm font-medium leading-6 text-[#64748B]">
                  Confirma tu token temporal y establece una nueva
                  contraseña para tu cuenta.
                </p>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold leading-5 text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success ? (
                <div>
                  <div className="rounded-[22px] border border-[#b9ddcd] bg-[#edf9f3] p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#1C7F62] shadow-sm">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>

                    <h3 className="mt-4 text-base font-black text-[#176c53]">
                      Contraseña actualizada
                    </h3>

                    <p className="mx-auto mt-2 max-w-sm text-xs font-medium leading-5 text-[#477567]">
                      El restablecimiento se completó correctamente.
                      Ya puedes ingresar con tu nueva contraseña.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onLoginSuccess}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#172838] px-5 py-3.5 text-xs font-black text-white shadow-[0_12px_28px_rgba(23,40,56,0.18)] transition hover:bg-[#1F3141]"
                  >
                    Ir a iniciar sesión
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="reset-token"
                      className="mb-2 block text-xs font-black text-[#334e5e]"
                    >
                      Token de seguridad
                    </label>

                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />

                      <input
                        id="reset-token"
                        type="text"
                        value={token}
                        onChange={(event) =>
                          setToken(event.target.value)
                        }
                        placeholder="Token temporal"
                        autoComplete="off"
                        required
                        className="w-full rounded-xl border border-[#d6dfdb] bg-white py-3.5 pl-11 pr-4 font-mono text-xs font-bold text-[#1C7F62] outline-none transition placeholder:font-sans placeholder:text-[#b3bfba] focus:border-[#28B586] focus:ring-4 focus:ring-[#28B586]/10"
                      />
                    </div>
                  </div>

                  <PasswordField
                    id="new-password"
                    label="Nueva contraseña"
                    value={newPassword}
                    onChange={setNewPassword}
                    visible={showPassword}
                    onToggle={() =>
                      setShowPassword((current) => !current)
                    }
                    autoComplete="new-password"
                  />

                  <PasswordField
                    id="confirm-password"
                    label="Confirmar contraseña"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    visible={showConfirmation}
                    onToggle={() =>
                      setShowConfirmation((current) => !current)
                    }
                    autoComplete="new-password"
                  />

                  <div className="rounded-2xl border border-[#e2e8e5] bg-[#f8fbf9] p-4">
                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.14em] text-[#94A3B8]">
                      Requisitos
                    </p>

                    <PasswordCheck
                      valid={passwordChecks.minLength}
                      label="Al menos 6 caracteres"
                    />

                    <PasswordCheck
                      valid={passwordChecks.matches}
                      label="Las contraseñas coinciden"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#28B586] px-5 py-3.5 text-xs font-black text-white shadow-[0_12px_28px_rgba(40,181,134,0.24)] transition hover:bg-[#239C76] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      <>
                        Restablecer contraseña
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-black text-[#334e5e]"
      >
        {label}
      </label>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />

        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="••••••••"
          autoComplete={autoComplete}
          required
          className="w-full rounded-xl border border-[#d6dfdb] bg-white py-3.5 pl-11 pr-11 text-sm font-semibold text-[#172838] outline-none transition placeholder:text-[#b3bfba] focus:border-[#28B586] focus:ring-4 focus:ring-[#28B586]/10"
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            visible ? 'Ocultar contraseña' : 'Mostrar contraseña'
          }
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] transition hover:text-[#1C7F62]"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function PasswordCheck({ valid, label }) {
  return (
    <div
      className={`flex items-center gap-2 text-[11px] font-bold ${
        valid ? 'text-[#1C7F62]' : 'text-[#94A3B8]'
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full ${
          valid
            ? 'bg-[#CFE4D6] text-[#1C7F62]'
            : 'bg-[#e8eeeb] text-[#94A3B8]'
        }`}
      >
        <Check className="h-2.5 w-2.5" />
      </span>

      {label}
    </div>
  );
}