import type { Settings, TimetableDay } from '@/shared/hooks/use-settings';

export const isVaultConfigured = (settings: Settings): boolean =>
  (settings.vault.method === 'local' &&
    (settings.vault.localPath?.trim().length ?? 0) > 0) ||
  (settings.vault.method === 'github' &&
    Boolean(settings.vault.githubConnected) &&
    (settings.vault.githubRepo?.trim().length ?? 0) > 0);

export const getConfiguredDaysCount = (
  timetable: readonly TimetableDay[],
): number => timetable.filter((day) => day.slots.length > 0).length;
