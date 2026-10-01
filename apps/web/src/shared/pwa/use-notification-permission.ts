'use client';

import { Effect } from 'effect';
import { useEffect, useState } from 'react';

export type NotificationAccess = NotificationPermission | 'unsupported';

const readAccess = (): NotificationAccess =>
  'Notification' in globalThis && 'serviceWorker' in navigator
    ? Notification.permission
    : 'unsupported';

/** The browser's notification permission, read after hydration. */
export const useNotificationPermission = () => {
  const [access, setAccess] = useState<NotificationAccess>('unsupported');
  useEffect(() => setAccess(readAccess()), []);
  const request = () => {
    Effect.runFork(
      Effect.tryPromise(() => Notification.requestPermission()).pipe(
        Effect.catchAll(() => Effect.succeed(readAccess())),
        Effect.flatMap((next) => Effect.sync(() => setAccess(next))),
      ),
    );
  };
  return { access, request };
};
