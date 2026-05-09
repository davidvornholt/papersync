import { Data, Effect } from 'effect';
import type { Subject, TimetableDay } from '@/shared/hooks/use-settings';
import { loadSettingsFromVault } from '@/shared/vault/actions/sync-settings';

class LocalVaultSettingsLoadError extends Data.TaggedError(
  'LocalVaultSettingsLoadError',
)<{
  readonly message: string;
}> {}

type AddToast = (
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning',
) => void;

type ApplyLoadedSettings = (
  subjects: readonly Subject[],
  timetable: readonly TimetableDay[],
) => void;

export const createLoadLocalVaultEffect = ({
  localPath,
  addToast,
  applyLoadedSettings,
}: {
  readonly localPath: string;
  readonly addToast: AddToast;
  readonly applyLoadedSettings: ApplyLoadedSettings;
}) =>
  Effect.tryPromise({
    try: () => loadSettingsFromVault('local', { localPath }),
    catch: () =>
      new LocalVaultSettingsLoadError({
        message: 'Failed to load local vault settings',
      }),
  }).pipe(
    Effect.tap((result) =>
      Effect.sync(() => {
        if (!result.success) {
          return;
        }
        applyLoadedSettings(
          result.subjects as Subject[],
          result.timetable as TimetableDay[],
        );
        if (result.subjects.length > 0 || result.timetable.length > 0) {
          addToast('Loaded settings from vault', 'success');
        }
      }),
    ),
    Effect.catchAll(() => Effect.void),
  );
