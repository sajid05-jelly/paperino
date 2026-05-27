'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  /** internal: controls exit animation */
  exiting?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType, title?: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

// ─── Per-type config ─────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  ToastType,
  {
    icon: React.ReactNode;
    border: string;
    shadow: string;
  }
> = {
  success: {
    icon: (
      <span className="rounded-full bg-emerald-500/10 p-1.5 flex-shrink-0">
        <CheckCircle2 size={18} className="text-emerald-400" />
      </span>
    ),
    border: 'border-emerald-500/30',
    shadow: '0 0 18px rgba(16,185,129,0.18)',
  },
  error: {
    icon: (
      <span className="rounded-full bg-rose-500/10 p-1.5 flex-shrink-0">
        <XCircle size={18} className="text-rose-400" />
      </span>
    ),
    border: 'border-rose-500/30',
    shadow: '0 0 18px rgba(244,63,94,0.18)',
  },
  info: {
    icon: (
      <span className="rounded-full bg-violet-500/10 p-1.5 flex-shrink-0">
        <Info size={18} className="text-violet-400" />
      </span>
    ),
    border: 'border-violet-500/30',
    shadow: '0 0 18px rgba(139,92,246,0.18)',
  },
  warning: {
    icon: (
      <span className="rounded-full bg-yellow-500/10 p-1.5 flex-shrink-0">
        <AlertTriangle size={18} className="text-yellow-400" />
      </span>
    ),
    border: 'border-yellow-500/30',
    shadow: '0 0 18px rgba(234,179,8,0.18)',
  },
};

// ─── Individual Toast Card ────────────────────────────────────────────────────

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const config = TYPE_CONFIG[toast.type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{ boxShadow: config.shadow }}
      className={[
        // layout
        'flex gap-3 items-start p-4 rounded-2xl',
        // glass background
        'bg-[#0f0a1a]/95 backdrop-blur-xl',
        // border
        'border',
        config.border,
        // animation: enter vs exit
        toast.exiting
          ? 'opacity-0 translate-x-full'
          : 'opacity-100 translate-x-0',
        'transition-all duration-300 ease-in-out',
        // enter keyframe via Tailwind animate utilities
        !toast.exiting ? 'animate-in slide-in-from-right-4 fade-in' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Icon */}
      {config.icon}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-white leading-tight mb-0.5 truncate">
            {toast.title}
          </p>
        )}
        <p className="text-sm text-gray-300 leading-snug break-words">
          {toast.message}
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 mt-0.5 text-gray-500 hover:text-white transition-colors duration-150"
      >
        <X size={15} />
      </button>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /** Begin exit animation then remove from state */
  const startExit = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 320); // matches transition duration-300 + buffer
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      // Clear the auto-dismiss timer if user dismisses manually
      const timer = timers.current.get(id);
      if (timer) {
        clearTimeout(timer);
        timers.current.delete(id);
      }
      startExit(id);
    },
    [startExit]
  );

  const showToast = useCallback(
    (message: string, type: ToastType, title?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: Toast = { id, message, type, title, exiting: false };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss after 4000 ms
      const timer = setTimeout(() => {
        timers.current.delete(id);
        startExit(id);
      }, 4000);
      timers.current.set(id, timer);
    },
    [startExit]
  );

  // Clean up all timers on unmount
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div
          aria-label="Notifications"
          className="fixed bottom-24 right-4 sm:right-6 z-[99998] flex flex-col gap-2 max-w-[360px] w-[calc(100vw-2rem)] sm:w-[360px] pointer-events-none"
        >
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastCard toast={toast} onDismiss={dismiss} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export default ToastProvider;
