import React, { useState } from 'react';
import {
  LogOut,
  X,
  AlertCircle,
  ChevronDown,
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

  return (
    <>
      {/* =====================================================
          NAVBAR
      ====================================================== */}
      <header className="h-[74px] bg-white border-b border-[#e2e8f0] sticky top-0 z-40">
        <div className="max-w-[1380px] mx-auto h-full px-6 lg:px-12 flex items-center justify-between">

          {/* Marca */}
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


          {/* Usuario */}
          <div className="flex items-center gap-3">

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


            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="group h-[42px] pl-2 pr-3 rounded-[12px] border border-[#e2e8f0] bg-white hover:bg-[#f8fbfa] flex items-center gap-2.5 transition-colors"
            >

              <div className="w-8 h-8 rounded-[9px] bg-brand-50 border border-brand-100 flex items-center justify-center text-[12px] font-bold text-brand-700">
                {getInitial()}
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-navy-900 transition-colors" />

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
            className="absolute inset-0 bg-navy-900/40 backdrop-blur-[3px]"
            onClick={() => setShowLogoutModal(false)}
          />


          <div className="relative w-full max-w-[430px] bg-white border border-[#e2e8f0] rounded-[22px] shadow-[0_30px_80px_rgba(23,40,56,0.18)] p-7">

            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              aria-label="Cerrar"
              className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-navy-900 hover:bg-[#f1f5f4] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>


            <div className="w-12 h-12 rounded-[14px] bg-brand-50 border border-brand-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-brand-600" />
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
                onClick={() => setShowLogoutModal(false)}
                className="h-10 px-4 rounded-[9px] bg-white border border-[#e2e8f0] hover:bg-[#f8faf9] text-navy-900 text-[13px] font-semibold transition-colors"
              >
                Cancelar
              </button>


              <button
                type="button"
                onClick={handleLogout}
                className="h-10 px-4 rounded-[9px] bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(40,181,134,0.18)] transition-colors"
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