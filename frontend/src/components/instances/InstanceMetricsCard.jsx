import React, { useEffect, useState } from 'react';
import { Cpu, HardDrive, RefreshCw } from 'lucide-react';
import { instanceService } from '../../services/api';

export default function InstanceMetricsCard({ instanceId, isRunning }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async () => {
    if (!instanceId || !isRunning) {
      setMetrics({
        cpu_percent: 0.0,
        memory_usage_mb: 0.0,
        memory_limit_mb: 128.0,
        memory_percent: 0.0,
        status: 'stopped'
      });
      return;
    }
    setLoading(true);
    try {
      const data = await instanceService.getMetrics(instanceId);
      setMetrics(data);
    } catch (err) {
      console.warn('Error al cargar métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (!isRunning) return;
    const interval = setInterval(fetchMetrics, 4000);
    return () => clearInterval(interval);
  }, [instanceId, isRunning]);

  if (!metrics) return null;

  const getProgressColor = (percent) => {
    if (percent < 70) return 'bg-emerald-500';
    if (percent < 90) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const cpuPercent = Number(metrics.cpu_percent || 0);
  const memPercent = Number(metrics.memory_percent || 0);

  return (
    <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-4 text-xs mt-3">
      {/* CPU */}
      <div className="flex-1 w-full space-y-1.5">
        <div className="flex items-center justify-between text-[#47675b]">
          <span className="flex items-center gap-1.5 font-medium">
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            CPU
          </span>
          <span className="font-mono font-bold text-[#064e3b]">
            {isRunning ? `${cpuPercent.toFixed(1)}%` : '0%'}
          </span>
        </div>
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${isRunning ? getProgressColor(cpuPercent) : 'bg-slate-300'}`}
            style={{ width: `${Math.min(100, Math.max(0, cpuPercent))}%` }}
          />
        </div>
      </div>

      {/* RAM */}
      <div className="flex-1 w-full space-y-1.5">
        <div className="flex items-center justify-between text-[#47675b]">
          <span className="flex items-center gap-1.5 font-medium">
            <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            Memoria RAM
          </span>
          <span className="font-mono font-bold text-[#064e3b]">
            {isRunning
              ? `${metrics.memory_usage_mb?.toFixed(1)} / ${metrics.memory_limit_mb} MB (${memPercent.toFixed(1)}%)`
              : '0.0 / 128 MB (0%)'}
          </span>
        </div>
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${isRunning ? getProgressColor(memPercent) : 'bg-slate-300'}`}
            style={{ width: `${Math.min(100, Math.max(0, memPercent))}%` }}
          />
        </div>
      </div>

      {/* Mini indicator */}
      <div className="flex items-center gap-2 self-end sm:self-center">
        {loading && <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />}
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
          {isRunning ? 'En vivo' : 'Inactivo'}
        </span>
      </div>
    </div>
  );
}
