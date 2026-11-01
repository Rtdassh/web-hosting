import React from 'react';
import mascotCreating from '../../assets/mascot/mascot-creating.png';
import mascotRunning from '../../assets/mascot/mascot-running.png';
import mascotStopped from '../../assets/mascot/mascot-stopped.png';
import mascotFailed from '../../assets/mascot/mascot-failed.png';
import mascotDestroying from '../../assets/mascot/mascot-destroying.png';

export {
  mascotCreating,
  mascotRunning,
  mascotStopped,
  mascotFailed,
  mascotDestroying,
};

export const MASCOT_STATUS_META = {
  creating: {
    src: mascotCreating,
    label: 'Creando',
    description: 'Aprovisionando servidor (huevo incubando)',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  pending: {
    src: mascotCreating,
    label: 'Pendiente',
    description: 'En cola de aprovisionamiento',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  running: {
    src: mascotRunning,
    label: 'Activo',
    description: 'Servidor en ejecución y saludable',
    badgeClass: 'bg-brand-50 text-brand-700 border-brand-100',
    dotClass: 'bg-brand-500',
  },
  stopped: {
    src: mascotStopped,
    label: 'Detenido',
    description: 'Servidor detenido (descansando)',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  failed: {
    src: mascotFailed,
    label: 'Error',
    description: 'Fallo o error inesperado en el contenedor',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  destroying: {
    src: mascotDestroying,
    label: 'Eliminando',
    description: 'Destruyendo contenedor y liberando puerto',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
  },
};

export function getMascotMeta(status, action = null) {
  if (action === 'destroy') {
    return MASCOT_STATUS_META.destroying;
  }
  const key = String(status || '').toLowerCase();
  return (
    MASCOT_STATUS_META[key] ||
    (key === 'error'
      ? MASCOT_STATUS_META.failed
      : key === 'deploying'
      ? MASCOT_STATUS_META.creating
      : MASCOT_STATUS_META.stopped)
  );
}

/**
 * ServerMascot Component
 * Renderiza al cocodrilo de Codrop reflejando el ciclo de vida del servidor:
 * - Creando/Pending: Huevo eclosionando
 * - Running: Cocodrilo activo corriendo con .zip
 * - Stopped: Cocodrilo durmiendo plácidamente con Zzz
 * - Failed: Cocodrilo mareado con curita y espirales
 * - Destroying: Cocodrilo noqueado con ojos en cruz (X X)
 */
export default function ServerMascot({
  status,
  action = null,
  size = 'md',
  className = '',
  showLabel = false,
  animated = true,
}) {
  const meta = getMascotMeta(status, action);

  const sizeStyles = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }[size] || 'w-11 h-11';

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      title={`${meta.label}: ${meta.description}`}
    >
      <div
        className={`${sizeStyles} rounded-[13px] bg-gradient-to-br from-brand-50/70 to-white border border-brand-100/70 p-1 flex items-center justify-center shadow-sm overflow-hidden ${
          animated && meta === MASCOT_STATUS_META.running ? 'hover:scale-105 transition-transform' : ''
        }`}
      >
        <img
          src={meta.src}
          alt={`Mascota Codrop: ${meta.label}`}
          className="w-full h-full object-contain select-none"
          loading="lazy"
        />
      </div>

      {showLabel && (
        <span
          className={`ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.badgeClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
          {meta.label}
        </span>
      )}
    </div>
  );
}
