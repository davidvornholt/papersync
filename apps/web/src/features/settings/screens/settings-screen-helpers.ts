import type {
  Settings,
  TimetableDay,
} from '@/shared/hooks/use-settings-schema';
export const isVaultConfigured = (settings: Settings): boolean =>
  (settings.vault.method === 'local' &&
    (settings.vault.localPath?.trim().length ?? 0) > 0) ||
  (settings.vault.method === 'github' &&
    Boolean(settings.vault.githubConnected) &&
    (settings.vault.githubRepo?.trim().length ?? 0) > 0) ||
  settings.vault.method === 'super-productivity';

export const getConfiguredDaysCount = (
  timetable: ReadonlyArray<TimetableDay>,
): number => timetable.filter((day) => day.slots.length > 0).length;
