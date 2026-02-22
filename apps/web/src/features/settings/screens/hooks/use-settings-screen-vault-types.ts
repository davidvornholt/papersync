import type { UseSettingsReturn } from '@/shared/hooks';

export type UseSettingsScreenVaultProps = {
  readonly settings: UseSettingsReturn['settings'];
  readonly save: UseSettingsReturn['save'];
  readonly updateVault: UseSettingsReturn['updateVault'];
  readonly setSubjects: UseSettingsReturn['setSubjects'];
  readonly updateTimetable: UseSettingsReturn['updateTimetable'];
  readonly isVaultConfigured: boolean;
  readonly addToast: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
  ) => void;
};
