import React, { useState } from 'react';
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

      {/* Sub-navbar de Navegación por Módulos (Hitos 80% y 100%) */}
      <div className="bg-white border-b border-[#e2e8f0] px-6 lg:px-12 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1 sm:space-x-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              currentView === 'dashboard'
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Mis Sitios
          </button>
          <button
            onClick={() => setCurrentView('pricing')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              currentView === 'pricing'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Planes & Suscripciones
          </button>
          <button
            onClick={() => setCurrentView('billing')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              currentView === 'billing'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Facturación & Recibos
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setCurrentView('admin')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                currentView === 'admin'
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-amber-600 hover:text-amber-700'
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


function AppContent() {
  const { isAuthenticated } = useAuth();
  const [screen, setScreen] = useState('landing');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  if (isAuthenticated) {
    return <AuthenticatedApp onLogout={() => setScreen('landing')} />;
  }

  if (screen === 'register') {
    return (
      <Register
        onHome={() => setScreen('landing')}
        onLogin={() => setScreen('login')}
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
        onHome={() => setScreen('landing')}
        onLogin={() => setScreen('login')}
      />
    );
  }

  if (screen === 'forgot-password') {
    return (
      <ForgotPassword
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
        onBack={() => setScreen('login')}
        onLoginSuccess={() => setScreen('login')}
      />
    );
  }

  if (screen === 'login') {
    return (
      <Login
        onHome={() => setScreen('landing')}
        onRegister={() => setScreen('register')}
        onForgotPassword={() => setScreen('forgot-password')}
      />
    );
  }

  return (
    <Landing
      onLogin={() => setScreen('login')}
      onRegister={() => setScreen('register')}
    />
  );
}


export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}