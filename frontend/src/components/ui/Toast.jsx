import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

// Singleton event system so toast() can be called from outside React components if needed
const listeners = new Set();
let toastIdCounter = 1;

export const toast = {
  success: (message, options = {}) => emitToast({ type: 'success', message, ...options }),
  error: (message, options = {}) => emitToast({ type: 'error', message, ...options }),
  info: (message, options = {}) => emitToast({ type: 'info', message, ...options }),
  warning: (message, options = {}) => emitToast({ type: 'warning', message, ...options }),
  dismiss: (id) => emitDismiss(id),
};

function emitToast(toastData) {
  const id = toastData.id || `toast-${Date.now()}-${toastIdCounter++}`;
  const fullToast = { id, duration: 4000, ...toastData };
  listeners.forEach((listener) => listener.add(fullToast));
  return id;
}

function emitDismiss(id) {
  listeners.forEach((listener) => listener.remove(id));
}

const ToastContext = createContext({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function useToast() {
  const ctx = useContext(ToastContext);
  return {
    ...toast,
    toasts: ctx.toasts,
  };
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [exitingIds, setExitingIds] = useState(new Set());

  const removeToast = useCallback((id) => {
    setExitingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 180);
  }, []);

  const addToast = useCallback((toastData) => {
    setToasts((prev) => {
      // Keep maximum 4 toasts visible at a time
      const filtered = prev.filter((item) => item.id !== toastData.id).slice(-3);
      return [...filtered, toastData];
    });
  }, []);

  useEffect(() => {
    const listener = {
      add: (t) => addToast(t),
      remove: (id) => removeToast(id),
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [addToast, removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <Toaster toasts={toasts} exitingIds={exitingIds} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function Toaster({ toasts = [], exitingIds = new Set(), onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <aside
      aria-live="polite"
      aria-label="Notificaciones del sistema"
      className="fixed top-5 right-0 sm:right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((item) => (
        <ToastItem
          key={item.id}
          item={item}
          isExiting={exitingIds.has(item.id)}
          onDismiss={() => onDismiss(item.id)}
        />
      ))}
    </aside>
  );
}

function ToastItem({ item, isExiting, onDismiss }) {
  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef(item.duration);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (item.duration === Infinity) return;

    if (!isPaused) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        dismissRef.current();
      }, remainingTimeRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPaused, item.duration]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(500, remainingTimeRef.current - elapsed);
    }
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const getStyleByType = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-white border-brand-200 shadow-[0_12px_32px_rgba(40,181,134,0.18)]',
          badgeBg: 'bg-brand-50 text-brand-600',
          icon: CheckCircle2,
          textColor: 'text-navy-900',
        };
      case 'error':
        return {
          bg: 'bg-white border-red-200 shadow-[0_12px_32px_rgba(239,68,68,0.18)]',
          badgeBg: 'bg-red-50 text-red-600',
          icon: AlertCircle,
          textColor: 'text-navy-900',
        };
      case 'warning':
        return {
          bg: 'bg-white border-amber-200 shadow-[0_12px_32px_rgba(245,158,11,0.18)]',
          badgeBg: 'bg-amber-50 text-amber-600',
          icon: AlertTriangle,
          textColor: 'text-navy-900',
        };
      default:
        return {
          bg: 'bg-white border-slate-200 shadow-[0_12px_32px_rgba(23,40,56,0.12)]',
          badgeBg: 'bg-slate-100 text-slate-700',
          icon: Info,
          textColor: 'text-navy-900',
        };
    }
  };

  const config = getStyleByType(item.type);
  const Icon = config.icon;

  return (
    <div
      role="status"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      className={`pointer-events-auto relative flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border ${config.bg} ${
        isExiting ? 'toast-exit' : 'toast-enter'
      } cursor-pointer group select-none transition-transform active:scale-[0.98]`}
      onClick={onDismiss}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${config.badgeBg}`}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        {item.title && (
          <h4 className="text-xs font-bold text-navy-900 truncate">
            {item.title}
          </h4>
        )}
        <p className={`text-xs font-medium leading-5 ${config.textColor}`}>
          {item.message}
        </p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Cerrar notificación"
        className="text-slate-400 hover:text-slate-700 transition p-1 -mr-1 -mt-1 rounded-lg hover:bg-slate-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default ToastProvider;

