import React, { useState } from 'react';
import {
  Cloud,
  LogOut,
  X,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onLogout }) {
  const { user, logout } = useAuth();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    // Primero indicamos a App.jsx que debe volver al Landing
    onLogout();

    // Después eliminamos la sesión/JWT
    logout();

    // Cerramos el modal
    setShowLogoutModal(false);
  };

  return (
    <>
      {/* Navbar */}
      <header className="h-[72px] bg-white border-b border-[#e2e8f0] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto h-full px-6 lg:px-12 flex items-center justify-between">

          {/* Marca */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-sm">
              <Cloud className="w-5 h-5 text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-semibold tracking-tight text-[#0f172a]">
                  CloudPaaS
                </span>

                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-blue-50 text-[#2563eb] text-[10px] font-semibold">
                  Web Hosting
                </span>
              </div>

              <p className="hidden sm:block text-[11px] text-[#64748b]">
                Panel de administración
              </p>
            </div>
          </div>

          {/* Usuario + cerrar sesión */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden md:block text-right">
                <p className="text-[13px] font-semibold text-[#0f172a]">
                  {user.full_name}
                </p>

                <p className="text-[11px] text-[#64748b]">
                  {user.email}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="h-10 px-4 rounded-[9px] border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#64748b] hover:text-[#0f172a] text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Modal de confirmación */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">

          {/* Fondo oscuro */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setShowLogoutModal(false)}
          />

          {/* Ventana */}
          <div className="relative w-full max-w-[430px] bg-white border border-[#e2e8f0] rounded-[18px] shadow-2xl p-7">

            {/* Botón cerrar */}
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              aria-label="Cerrar"
              className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-[#0f172a] hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icono */}
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#2563eb]" />
            </div>

            {/* Texto */}
            <h2 className="mt-5 text-[21px] font-semibold tracking-tight text-[#0f172a]">
              ¿Cerrar sesión?
            </h2>

            <p className="mt-2 text-[14px] leading-6 text-[#64748b]">
              ¿Estás seguro de que deseas cerrar sesión en CloudPaaS?
            </p>

            {/* Acciones */}
            <div className="mt-7 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="h-10 px-4 rounded-[9px] bg-white border border-[#e2e8f0] hover:bg-slate-50 text-[#0f172a] text-[13px] font-semibold transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="h-10 px-4 rounded-[9px] bg-[#2563eb] hover:bg-blue-700 text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
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