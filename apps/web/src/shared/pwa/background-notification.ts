import { Effect } from 'effect';

const notificationTag = 'papersync-scan';
const notificationIcon = '/icons/icon-192.png';

const canNotify = () =>
  'Notification' in globalThis &&
  Notification.permission === 'granted' &&
  'serviceWorker' in navigator;

/**
 * Tells the person about a finished background task while PaperSync is not
 * on screen. When PaperSync is visible, the page itself shows the result.
 */
export const notifyInBackground = (title: string, body: string) => {
  if (document.visibilityState !== 'hidden' || !canNotify()) {
    return;
  }
  Effect.runFork(
    Effect.tryPromise(async () => {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        tag: notificationTag,
        icon: notificationIcon,
      });
    }).pipe(
      Effect.catch((error) =>
        Effect.logWarning('Background notification failed', error),
      ),
    ),
  );
};
