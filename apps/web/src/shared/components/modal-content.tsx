'use client';

import { motion } from 'motion/react';
import { Card } from './card';
import type { ModalSize } from './modal';

type ModalContentProps = {
  readonly modalRef: React.RefObject<HTMLDivElement | null>;
  readonly title?: string;
  readonly description?: string;
  readonly size: ModalSize;
  readonly showCloseButton: boolean;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
  readonly footer?: React.ReactNode;
};

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export const DesktopModalContent = ({
  modalRef,
  title,
  description,
  size,
  showCloseButton,
  onClose,
  children,
  footer,
}: ModalContentProps): React.ReactElement => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: 20 }}
    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    className={`hidden md:block fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full ${sizeClasses[size]} px-4`}
    ref={modalRef}
    tabIndex={-1}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title' : undefined}
    aria-describedby={description ? 'modal-description' : undefined}
  >
    <Card elevated className="p-0 overflow-hidden max-h-[90vh] flex flex-col">
      {(title || showCloseButton) && (
        <div className="flex items-start justify-between p-6 pb-0">
          <div className="flex-1">
            {title && (
              <h2
                id="modal-title"
                className="text-lg font-semibold font-display text-foreground"
              >
                {title}
              </h2>
            )}
            {description && (
              <p id="modal-description" className="text-sm text-muted mt-1">
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <ModalCloseButton onClose={onClose} className="p-1 -mr-1" />
          )}
        </div>
      )}
      <div className="p-6 overflow-y-auto flex-1">{children}</div>
      {footer && (
        <div className="px-6 pb-6 pt-0 flex justify-end gap-3">{footer}</div>
      )}
    </Card>
  </motion.div>
);

export const MobileModalContent = ({
  modalRef,
  title,
  description,
  showCloseButton,
  onClose,
  children,
  footer,
}: Omit<ModalContentProps, 'size'>): React.ReactElement => (
  <motion.div
    initial={{ y: '100%' }}
    animate={{ y: 0 }}
    exit={{ y: '100%' }}
    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    className="md:hidden fixed bottom-0 left-0 right-0 z-50"
    ref={modalRef}
    tabIndex={-1}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title-mobile' : undefined}
    aria-describedby={description ? 'modal-description-mobile' : undefined}
  >
    <Card
      elevated
      className="p-0 overflow-hidden rounded-b-none rounded-t-2xl max-h-[90vh] flex flex-col"
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-border" />
      </div>
      {(title || showCloseButton) && (
        <div className="flex items-start justify-between px-5 py-3 border-b border-border">
          <div className="flex-1">
            {title && (
              <h2
                id="modal-title-mobile"
                className="text-base font-semibold font-display text-foreground"
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                id="modal-description-mobile"
                className="text-sm text-muted mt-0.5"
              >
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <ModalCloseButton onClose={onClose} className="p-2 -mr-2" />
          )}
        </div>
      )}
      <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
      {footer && (
        <div className="px-5 pb-5 pt-0 flex flex-col-reverse gap-2 safe-area-bottom">
          {footer}
        </div>
      )}
    </Card>
  </motion.div>
);

type ModalCloseButtonProps = {
  readonly onClose: () => void;
  readonly className: string;
};

const ModalCloseButton = ({
  onClose,
  className,
}: ModalCloseButtonProps): React.ReactElement => (
  <button
    type="button"
    onClick={onClose}
    className={`${className} text-muted hover:text-foreground transition-colors rounded-lg hover:bg-surface touch-manipulation`}
    aria-label="Close modal"
  >
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <title>Close</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  </button>
);
