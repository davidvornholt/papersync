'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { presence, toast as toastMotion } from '@/shared/motion/presets';
import { type Toast, ToastContext, type ToastType } from './use-toast';

const identifierRadix = 36;
const millisecondsPerSecond = 1000;
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
}: ToastItemProps): React.ReactElement => (
  <motion.div
    role={toast.type === 'error' ? 'alert' : 'status'}
    layout={true}
    variants={toastMotion}
    {...presence}
    className={`pointer-events-auto w-full overflow-hidden shadow-soft sm:min-w-[280px] sm:max-w-[400px] ${toastStyles[toast.type]}`}
  >
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="font-medium text-lg">{toastIcons[toast.type]}</span>
      <p className="flex-1 font-medium text-inherit text-sm">{toast.message}</p>
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
          className="h-full origin-left bg-paper/50"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{
            duration: toast.duration / millisecondsPerSecond,
            ease: 'linear',
          }}
        />
      </div>
    ) : null}
  </motion.div>
);
