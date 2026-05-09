'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

// ============================================================================
// Types
// ============================================================================

type ToastType = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  readonly id: string;
  readonly message: string;
  readonly type: ToastType;
  readonly duration?: number;
};

type ToastContextType = {
  readonly toasts: readonly Toast[];
  readonly addToast: (
    message: string,
    type?: ToastType,
    duration?: number,
  ) => void;
  readonly removeToast: (id: string) => void;
};

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextType | null>(null);
const fallbackToastContext: ToastContextType = {
  toasts: [],
  addToast: () => undefined,
  removeToast: () => undefined,
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  return context ?? fallbackToastContext;
};

// ============================================================================
// Toast Provider
// ============================================================================

type ToastProviderProps = {
  readonly children: ReactNode;
};

export const ToastProvider = ({
  children,
}: ToastProviderProps): React.ReactElement => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

// ============================================================================
// Toast Container
// ============================================================================

type ToastContainerProps = {
  readonly toasts: readonly Toast[];
  readonly removeToast: (id: string) => void;
};

const ToastContainer = ({
  toasts,
  removeToast,
}: ToastContainerProps): React.ReactElement => (
  <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] sm:inset-x-auto sm:right-6 sm:bottom-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
    <AnimatePresence mode="popLayout">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </AnimatePresence>
  </div>
);

// ============================================================================
// Toast Item
// ============================================================================

type ToastItemProps = {
  readonly toast: Toast;
  readonly onDismiss: (id: string) => void;
};

const toastStyles: Record<ToastType, string> = {
  success: 'bg-positive text-paper',
  error: 'bg-accent text-paper',
  warning: 'bg-warning text-ink',
  info: 'bg-ink text-paper',
};

const toastIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const ToastItem = ({
  toast,
  onDismiss,
}: ToastItemProps): React.ReactElement => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast.duration) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const duration = toast.duration ?? 4000;
        const next = prev - 100 / (duration / 50);
        return next < 0 ? 0 : next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [toast.duration]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={`pointer-events-auto w-full sm:min-w-[280px] sm:max-w-[400px] shadow-soft overflow-hidden ${toastStyles[toast.type]}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-lg font-medium">{toastIcons[toast.type]}</span>
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      {toast.duration && toast.duration > 0 && (
        <div className="h-px bg-paper/20">
          <motion.div
            className="h-full bg-paper/50"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05, ease: 'linear' }}
          />
        </div>
      )}
    </motion.div>
  );
};
