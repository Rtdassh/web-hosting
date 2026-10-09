import React, { useState } from 'react';
import Navbar from './components/layout/Navbar';
import DashboardPage from './pages/DashboardPage';
import DeployModal from './components/instances/DeployModal';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Verification from './pages/Verification';
import { AuthProvider, useAuth } from './context/AuthContext';

function AuthenticatedApp({ onLogout }) {
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleInstanceDeployed = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col selection:bg-brand-500 selection:text-white">
      <Navbar onLogout={onLogout} />

      <div className="flex-1">
        <DashboardPage
          onDeployClick={() => setIsDeployOpen(true)}
          refreshKey={refreshKey}
        />
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

  if (isAuthenticated) {
    return (
      <AuthenticatedApp
        onLogout={() => setScreen('landing')}
      />
    );
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
        onLogin={() => setScreen('login')}
      />
    );
  }

  if (screen === 'login') {
    return (
      <Login
        onHome={() => setScreen('landing')}
        onRegister={() => setScreen('register')}
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