import React from 'react';
import { Loader2, Check } from 'lucide-react';

/**
 * LoadingButton: Botón interactivo con microinteracciones de Emil Kowalski
 * - Tactile press feedback (:active scale(0.97))
 * - Easing de desaceleración natural (--ease-out)
 * - Estado de carga con spinner ligero y texto contextual
 * - Estado de éxito temporal con checkmark
 * - Protección estricta contra múltiples clics accidentales
 */
export default function LoadingButton({
  children,
  loading = false,
  loadingText,
  success = false,
  successText,
  disabled = false,
  icon: Icon,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const isActionDisabled = disabled || loading;

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-white border border-[#dfe7e4] text-[#334e5e] hover:bg-[#f8fbf9] hover:border-[#b9d8ca] hover:text-[#1C7F62] shadow-sm';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white shadow-[0_8px_20px_rgba(239,68,68,0.2)]';
      case 'amber':
        return 'bg-amber-500 hover:bg-amber-600 text-white shadow-[0_8px_20px_rgba(245,158,11,0.2)]';
      case 'navy':
        return 'bg-navy-900 hover:bg-navy-800 text-white shadow-[0_8px_20px_rgba(23,40,56,0.15)]';
      case 'ghost':
        return 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-navy-900';
      case 'primary':
      default:
        return 'bg-brand-500 hover:bg-brand-600 text-white shadow-[0_10px_25px_rgba(40,181,134,0.22)]';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-8 px-3 text-[11px] rounded-[8px] gap-1.5';
      case 'lg':
        return 'h-12 px-6 text-sm rounded-[12px] gap-2.5';
      case 'md':
      default:
        return 'h-10 px-4 text-xs rounded-[10px] gap-2';
    }
  };

  const handleClick = (e) => {
    if (isActionDisabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      disabled={isActionDisabled}
      aria-busy={loading || undefined}
      onClick={handleClick}
      className={`inline-flex items-center justify-center font-bold tracking-tight transition duration-150 btn-tactile brand-focus select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>{loadingText || children}</span>
        </>
      ) : success ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0 scale-pop-in" />
          <span className="scale-pop-in">{successText || children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

