'use client';

import { Button } from '@papersync/ui/button';

export const SettingsLoadError = ({
  message,
}: {
  readonly message: string;
}) => (
  <div className="shell page-shell">
    <h1 className="text-3xl">Timetable unavailable</h1>
    <p role="alert" className="mt-4">
      {message}
    </p>
    <Button className="mt-4" onClick={() => globalThis.location.reload()}>
      Reload
    </Button>
  </div>
);
