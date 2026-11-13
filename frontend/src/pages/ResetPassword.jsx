import { getApiErrorMessage, getNewPasswordError } from '../services/apiErrors';
import React, { useEffect, useMemo, useState } from 'react';
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
import AuthBrandAccent from '../components/mascot/AuthBrandAccent';
import { authService } from '../services/api';

export default function ResetPassword({
  initialToken = '',
  onHome,
  onLogin,
  onRegister,
  onNavigateSection,
  onBack,
  onLoginSuccess,
}) {
  const [token, setToken] = useState(initialToken);

  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
    }
  }, [initialToken]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const passwordChecks = useMemo(
    () => ({
      minLength: Array.from(newPassword).length >= 8,
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

    const passwordError = getNewPasswordError(newPassword);

    if (passwordError) {
      setError(passwordError);
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
        getApiErrorMessage(
          requestError,
          'El token es inválido o ha expirado.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f9f7] bg-brand-stripes-subtle text-[#172838]">

      <PublicNavbar
        variant="reset-password"
        onHome={onHome}
        onLogin={onLogin || onBack || onLoginSuccess}
        onRegister={onRegister}
        onNavigateSection={onNavigateSection}
      />

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

        <div className="mt-14 grid w-full rounded-[30px] border border-[#dce7e2] bg-white shadow-[0_28px_80px_rgba(23,40,56,0.11)] lg:mt-0 lg:grid-cols-[0.9fr_1.1fr]">

          {/* Brand side */}
          <section className="relative hidden overflow-hidden rounded-l-[30px] border-r border-[#dce7e2] bg-gradient-to-br from-[#f4f9f7] via-[#ecf6f1] to-[#e4f2eb] p-10 text-[#172838] lg:flex lg:flex-col lg:justify-between">

            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#28B586]/15 blur-3xl" />

            <div className="relative">

              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[13px] font-black uppercase tracking-[0.14em] text-emerald-700">

                <ShieldCheck className="h-4 w-4 text-emerald-600" />

                Seguridad Codrop

              </span>

              <h1 className="mt-6 max-w-md text-[40px] font-black leading-[1.08] tracking-[-0.045em] text-[#172838]">

                Una nueva clave.

                <span className="text-[#28B586]">
                  {' '}El mismo control.
                </span>

              </h1>

              <p className="mt-5 max-w-md text-[16px] font-medium leading-7 text-[#64748B]">
                Usa tu token temporal para establecer una nueva contraseña
                y recuperar el acceso a todos tus despliegues.
              </p>

            </div>

            <div className="relative rounded-[22px] border border-[#d6e5dd] bg-white/85 p-5 shadow-sm backdrop-blur-sm">

              <div className="flex items-start gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-500/10 text-emerald-600">

                  <KeyRound className="h-5 w-5" />

                </div>

                <div>

                  <h3 className="text-[16px] font-black text-[#172838]">
                    Restablecimiento protegido
                  </h3>

                  <p className="mt-1 text-[14px] font-medium leading-6 text-[#64748B]">
                    El token de recuperación es temporal y solo debe utilizarse
                    para completar este proceso.
                  </p>

                </div>

              </div>

            </div>

          </section>

          {/* Form */}
          <section className="relative rounded-[30px] px-6 py-8 sm:px-10 sm:py-10 lg:rounded-l-none lg:px-14 lg:py-12">

            <AuthBrandAccent />

            <button
              type="button"
              onClick={onBack}
              className="btn-tactile brand-focus mb-9 inline-flex cursor-pointer items-center gap-2 text-[14px] font-black text-[#64748B] transition duration-150 hover:text-[#1C7F62]"
            >
              <ArrowLeft className="h-5 w-5" />
              Cancelar y volver
            </button>

            <div className="mx-auto max-w-lg">

              <div className="mb-8">

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF7F1] text-[#1C7F62]">

                  <Lock className="h-6 w-6" />

                </div>

                <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#28B586]">
                  Nueva contraseña
                </p>

                <h2 className="mt-2 text-[34px] font-black tracking-[-0.035em] text-[#172838]">
                  Restablece tu acceso
                </h2>

                <p className="mt-3 text-[16px] font-medium leading-7 text-[#64748B]">
                  Confirma tu token temporal y establece una nueva
                  contraseña para tu cuenta.
                </p>

              </div>

              {error && (
                <div
                  role="alert"
                  className="fade-slide-down mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-[14px] font-semibold leading-6 text-red-700"
                >

                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <span>
                    {error}
                  </span>

                </div>
              )}

              {success ? (
                <div className="scale-pop-in">

                  <div className="rounded-[22px] border border-[#b9ddcd] bg-[#edf9f3] p-6 text-center">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#1C7F62] shadow-sm">

                      <CheckCircle2 className="h-6 w-6" />

                    </div>

                    <h3 className="mt-4 text-[19px] font-black text-[#176c53]">
                      Contraseña actualizada
                    </h3>

                    <p className="mx-auto mt-2 max-w-sm text-[14px] font-medium leading-6 text-[#477567]">
                      El restablecimiento se completó correctamente.
                      Ya puedes ingresar con tu nueva contraseña.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={onLoginSuccess}
                    className="btn-tactile brand-focus mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#172838] px-5 py-3.5 text-[15px] font-black text-white shadow-[0_12px_28px_rgba(23,40,56,0.18)] transition duration-150 hover:bg-[#1F3141]"
                  >
                    Ir a iniciar sesión
                    <ArrowRight className="h-5 w-5" />
                  </button>

                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >

                  <div>

                    <label
                      htmlFor="reset-token"
                      className="mb-2 block text-[15px] font-black text-[#334e5e]"
                    >
                      Token de seguridad
                    </label>

                    <div className="relative">

                      <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />

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
                        className="w-full rounded-xl border border-[#d6dfdb] bg-white py-3.5 pl-12 pr-4 font-mono text-[14px] font-bold text-[#1C7F62] outline-none transition placeholder:font-sans placeholder:text-[#b3bfba] focus:border-[#28B586] focus:ring-4 focus:ring-[#28B586]/10"
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

                    <p className="mb-3 text-[12px] font-black uppercase tracking-[0.13em] text-[#94A3B8]">
                      Requisitos
                    </p>

                    <PasswordCheck
                      valid={passwordChecks.minLength}
                      label="Al menos 8 caracteres"
                    />

                    <PasswordCheck
                      valid={passwordChecks.matches}
                      label="Las contraseñas coinciden"
                    />

                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-tactile brand-focus flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#28B586] px-5 py-3.5 text-[15px] font-black text-white shadow-[0_12px_28px_rgba(40,181,134,0.24)] transition duration-150 hover:bg-[#239C76] disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      <>
                        Restablecer contraseña
                        <ArrowRight className="h-5 w-5" />
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
        className="mb-2 block text-[15px] font-black text-[#334e5e]"
      >
        {label}
      </label>

      <div className="relative">

        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />

        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder="••••••••"
          autoComplete={autoComplete}
          required
          className="w-full rounded-xl border border-[#d6dfdb] bg-white py-3.5 pl-12 pr-12 text-[16px] font-semibold text-[#172838] outline-none transition placeholder:text-[#b3bfba] focus:border-[#28B586] focus:ring-4 focus:ring-[#28B586]/10"
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            visible
              ? 'Ocultar contraseña'
              : 'Mostrar contraseña'
          }
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] transition hover:text-[#1C7F62]"
        >
          {visible ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>

      </div>

    </div>
  );
}

function PasswordCheck({
  valid,
  label,
}) {
  return (
    <div
      className={`flex items-center gap-2 text-[13px] font-bold ${
        valid
          ? 'text-[#1C7F62]'
          : 'text-[#94A3B8]'
      }`}
    >

      <span
        className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${
          valid
            ? 'bg-[#CFE4D6] text-[#1C7F62]'
            : 'bg-[#e8eeeb] text-[#94A3B8]'
        }`}
      >

        <Check className="h-3 w-3" />

      </span>

      {label}

    </div>
  );
}