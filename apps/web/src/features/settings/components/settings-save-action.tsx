'use client';

import { Button } from '@papersync/ui/button';
import { Spinner } from '@/shared/components/motion-loading';

type SettingsSaveActionProps = {
  readonly isSaving: boolean;
  readonly onSave: () => void;
};

export const SettingsSaveAction = ({
  isSaving,
  onSave,
}: SettingsSaveActionProps): React.ReactElement => (
  <div>
    <Button onClick={onSave} disabled={isSaving} size="lg" className="w-full">
      {isSaving ? (
        <>
          <Spinner size="sm" className="mr-2" />
          Saving…
        </>
      ) : (
        'Save all settings'
      )}
    </Button>
    <p className="mt-2 text-center text-muted text-xs">
      Saves AI settings, subjects, and timetable in this browser.
    </p>
  </div>
);
