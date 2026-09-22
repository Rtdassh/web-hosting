import React, { useState } from 'react';
import Navbar from './components/layout/Navbar';
import DashboardPage from './pages/DashboardPage';
import DeployModal from './components/instances/DeployModal';

export default function App() {
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleInstanceDeployed = (newInstance) => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar onDeployClick={() => setIsDeployOpen(true)} />
      
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

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        CloudPaaS • Web Hosting Platform
      </footer>
    </div>
  );
}
