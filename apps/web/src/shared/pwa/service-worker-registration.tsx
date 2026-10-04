'use client';

import { Effect } from 'effect';
import { useEffect } from 'react';

// The worker only adds an offline fallback, so PaperSync keeps working when
// registration fails or the browser has no service worker support.
export const ServiceWorkerRegistration = (): null => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    Effect.runFork(
      Effect.tryPromise(() =>
        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }),
      ).pipe(
        Effect.catch((error) =>
          Effect.logWarning('Service worker registration failed', error),
        ),
      ),
    );
  }, []);
  return null;
};
