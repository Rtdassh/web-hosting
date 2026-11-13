import React from 'react';

export default function StatusBadge({
  status = 'stopped',
  className = '',
  size = 'md',
  showLabel = true,
}) {
  const isRunning = status === 'running';
  const isCreating = status === 'creating' || status === 'pending';
  const isFailed = status === 'failed' || status === 'error';

  const getBadgeStyle = () => {
    if (isRunning) {
      return 'bg-brand-50 text-brand-700 border-brand-100';
    }
    if (isCreating) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (isFailed) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getDotStyle = () => {
    if (isRunning) return 'bg-brand-500 status-dot-live';
    if (isCreating) return 'bg-amber-500 status-dot-live';
    if (isFailed) return 'bg-rose-500';
    return 'bg-slate-400';
  };

  const getStatusText = () => {
    if (isRunning) return 'Running';
    if (isCreating) return 'Creating...';
    if (isFailed) return 'Error';
    return 'Stopped';
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[9px] gap-1.5'
      : 'px-2.5 py-1 text-[10px] gap-2';

  return (
    <span
      aria-label={!showLabel ? getStatusText() : undefined}
      className={`inline-flex items-center rounded-full font-semibold border select-none transition-colors duration-150 ${getBadgeStyle()} ${sizeClasses} ${className}`}
    >
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${getDotStyle()}`} />
      {showLabel && <span>{getStatusText()}</span>}
    </span>
  );
}

