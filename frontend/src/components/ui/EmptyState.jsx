import React from 'react';
import { PackageOpen, Plus } from 'lucide-react';

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No hay elementos registrados',
  description = 'Empieza creando o desplegando un nuevo elemento en tu espacio.',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) {
  return (
    <div
      className={`px-6 py-14 text-center max-w-md mx-auto scale-pop-in ${className}`}
    >
      <div className="w-16 h-16 mx-auto rounded-[20px] bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shadow-sm transition-transform duration-200 hover:scale-105">
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="mt-5 text-[19px] font-bold tracking-tight text-navy-900">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-6 text-slate-500">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="h-10 px-4 rounded-[10px] bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition duration-150 btn-tactile cursor-pointer"
            >
              {secondaryActionLabel}
            </button>
          )}

          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="h-10 px-5 rounded-[10px] bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold inline-flex items-center gap-2 shadow-[0_8px_20px_rgba(40,181,134,0.2)] transition duration-150 btn-tactile cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

