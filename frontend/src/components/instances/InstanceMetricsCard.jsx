import React, { useEffect, useState } from 'react';
import {
  Cpu,
  HardDrive,
  RefreshCw,
  Activity,
} from 'lucide-react';

import { instanceService } from '../../services/api';


export default function InstanceMetricsCard({
  instanceId,
  isRunning,
}) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);


  const fetchMetrics = async () => {
    if (!instanceId || !isRunning) {
      setMetrics({
        cpu_percent: 0.0,
        memory_usage_mb: 0.0,
        memory_limit_mb: 128.0,
        memory_percent: 0.0,
        status: 'stopped',
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
    if (percent < 70) return 'bg-brand-500';
    if (percent < 90) return 'bg-amber-500';

    return 'bg-rose-500';
  };


  const cpuPercent = Number(metrics.cpu_percent || 0);
  const memPercent = Number(metrics.memory_percent || 0);


  return (
    <div className="mt-4 rounded-[14px] border border-[#e1ebe6] bg-[#f8fbfa] px-4 py-3.5">

      <div className="flex flex-col lg:flex-row lg:items-center gap-4">


        {/* =====================================================
            CPU
        ====================================================== */}
        <MetricItem
          icon={Cpu}
          label="CPU"
          value={
            isRunning
              ? `${cpuPercent.toFixed(1)}%`
              : '0%'
          }
          percent={cpuPercent}
          isRunning={isRunning}
          progressClass={
            isRunning
              ? getProgressColor(cpuPercent)
              : 'bg-slate-300'
          }
        />


        {/* Separador */}
        <div className="hidden lg:block w-px h-10 bg-[#dfe7e4]" />


        {/* =====================================================
            RAM
        ====================================================== */}
        <MetricItem
          icon={HardDrive}
          label="Memoria RAM"
          value={
            isRunning
              ? `${Number(metrics.memory_usage_mb || 0).toFixed(1)} / ${metrics.memory_limit_mb} MB (${memPercent.toFixed(1)}%)`
              : '0.0 / 128 MB (0%)'
          }
          percent={memPercent}
          isRunning={isRunning}
          progressClass={
            isRunning
              ? getProgressColor(memPercent)
              : 'bg-slate-300'
          }
        />


        {/* =====================================================
            ESTADO
        ====================================================== */}
        <div className="lg:min-w-[115px] flex lg:justify-end">

          <div
            className={`
              inline-flex
              items-center
              gap-2
              px-2.5
              py-1.5
              rounded-full
              border
              ${
                isRunning
                  ? 'bg-brand-50 border-brand-100 text-brand-700'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }
            `}
          >

            {loading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Activity className="w-3 h-3" />
            )}


            <span className="text-[9px] font-bold uppercase tracking-[0.12em]">
              {isRunning ? 'En vivo' : 'Inactivo'}
            </span>

          </div>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   METRIC ITEM
========================================================= */

function MetricItem({
  icon: Icon,
  label,
  value,
  percent,
  isRunning,
  progressClass,
}) {
  return (
    <div className="flex-1 min-w-0">

      <div className="flex items-center justify-between gap-4">

        <div className="flex items-center gap-2">

          <div
            className={`
              w-7
              h-7
              rounded-[8px]
              flex
              items-center
              justify-center
              ${
                isRunning
                  ? 'bg-brand-50 border border-brand-100'
                  : 'bg-slate-100 border border-slate-200'
              }
            `}
          >

            <Icon
              className={`
                w-3.5
                h-3.5
                ${
                  isRunning
                    ? 'text-brand-600'
                    : 'text-slate-400'
                }
              `}
            />

          </div>


          <span className="text-[10px] font-semibold text-[#47675b]">
            {label}
          </span>

        </div>


        <span
          className={`
            text-[10px]
            font-mono
            font-bold
            truncate
            ${
              isRunning
                ? 'text-brand-700'
                : 'text-slate-400'
            }
          `}
        >
          {value}
        </span>

      </div>


      <div className="mt-2.5 w-full h-[5px] rounded-full bg-[#dfe7e4] overflow-hidden">

        <div
          className={`
            h-full
            rounded-full
            transition-all
            duration-500
            ${progressClass}
          `}
          style={{
            width: `${Math.min(
              100,
              Math.max(0, percent)
            )}%`,
          }}
        />

      </div>

    </div>
  );
}