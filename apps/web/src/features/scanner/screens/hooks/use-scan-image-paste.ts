'use client';

import { useEffect } from 'react';

export const useScanImagePaste = ({
  onFilesSelect,
  isDisabled,
}: {
  readonly onFilesSelect: (files: ReadonlyArray<File>) => void;
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

      const files = Array.from(event.clipboardData?.files ?? []).filter(
        (item) => item.type.startsWith('image/'),
      );
      if (files.length === 0) {
        return;
      }

      event.preventDefault();
      onFilesSelect(files);
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isDisabled, onFilesSelect]);
};
