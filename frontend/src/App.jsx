import React, { useEffect, useState } from 'react';
import {
  Globe,
  Sparkles,
  FileText,
  ShieldCheck,
} from 'lucide-react';

import Navbar from './components/layout/Navbar';
import DashboardPage from './pages/DashboardPage';
import DeployModal from './components/instances/DeployModal';
import PricingPage from './pages/PricingPage';
import BillingHistoryPage from './pages/BillingHistoryPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Verification from './pages/Verification';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import {
  AuthProvider,
  useAuth,
} from './context/AuthContext';

import {
  ToastProvider,
} from './components/ui/Toast';

import ErrorBoundary from './components/system/ErrorBoundary';


function AuthenticatedApp({ onLogout }) {
  const { user } = useAuth();

  const [currentView, setCurrentView] =
    useState('dashboard');

  const [isDeployOpen, setIsDeployOpen] =
    useState(false);

  const [refreshKey, setRefreshKey] =
    useState(0);


  const handleInstanceDeployed = () => {
    setRefreshKey((prev) => prev + 1);
  };


  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col selection:bg-brand-500 selection:text-white">

      <Navbar
        onLogout={onLogout}
      />


      {/* =====================================================
          SUB-NAVBAR
      ====================================================== */}
      <div className="bg-white border-b border-[#e2e8f0] px-6 lg:px-12 py-2 flex items-center justify-between text-xs">

        <div className="flex items-center space-x-1 sm:space-x-4">


          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className={`
              inline-flex items-center gap-1.5
              px-3 py-1.5 rounded-lg
              font-bold transition duration-150
              btn-tactile cursor-pointer
              ${
                currentView === 'dashboard'
                  ? 'bg-brand-50 text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }
            `}
          >
            <Globe className="w-3.5 h-3.5" />
            Mis Sitios
          </button>


          <button
            type="button"
            onClick={() => setCurrentView('pricing')}
            className={`
              inline-flex items-center gap-1.5
              px-3 py-1.5 rounded-lg
              font-bold transition duration-150
              btn-tactile cursor-pointer
              ${
                currentView === 'pricing'
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }
            `}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Planes & Suscripciones
          </button>


          <button
            type="button"
            onClick={() => setCurrentView('billing')}
            className={`
              inline-flex items-center gap-1.5
              px-3 py-1.5 rounded-lg
              font-bold transition duration-150
              btn-tactile cursor-pointer
              ${
                currentView === 'billing'
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }
            `}
          >
            <FileText className="w-3.5 h-3.5" />
            Facturación & Recibos
          </button>


          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => setCurrentView('admin')}
              className={`
                inline-flex items-center gap-1.5
                px-3 py-1.5 rounded-lg
                font-bold transition duration-150
                btn-tactile cursor-pointer
                ${
                  currentView === 'admin'
                    ? 'bg-amber-50 text-amber-700 shadow-sm'
                    : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50/50'
                }
              `}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Consola Admin
            </button>
          )}

        </div>


        <div className="hidden sm:block text-[11px] font-mono text-slate-400">

          Plan Activo:{' '}

          <strong className="text-slate-700">
            {user?.plan?.name || 'Free'}
          </strong>

        </div>

      </div>


      {/* =====================================================
          CONTENIDO
      ====================================================== */}
      <div className="flex-1">

        <div
          key={currentView}
          className="view-enter"
        >

          {currentView === 'dashboard' && (
            <DashboardPage
              onDeployClick={() =>
                setIsDeployOpen(true)
              }
              refreshKey={refreshKey}
            />
          )}


          {currentView === 'pricing' && (
            <PricingPage
              currentPlan={
                user?.plan?.name || 'Free'
              }
              onBack={() =>
                setCurrentView('dashboard')
              }
              onGoToBilling={() =>
                setCurrentView('billing')
              }
            />
          )}


          {currentView === 'billing' && (
            <BillingHistoryPage
              onBack={() =>
                setCurrentView('dashboard')
              }
              onGoToPricing={() =>
                setCurrentView('pricing')
              }
            />
          )}


          {currentView === 'admin' && (
            <AdminDashboardPage
              onBack={() =>
                setCurrentView('dashboard')
              }
            />
          )}

        </div>

      </div>


      {/* =====================================================
          DEPLOY MODAL
      ====================================================== */}
      <DeployModal
        isOpen={isDeployOpen}
        onClose={() =>
          setIsDeployOpen(false)
        }
        onInstanceDeployed={
          handleInstanceDeployed
        }
      />


      {/* =====================================================
          FOOTER
      ====================================================== */}
      <footer className="border-t border-[#e2e8f0] bg-white py-6 text-center text-xs text-[#64748b]">
        Codrop • De tu código a la web, sin complicaciones.
      </footer>

    </div>
  );
}


