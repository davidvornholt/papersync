'use client';

import { Button, Spinner } from '@/shared/components';

type SettingsSaveActionProps = {
  readonly isSaving: boolean;
  readonly isSyncing: boolean;
  readonly isVaultConfigured: boolean;
  readonly onSave: () => void;
};

export const SettingsSaveAction = ({
  isSaving,
  isSyncing,
  isVaultConfigured,
  onSave,
}: SettingsSaveActionProps): React.ReactElement => (
  <div>
    <Button onClick={onSave} disabled={isSaving} size="lg" className="w-full">
      {isSaving ? (
        <>
          <Spinner size="sm" className="mr-2" />
          {isSyncing ? 'Syncing to vault...' : 'Saving...'}
        </>
      ) : (
        'Save All Settings'
      )}
    </Button>
    <p className="text-xs text-muted text-center mt-2">
      {isVaultConfigured
        ? 'Saves all settings locally and syncs to vault'
        : 'Saves all settings locally'}
    </p>
  </div>
);
