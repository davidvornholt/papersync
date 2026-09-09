'use client';
import { createContext, useContext } from 'react';
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type Toast = {
  readonly id: string;
  readonly message: string;
  readonly type: ToastType;
  readonly duration?: number;
};

type ToastContextType = {
  readonly toasts: ReadonlyArray<Toast>;
  readonly addToast: (
    message: string,
    type?: ToastType,
    duration?: number,
  ) => void;
  readonly removeToast: (id: string) => void;
};

export const ToastContext = createContext<ToastContextType | null>(null);
const fallbackToastContext: ToastContextType = {
  toasts: [],
  addToast: () => undefined,
  removeToast: () => undefined,
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  return context ?? fallbackToastContext;
};
