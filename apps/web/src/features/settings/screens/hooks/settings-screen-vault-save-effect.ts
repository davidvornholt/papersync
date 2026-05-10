import { Data, Effect } from 'effect';
import type { Settings, VaultMethod } from '@/shared/hooks/use-settings';
import { loadSettings } from '@/shared/hooks/use-settings-storage';
import { syncSettingsToVault } from '@/shared/vault/actions/sync-settings';
import type { VaultMethod as SettingsSyncMethod } from '@/shared/vault/actions/sync-settings-types';
import { hasVaultSyncChanges } from './settings-screen-vault-sync-helpers';

const supportsSettingsSync = (
  method: VaultMethod,
): method is SettingsSyncMethod => method === 'local' || method === 'github';

type AddToast = (
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning',
) => void;

class SettingsVaultSaveError extends Data.TaggedError(
  'SettingsVaultSaveError',
)<{
  readonly message: string;
}> {}

export const createSaveSettingsEffect = ({
  save,
  settings,
  isVaultConfigured,
  addToast,
  setIsSyncing,
}: {
  readonly save: () => Promise<void>;
  readonly settings: Settings;
  readonly isVaultConfigured: boolean;
  readonly addToast: AddToast;
  readonly setIsSyncing: (isSyncing: boolean) => void;
}) =>
  loadSettings().pipe(
    Effect.flatMap((previousSettings) =>
      Effect.tryPromise({
        try: () => save(),
        catch: () =>
          new SettingsVaultSaveError({
            message: 'Failed to save settings locally',
          }),
      }).pipe(
        Effect.flatMap(() => {
          // Super Productivity is a task manager, not a notes vault; subjects
          // and timetables are kept local only when it's the active provider.
          const method = settings.vault.method;

          if (
            !isVaultConfigured ||
            !supportsSettingsSync(method) ||
            !hasVaultSyncChanges(previousSettings, settings)
          ) {
            return Effect.sync(() =>
              addToast('Settings saved successfully!', 'success'),
            );
          }

          return Effect.sync(() => setIsSyncing(true)).pipe(
            Effect.flatMap(() =>
              Effect.tryPromise({
                try: () =>
                  syncSettingsToVault(
                    {
                      subjects: settings.subjects,
                      timetable: settings.timetable,
                    },
                    method,
                    settings.vault,
                  ),
                catch: () =>
                  new SettingsVaultSaveError({
                    message: 'Failed to sync settings to vault',
                  }),
              }).pipe(
                Effect.tap((result) =>
                  Effect.sync(() => {
                    addToast(
                      result.success
                        ? 'Settings saved and synced to vault!'
                        : `Settings saved, but sync failed: ${result.error}`,
                      result.success ? 'success' : 'warning',
                    );
                  }),
                ),
                Effect.catchAll((error) =>
                  Effect.sync(() =>
                    addToast(
                      `Settings saved, but sync failed: ${error.message}`,
                      'warning',
                    ),
                  ),
                ),
                Effect.ensuring(Effect.sync(() => setIsSyncing(false))),
              ),
            ),
          );
        }),
      ),
    ),
    Effect.catchAll((error) =>
      Effect.sync(() =>
        addToast(`Failed to save settings: ${error.message}`, 'error'),
      ),
    ),
  );
