'use client';

import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly description?: string;
  readonly size?: ModalSize;
  readonly showCloseButton?: boolean;
  readonly closeOnOverlayClick?: boolean;
  readonly closeOnEscape?: boolean;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
};

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  footer,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (isOpen && !dialog.open) {
      dialog.showModal();
    }
    if (!isOpen && dialog.open) {
      dialog.close();
    }
    return () => dialog.close();
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!(dialog && closeOnOverlayClick)) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      const bounds = dialog.getBoundingClientRect();
      if (
        event.target === dialog &&
        (event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom)
      ) {
        onClose();
      }
    };
    dialog.addEventListener('click', handleClick);
    return () => dialog.removeEventListener('click', handleClick);
  }, [closeOnOverlayClick, onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (closeOnEscape) {
          onClose();
        }
      }}
      className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto border border-hairline bg-paper p-6 text-ink backdrop:bg-ink/40 ${sizeClasses[size]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          {title ? (
            <h2 id={titleId} className="serif text-2xl">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p id={descriptionId} className="mt-2 text-ink-soft">
              {description}
            </p>
          ) : null}
        </div>
        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="min-h-10 min-w-10 border border-hairline"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="py-6">{children}</div>
      {footer ? (
        <div className="flex flex-wrap justify-end gap-3">{footer}</div>
      ) : null}
    </dialog>
  );
};
