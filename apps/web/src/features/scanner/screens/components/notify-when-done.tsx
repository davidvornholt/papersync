'use client';

import { Button } from '@papersync/ui/button';
import { useNotificationPermission } from '@/shared/pwa/use-notification-permission';

/** Offers a notification for when analysis finishes while PaperSync is away. */
export const NotifyWhenDone = (): React.ReactElement | null => {
  const { access, request } = useNotificationPermission();
  if (access === 'granted') {
    return (
      <p className="mt-3 max-w-xs text-muted text-sm">
        PaperSync will notify you if you’re in another app when it’s done.
      </p>
    );
  }
  return access === 'default' ? (
    <Button variant="secondary" className="mt-6" onClick={request}>
      Notify me when it’s done
    </Button>
  ) : null;
};