export function AppContent() {
  const { isAuthenticated } = useAuth();


  /*
   * Capturamos los parámetros iniciales antes
   * de limpiar la URL.
   */
  const initialParams =
    new URLSearchParams(window.location.search);


  const [resetToken, setResetToken] =
    useState(
      () =>
        initialParams.get('reset_token') || ''
    );


  const [verificationToken] =
    useState(
      () =>
        initialParams.get('token') || ''
    );


  const [screen, setScreen] =
    useState(() => {

      if (
        initialParams.get('reset_token')
      ) {
        return 'reset-password';
      }


      if (
        initialParams.get('token')
      ) {
        return 'verification';
      }


      return 'landing';
    });


  const [
    verificationEmail,
    setVerificationEmail,
  ] = useState('');


  /*
   * Una vez capturados los tokens,
   * limpiamos la URL.
   */
  useEffect(() => {
    const url =
      new URL(window.location.href);

    let changed = false;


    if (
      url.searchParams.has('reset_token')
    ) {
      url.searchParams.delete(
        'reset_token'
      );

      changed = true;
    }


    if (
      url.searchParams.has('token')
    ) {
      url.searchParams.delete('token');

      changed = true;
    }


    if (changed) {
      window.history.replaceState(
        {},
        '',
        url.pathname +
          url.search +
          url.hash
      );
    }

  }, []);


  /* =========================================================
     LANDING NAVIGATION
  ========================================================= */

  const navigateToSection = (
    sectionId
  ) => {

    if (screen !== 'landing') {

      setScreen('landing');


      setTimeout(() => {

        const element =
          document.getElementById(
            sectionId
          );


        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
          });
        }

      }, 80);


      return;
    }


    const element =
      document.getElementById(
        sectionId
      );


    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
      });
    }
  };


  const handleGoHome = () => {

    if (screen !== 'landing') {
      setScreen('landing');
    }


    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };


  /* =========================================================
     AUTHENTICATED APP
  ========================================================= */

  if (
    isAuthenticated &&
    screen !== 'reset-password'
  ) {
    return (
      <AuthenticatedApp
        onLogout={() =>
          setScreen('landing')
        }
      />
    );
  }


  /* =========================================================
     REGISTER
  ========================================================= */

  if (screen === 'register') {
    return (
      <Register
        onHome={handleGoHome}

        onLogin={() =>
          setScreen('login')
        }

        onNavigateSection={
          navigateToSection
        }

        onVerification={(email) => {

          setVerificationEmail(email);

          setScreen(
            'verification'
          );
        }}
      />
    );
  }


  /* =========================================================
     VERIFICATION
  ========================================================= */

  if (screen === 'verification') {
    return (
      <Verification
        email={
          verificationEmail
        }

        token={
          verificationToken
        }

        onHome={
          handleGoHome
        }

        onLogin={() =>
          setScreen('login')
        }

        onNavigateSection={
          navigateToSection
        }
      />
    );
  }


  /* =========================================================
     FORGOT PASSWORD
  ========================================================= */

  if (
    screen === 'forgot-password'
  ) {
    return (
      <ForgotPassword
        onHome={
          handleGoHome
        }

        onLogin={() =>
          setScreen('login')
        }

        onRegister={() =>
          setScreen('register')
        }

        onNavigateSection={
          navigateToSection
        }

        onBack={() =>
          setScreen('login')
        }

        onGoToReset={(token) => {

          setResetToken(token);

          setScreen(
            'reset-password'
          );
        }}
      />
    );
  }


  /* =========================================================
     RESET PASSWORD
  ========================================================= */

  if (
    screen === 'reset-password'
  ) {
    return (
      <ResetPassword
        initialToken={
          resetToken
        }

        onHome={
          handleGoHome
        }

        onLogin={() =>
          setScreen('login')
        }

        onRegister={() =>
          setScreen('register')
        }

        onNavigateSection={
          navigateToSection
        }

        onBack={() =>
          setScreen(
            'forgot-password'
          )
        }

        onLoginSuccess={() =>
          setScreen('login')
        }
      />
    );
  }


  /* =========================================================
     LOGIN
  ========================================================= */

  if (screen === 'login') {
    return (
      <Login
        onHome={
          handleGoHome
        }

        onRegister={() =>
          setScreen('register')
        }

        onForgotPassword={() =>
          setScreen(
            'forgot-password'
          )
        }

        onNavigateSection={
          navigateToSection
        }
      />
    );
  }


  /* =========================================================
     LANDING
  ========================================================= */

  return (
    <Landing
      onLogin={() =>
        setScreen('login')
      }

      onRegister={() =>
        setScreen('register')
      }

      onNavigateSection={
        navigateToSection
      }
    />
  );
}


export default function App() {
  return (
    <ErrorBoundary>

      <AuthProvider>

        <ToastProvider>

          <AppContent />

        </ToastProvider>

      </AuthProvider>

    </ErrorBoundary>
  );
}