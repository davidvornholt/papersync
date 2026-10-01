'use client';

import { useEffect, useState } from 'react';

/** A temporary URL for showing a stored photo; released when it changes. */
export const useObjectUrl = (blob: Blob): string | null => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
};
