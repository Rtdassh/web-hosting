import React, { useState } from 'react';
import {
  LogOut,
  X,
  AlertCircle,
  ChevronDown,
  Server,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import codropIsotipo from '../../assets/codrop-isotipo.png';

export default function Navbar({ onLogout }) {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    onLogout();
    logout();
    setShowLogoutModal(false);
  };

  const getInitial = () => {
    if (user?.full_name) {
      return user.full_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'C';
  };

  /* =========================================================
     INDICADOR PERMANENTE DE CUOTA (PLAN VIGENTE)
  ========================================================= */
  const activeInstances = user?.plan?.active_instances ?? 0;
  const maxInstances = user?.plan?.max_instances ?? 0;
  const availableSlots = user?.plan?.available_slots ?? 0;
  const quotaPercentage =
    maxInstances > 0
      ? Math.min(100, Math.round((activeInstances / maxInstances) * 100))
      : 0;
  const isQuotaFull = maxInstances > 0 && activeInstances >= maxInstances;

  return (
    <>
      {/* =====================================================
          NAVBAR PRINCIPAL
      ====================================================== */}
      <header className="h-[74px] bg-white border-b border-[#e2e8f0] sticky top-0 z-40">
        <div className="max-w-[1380px] mx-auto h-full px-6 lg:px-12 flex items-center justify-between">

          {/* Marca Codrop */}
          <div className="flex items-center gap-3">
            <img
              src={codropIsotipo}
              alt="Codrop"
              className="w-[70px] h-[46px] object-contain flex-shrink-0"
            />
            <div>
              <div className="text-[22px] leading-none font-bold tracking-[-0.025em]">
                <span className="text-brand-500">Co</span>
                <span className="text-navy-900">drop</span>
              </div>
              <p className="mt-1 text-[10px] text-[#64748b]">
                Panel de despliegues
              </p>
            </div>
          </div>

          {/* Acciones de Usuario y Cuota */}
          <div className="flex items-center gap-3">

            {/* Widget Permanente de Cuota de Instancias */}
            {user?.plan && (
              <div className="hidden lg:block">
                <div className="min-w-[205px] rounded-[12px] border border-[#e2e8f0] bg-[#fbfdfc] px-3.5 py-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-[8px] border ${
                          isQuotaFull
                            ? 'border-amber-200 bg-amber-50 text-amber-600'
                            : 'border-brand-100 bg-brand-50 text-brand-600'
                        }`}
                      >
                        <Server className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
                          Cuota {user.plan.name || 'Free'}
                        </p>
                        <p className="text-[12px] font-bold text-navy-900">
                          {activeInstances}{' '}
                          <span className="text-[#94a3b8]">/</span>{' '}
                          {maxInstances}{' '}
                          <span className="text-[11px] font-normal text-[#64748b]">
                            sitios
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isQuotaFull
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-brand-50 text-brand-700'
                        }`}
                      >
                        {isQuotaFull
                          ? 'Límite alcanzado'
                          : `${availableSlots} libre${availableSlots === 1 ? '' : 's'}`}
                      </span>
                    </div>
                  </div>
                  {/* Barra de Progreso */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#edf2f0]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isQuotaFull ? 'bg-amber-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${quotaPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Identidad del Usuario */}
            {user && (
              <div className="hidden md:block text-right">
                <p className="text-[12px] font-semibold text-navy-900">
                  {user.full_name || 'Usuario Codrop'}
                </p>
                <p className="mt-0.5 text-[10px] text-[#94a3b8]">
                  {user.email}
                </p>
              </div>
            )}

            {/* Botón de Perfil / Logout */}
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="group h-[42px] pl-2 pr-3 rounded-[12px] border border-[#e2e8f0] bg-white hover:bg-[#f8fbfa] flex items-center gap-2.5 transition duration-150 btn-tactile cursor-pointer"
              aria-label="Menú de usuario"
            >
              <div className="w-8 h-8 rounded-[9px] bg-brand-50 border border-brand-100 flex items-center justify-center text-[12px] font-bold text-brand-700">
                {getInitial()}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-navy-900 transition-transform duration-150 group-hover:translate-y-0.5" />
            </button>

          </div>
        </div>
      </header>

      {/* =====================================================
          MODAL DE CONFIRMACIÓN DE LOGOUT (ACCESIBLE)
      ====================================================== */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-navy-900/40 backdrop-blur-[3px] modal-backdrop-animate"
            onClick={() => setShowLogoutModal(false)}
          />

          <div
            className="relative w-full max-w-[430px] bg-white border border-[#e2e8f0] rounded-[22px] shadow-[0_30px_80px_rgba(23,40,56,0.18)] p-7 modal-dialog-animate"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              aria-label="Cerrar"
              className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-navy-900 hover:bg-[#f1f5f4] transition duration-150 btn-tactile cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-[14px] bg-brand-50 border border-brand-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-brand-600" />
            </div>

            <h2
              id="logout-title"
              className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-navy-900"
            >
              ¿Cerrar sesión?
            </h2>

            <p className="mt-2 text-[13px] leading-6 text-[#64748b]">
              Tu sesión actual en Codrop se cerrará y volverás a la página principal.
            </p>

            <div className="mt-7 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="h-10 px-4 rounded-[9px] bg-white border border-[#e2e8f0] hover:bg-[#f8faf9] text-navy-900 text-[13px] font-semibold transition duration-150 btn-tactile cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="h-10 px-4 rounded-[9px] bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(40,181,134,0.18)] transition duration-150 btn-tactile cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
