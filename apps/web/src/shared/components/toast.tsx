'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { type Toast, ToastContext, type ToastType } from './use-toast';

const identifierRadix = 36;
const percentageScale = 100;
const toastDurationMilliseconds = 4000;
const progressIntervalMilliseconds = 50;
type ToastProviderProps = {
  readonly children: ReactNode;
};

export const ToastProvider = ({
  children,
}: ToastProviderProps): React.ReactElement => {
  const [toasts, setToasts] = useState<Array<Toast>>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(identifierRadix).slice(2)}`;
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

type ToastContainerProps = {
  readonly toasts: ReadonlyArray<Toast>;
  readonly removeToast: (id: string) => void;
};

const ToastContainer = ({
  toasts,
  removeToast,
}: ToastContainerProps): React.ReactElement => (
  <div className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6">
    <AnimatePresence mode="popLayout">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </AnimatePresence>
  </div>
);

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
  const [progress, setProgress] = useState(percentageScale);

  useEffect(() => {
    if (!toast.duration) {
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        const duration = toast.duration ?? toastDurationMilliseconds;
        const next =
          prev - percentageScale / (duration / progressIntervalMilliseconds);
        return Math.max(next, 0);
      });
    }, progressIntervalMilliseconds);

    return () => clearInterval(interval);
  }, [toast.duration]);

  return (
    <motion.div
      role={toast.type === 'error' ? 'alert' : 'status'}
      layout={true}
      initial={false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`pointer-events-auto w-full overflow-hidden shadow-soft sm:min-w-[280px] sm:max-w-[400px] ${toastStyles[toast.type]}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="font-medium text-lg">{toastIcons[toast.type]}</span>
        <p className="flex-1 font-medium text-inherit text-sm">
          {toast.message}
        </p>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="opacity-70 transition-opacity hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      {toast.duration && toast.duration > 0 ? (
        <div className="h-px bg-paper/20">
          <motion.div
            className="h-full bg-paper/50"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05, ease: 'linear' }}
          />
        </div>
      ) : null}
    </motion.div>
  );
};
