'use client';

import { useEffect } from 'react';

export const useScanImagePaste = ({
  onFileSelect,
  isDisabled,
}: {
  readonly onFileSelect: (file: File) => void;
  readonly isDisabled: boolean;
}) => {
  useEffect(() => {
    if (isDisabled) {
      return;
    }

    const handlePaste = (event: ClipboardEvent) => {
      const { target } = event;
      if (
        event.defaultPrevented ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.closest('input, textarea, select')))
      ) {
        return;
      }

      const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
        item.type.startsWith('image/'),
      );
      if (!file) {
        return;
      }

      event.preventDefault();
      onFileSelect(file);
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isDisabled, onFileSelect]);
};
