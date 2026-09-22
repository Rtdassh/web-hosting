import React from 'react';
import { Server, LogOut, Terminal, Cloud } from 'lucide-react';

export default function Navbar({ onDeployClick }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">CloudPaaS</span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">Web Hosting</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onDeployClick}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-lg shadow-indigo-600/20 transition-all duration-150"
          >
            <Server className="w-4 h-4" />
            <span>Nuevo Despliegue</span>
          </button>
        </div>
      </div>
    </header>
  );
}
