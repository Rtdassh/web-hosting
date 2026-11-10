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

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);


  const handleLogout = () => {
    onLogout();
    logout();
    setShowLogoutModal(false);
  };


  const getInitial = () => {
    if (user?.full_name) {
      return user.full_name
        .charAt(0)
        .toUpperCase();
    }

    if (user?.email) {
      return user.email
        .charAt(0)
        .toUpperCase();
    }

    return 'C';
  };


  /* =========================================================
     QUOTA
  ========================================================= */

  const activeInstances =
    user?.plan?.active_instances ?? 0;

  const maxInstances =
    user?.plan?.max_instances ?? 0;

  const availableSlots =
    user?.plan?.available_slots ?? 0;

  const quotaPercentage =
    maxInstances > 0
      ? Math.min(
          100,
          Math.round(
            (activeInstances / maxInstances) * 100
          )
        )
      : 0;

  const isQuotaFull =
    maxInstances > 0 &&
    activeInstances >= maxInstances;


  return (
    <>
      {/* =====================================================
          NAVBAR
      ====================================================== */}
      <header className="sticky top-0 z-40 h-[74px] border-b border-[#e2e8f0] bg-white">

        <div className="mx-auto flex h-full max-w-[1380px] items-center justify-between px-6 lg:px-12">


          {/* Marca */}
          <div className="flex items-center gap-3">

            <img
              src={codropIsotipo}
              alt="Codrop"
              className="h-[46px] w-[70px] flex-shrink-0 object-contain"
            />


            <div>

              <div className="text-[22px] font-bold leading-none tracking-[-0.025em]">

                <span className="text-brand-500">
                  Co
                </span>

                <span className="text-navy-900">
                  drop
                </span>

              </div>


              <p className="mt-1 text-[10px] text-[#64748b]">
                Panel de despliegues
              </p>

            </div>

          </div>


          {/* Acciones */}
          <div className="flex items-center gap-3">


            {/* =================================================
                CUOTA DEL PLAN
            ================================================== */}
            {user?.plan && (
              <div className="hidden lg:block">

                <div className="min-w-[205px] rounded-[12px] border border-[#e2e8f0] bg-[#fbfdfc] px-3.5 py-2">

                  <div className="flex items-center justify-between gap-4">

                    <div className="flex items-center gap-2">

                      <div
                        className={`
                          flex h-7 w-7
                          items-center justify-center
                          rounded-[8px]
                          border
                          ${
                            isQuotaFull
                              ? 'border-amber-200 bg-amber-50 text-amber-600'
                              : 'border-brand-100 bg-brand-50 text-brand-600'
                          }
                        `}
                      >
                        <Server className="h-3.5 w-3.5" />
                      </div>


                      <div>

                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                          Sitios activos
                        </p>

                        <p className="mt-0.5 text-[11px] font-bold text-navy-900">

                          {activeInstances}
                          {' / '}
                          {maxInstances}

                          <span className="ml-1.5 font-medium text-[#64748b]">
                            · {user.plan.name}
                          </span>

                        </p>

                      </div>

                    </div>


                    <span
                      className={`
                        text-[9px]
                        font-bold
                        ${
                          isQuotaFull
                            ? 'text-amber-600'
                            : 'text-brand-600'
                        }
                      `}
                    >
                      {availableSlots}{' '}
                      {availableSlots === 1
                        ? 'libre'
                        : 'libres'}
                    </span>

                  </div>


                  {/* Barra de cuota */}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8eeeb]">

                    <div
                      className={`
                        h-full rounded-full
                        transition-all duration-500
                        ${
                          isQuotaFull
                            ? 'bg-amber-500'
                            : 'bg-brand-500'
                        }
                      `}
                      style={{
                        width: `${quotaPercentage}%`,
                      }}
                    />

                  </div>

                </div>

              </div>
            )}


            {/* Usuario */}
            {user && (
              <div className="hidden text-right md:block">

                <p className="text-[12px] font-semibold text-navy-900">
                  {user.full_name ||
                    'Usuario Codrop'}
                </p>


                <p className="mt-0.5 text-[10px] text-[#94a3b8]">
                  {user.email}
                </p>

              </div>
            )}


            <button
              type="button"
              onClick={() =>
                setShowLogoutModal(true)
              }
              className="group flex h-[42px] cursor-pointer items-center gap-2.5 rounded-[12px] border border-[#e2e8f0] bg-white pl-2 pr-3 transition duration-150 hover:bg-[#f8fbfa] btn-tactile"
            >

              <div className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-brand-100 bg-brand-50 text-[12px] font-bold text-brand-700">
                {getInitial()}
              </div>


              <ChevronDown className="h-3.5 w-3.5 text-[#94a3b8] transition-transform duration-150 group-hover:translate-y-0.5 group-hover:text-navy-900" />

            </button>

          </div>

        </div>

      </header>


      {/* =====================================================
          MODAL LOGOUT
      ====================================================== */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">


          <div
            className="absolute inset-0 bg-navy-900/40 backdrop-blur-[3px] modal-backdrop-animate"
            onClick={() =>
              setShowLogoutModal(false)
            }
          />


          <div className="relative w-full max-w-[430px] rounded-[22px] border border-[#e2e8f0] bg-white p-7 shadow-[0_30px_80px_rgba(23,40,56,0.18)] modal-dialog-animate">


            <button
              type="button"
              onClick={() =>
                setShowLogoutModal(false)
              }
              aria-label="Cerrar"
              className="absolute right-5 top-5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#64748b] transition duration-150 hover:bg-[#f1f5f4] hover:text-navy-900 btn-tactile"
            >
              <X className="h-4 w-4" />
            </button>


            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-brand-100 bg-brand-50">

              <AlertCircle className="h-5 w-5 text-brand-600" />

            </div>


            <h2 className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-navy-900">
              ¿Cerrar sesión?
            </h2>


            <p className="mt-2 text-[13px] leading-6 text-[#64748b]">
              Tu sesión actual en Codrop se cerrará y volverás a la página principal.
            </p>


            <div className="mt-7 flex items-center justify-end gap-3">


              <button
                type="button"
                onClick={() =>
                  setShowLogoutModal(false)
                }
                className="h-10 cursor-pointer rounded-[9px] border border-[#e2e8f0] bg-white px-4 text-[13px] font-semibold text-navy-900 transition duration-150 hover:bg-[#f8faf9] btn-tactile"
              >
                Cancelar
              </button>


              <button
                type="button"
                onClick={handleLogout}
                className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[9px] bg-brand-500 px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(40,181,134,0.18)] transition duration-150 hover:bg-brand-600 btn-tactile"
              >

                <LogOut className="h-4 w-4" />

                Cerrar sesión

              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}