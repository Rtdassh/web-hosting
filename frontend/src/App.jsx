import React, { useEffect, useState } from 'react';
import { Globe, Sparkles, FileText, ShieldCheck } from 'lucide-react';

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

import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';


function AuthenticatedApp({ onLogout }) {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'pricing' | 'billing' | 'admin'
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleInstanceDeployed = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col selection:bg-brand-500 selection:text-white">
      <Navbar onLogout={onLogout} />

      {/* Sub-navbar de Navegación por Módulos */}
      <div className="bg-white border-b border-[#e2e8f0] px-6 lg:px-12 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1 sm:space-x-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition duration-150 btn-tactile cursor-pointer ${currentView === 'dashboard'
              ? 'bg-brand-50 text-brand-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Mis Sitios
          </button>
          <button
            onClick={() => setCurrentView('pricing')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition duration-150 btn-tactile cursor-pointer ${currentView === 'pricing'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Planes & Suscripciones
          </button>
          <button
            onClick={() => setCurrentView('billing')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition duration-150 btn-tactile cursor-pointer ${currentView === 'billing'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Facturación & Recibos
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setCurrentView('admin')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition duration-150 btn-tactile cursor-pointer ${currentView === 'admin'
                ? 'bg-amber-50 text-amber-700 shadow-sm'
                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50/50'
                }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Consola Admin
            </button>
          )}
        </div>
        <div className="hidden sm:block text-[11px] font-mono text-slate-400">
          Plan Activo: <strong className="text-slate-700">{user?.plan?.name || 'Free'}</strong>
        </div>
      </div>

      <div className="flex-1">
        <div key={currentView} className="view-enter">
          {currentView === 'dashboard' && (
            <DashboardPage
              onDeployClick={() => setIsDeployOpen(true)}
              refreshKey={refreshKey}
            />
          )}

          {currentView === 'pricing' && (
            <PricingPage
              currentPlan={user?.plan?.name || 'Free'}
              onBack={() => setCurrentView('dashboard')}
              onGoToBilling={() => setCurrentView('billing')}
            />
          )}

          {currentView === 'billing' && (
            <BillingHistoryPage
              onBack={() => setCurrentView('dashboard')}
              onGoToPricing={() => setCurrentView('pricing')}
            />
          )}

          {currentView === 'admin' && (
            <AdminDashboardPage
              onBack={() => setCurrentView('dashboard')}
            />
          )}
        </div>
      </div>

      <DeployModal
        isOpen={isDeployOpen}
        onClose={() => setIsDeployOpen(false)}
        onInstanceDeployed={handleInstanceDeployed}
      />

      <footer className="border-t border-[#e2e8f0] bg-white py-6 text-center text-xs text-[#64748b]">
        Codrop • De tu código a la web, sin complicaciones.
      </footer>
    </div>
  );
}


export function AppContent() {
  const { isAuthenticated } = useAuth();
  const [resetToken, setResetToken] = useState(() =>
    new URLSearchParams(window.location.search).get('reset_token') || ''
  );
  const [screen, setScreen] = useState(() =>
    new URLSearchParams(window.location.search).get('reset_token') ? 'reset-password' : 'landing'
  );
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('reset_token')) {
      url.searchParams.delete('reset_token');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  }, []);
  const [verificationEmail, setVerificationEmail] = useState('');

  const navigateToSection = (sectionId) => {
    if (screen !== 'landing') {
      setScreen('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 80);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleGoHome = () => {
    if (screen !== 'landing') {
      setScreen('landing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isAuthenticated && screen !== 'reset-password') {
    return <AuthenticatedApp onLogout={() => setScreen('landing')} />;
  }

  if (screen === 'register') {
    return (
      <Register
        onHome={handleGoHome}
        onLogin={() => setScreen('login')}
        onNavigateSection={navigateToSection}
        onVerification={(email) => {
          setVerificationEmail(email);
          setScreen('verification');
        }}
      />
    );
  }

  if (screen === 'verification') {
    return (
      <Verification
        email={verificationEmail}
        onHome={handleGoHome}
        onLogin={() => setScreen('login')}
        onNavigateSection={navigateToSection}
      />
    );
  }

  if (screen === 'forgot-password') {
    return (
      <ForgotPassword
        onHome={handleGoHome}
        onLogin={() => setScreen('login')}
        onRegister={() => setScreen('register')}
        onNavigateSection={navigateToSection}
        onBack={() => setScreen('login')}
        onGoToReset={(token) => {
          setResetToken(token);
          setScreen('reset-password');
        }}
      />
    );
  }

  if (screen === 'reset-password') {
    return (
      <ResetPassword
        initialToken={resetToken}
        onHome={handleGoHome}
        onLogin={() => setScreen('login')}
        onRegister={() => setScreen('register')}
        onNavigateSection={navigateToSection}
        onBack={() => setScreen('forgot-password')}
        onLoginSuccess={() => setScreen('login')}
      />
    );
  }

  if (screen === 'login') {
    return (
      <Login
        onHome={handleGoHome}
        onRegister={() => setScreen('register')}
        onForgotPassword={() => setScreen('forgot-password')}
        onNavigateSection={navigateToSection}
      />
    );
  }

  return (
    <Landing
      onLogin={() => setScreen('login')}
      onRegister={() => setScreen('register')}
      onNavigateSection={navigateToSection}
    />
  );
}


export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}