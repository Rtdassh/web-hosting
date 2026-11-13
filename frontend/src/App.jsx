import React, { useEffect, useState } from 'react';

import Navbar from './components/layout/Navbar';
import ProfilePage from './pages/ProfilePage';
import AccountQuota from './components/layout/AccountQuota';
import AccountNavigation from './components/layout/AccountNavigation';
import DashboardPage from './pages/DashboardPage';
import SiteHealthNotifications from './components/instances/SiteHealthNotifications';
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
import ErrorBoundary from './components/system/ErrorBoundary';

function AuthenticatedApp({ onLogout }) {
  const { user } = useAuth();
  const [sidebarTarget, setSidebarTarget] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'pricing' | 'billing' | 'admin'
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deployment, setDeployment] = useState(null);

  const handleInstanceDeployed = () => {
    setDeployment(null);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col selection:bg-brand-500 selection:text-white">
      <SiteHealthNotifications />
      <Navbar onLogout={onLogout} onProfile={() => setCurrentView('profile')} />

      <div className="flex-1 bg-[#f5f9f7]">
        <div className="mx-auto flex max-w-[1380px] flex-col lg:flex-row">
          <aside className="w-full shrink-0 px-5 pt-6 lg:w-[260px] lg:px-6 lg:py-8">
            <div className="space-y-5 lg:sticky lg:top-[98px] lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
              <AccountNavigation currentView={currentView} onNavigate={setCurrentView} role={user?.role} />
              <AccountQuota user={user} />
              <div ref={setSidebarTarget} />
            </div>
          </aside>
        <div key={currentView} className="view-enter min-w-0 flex-1">
          {currentView === 'dashboard' && (
            <DashboardPage
              onDeployClick={() => {
                if (deployment?.status !== 'creating') setIsDeployOpen(true);
              }}
              onNavigateAccount={setCurrentView}
              accountRole={user?.role}
              sidebarTarget={sidebarTarget}
              embedded
              refreshKey={refreshKey}
              deployment={deployment}
              onDismissDeployment={() => setDeployment(null)}
            />
          )}

          {currentView === 'profile' && <ProfilePage onLogout={onLogout} />}

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

      </div>

      <DeployModal
        isOpen={isDeployOpen}
        onClose={() => setIsDeployOpen(false)}
        onInstanceDeployed={handleInstanceDeployed}
        onDeploymentStarted={(name) => {
          setDeployment({ name, status: 'creating' });
          setIsDeployOpen(false);
          setCurrentView('dashboard');
        }}
        onDeploymentFailed={(message) => {
          setDeployment((previous) => ({ ...previous, status: 'failed', message }));
          setRefreshKey((previous) => previous + 1);
        }}
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
  const [verificationToken, setVerificationToken] = useState(() =>
    new URLSearchParams(window.location.search).get('token') || ''
  );
  const [screen, setScreen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset_token')) return 'reset-password';
    if (params.get('token')) return 'verification';
    return 'landing';
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    if (url.searchParams.has('reset_token')) {
      url.searchParams.delete('reset_token');
      changed = true;
    }
    if (url.searchParams.has('token')) {
      url.searchParams.delete('token');
      changed = true;
    }
    if (changed) {
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
        token={verificationToken}
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
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
