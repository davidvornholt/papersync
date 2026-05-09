import type { Settings } from '@/shared/hooks/use-settings';

const getVaultSyncPayload = (settings: Settings) => ({
  subjects: settings.subjects,
  timetable: settings.timetable,
});

export const hasVaultSyncChanges = (
  previousSettings: Settings,
  nextSettings: Settings,
): boolean =>
  JSON.stringify(getVaultSyncPayload(previousSettings)) !==
  JSON.stringify(getVaultSyncPayload(nextSettings));
