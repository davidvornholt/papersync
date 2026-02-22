import { Effect } from 'effect';
import type {
  Settings,
  Subject,
  TimetableDay,
} from '@/shared/hooks/use-settings';
import {
  loadSettingsFromVault,
  syncSettingsToVault,
} from '@/shared/services/vault-actions';
import type { GitHubRepository } from '../../actions/github-oauth-types';

type AddToast = (
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning',
) => void;

type ApplyLoadedSettings = (
  subjects: readonly Subject[],
  timetable: readonly TimetableDay[],
) => void;

export const createOAuthSuccessEffect = ({
  accessToken,
  updateVault,
  addToast,
  setIsOAuthModalOpen,
  setIsRepoSelectorOpen,
}: {
  readonly accessToken: string;
  readonly updateVault: (updates: Partial<Settings['vault']>) => void;
  readonly addToast: AddToast;
  readonly setIsOAuthModalOpen: (isOpen: boolean) => void;
  readonly setIsRepoSelectorOpen: (isOpen: boolean) => void;
}) =>
  Effect.tryPromise({
    try: () => import('../../actions/github-oauth'),
    catch: () => new Error('Failed to load GitHub OAuth actions'),
  }).pipe(
    Effect.flatMap((module) =>
      Effect.tryPromise({
        try: () => module.getGitHubUser(accessToken),
        catch: () => new Error('Failed to fetch GitHub user'),
      }),
    ),
    Effect.tap((userResult) =>
      Effect.sync(() => {
        if (userResult.success) {
          updateVault({
            githubConnected: true,
            githubUsername: userResult.login,
            githubToken: accessToken,
          });
          addToast(
            `Connected to GitHub as ${userResult.name || userResult.login}!`,
            'success',
          );
          return;
        }
        updateVault({ githubConnected: true, githubToken: accessToken });
        addToast('Connected to GitHub successfully!', 'success');
      }),
    ),
    Effect.catchAll(() =>
      Effect.sync(() => {
        updateVault({ githubConnected: true, githubToken: accessToken });
        addToast('Connected to GitHub successfully!', 'success');
      }),
    ),
    Effect.tap(() =>
      Effect.sync(() => {
        setIsOAuthModalOpen(false);
        setIsRepoSelectorOpen(true);
      }),
    ),
  );

export const createRepoSelectEffect = ({
  repo,
  githubToken,
  updateVault,
  addToast,
  applyLoadedSettings,
}: {
  readonly repo: GitHubRepository;
  readonly githubToken?: string;
  readonly updateVault: (updates: Partial<Settings['vault']>) => void;
  readonly addToast: AddToast;
  readonly applyLoadedSettings: ApplyLoadedSettings;
}) => {
  updateVault({ githubRepo: repo.fullName });

  return Effect.tryPromise({
    try: () =>
      loadSettingsFromVault('github', {
        githubToken,
        githubRepo: repo.fullName,
      }),
    catch: () => new Error('Failed to load settings from GitHub vault'),
  }).pipe(
    Effect.tap((result) =>
      Effect.sync(() => {
        if (!result.success) {
          addToast(`Selected repository: ${repo.fullName}`, 'success');
          return;
        }
        applyLoadedSettings(
          result.subjects as Subject[],
          result.timetable as TimetableDay[],
        );
        addToast(
          `Connected to ${repo.fullName} and loaded settings from vault`,
          'success',
        );
      }),
    ),
    Effect.catchAll(() =>
      Effect.sync(() =>
        addToast(`Selected repository: ${repo.fullName}`, 'success'),
      ),
    ),
  );
};

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
  Effect.tryPromise({
    try: () => save(),
    catch: () => new Error('Failed to save settings locally'),
  }).pipe(
    Effect.flatMap(() => {
      if (!isVaultConfigured) {
        return Effect.sync(() =>
          addToast('Settings saved successfully!', 'success'),
        );
      }

      return Effect.sync(() => setIsSyncing(true)).pipe(
        Effect.flatMap(() =>
          Effect.tryPromise({
            try: () =>
              syncSettingsToVault(
                { subjects: settings.subjects, timetable: settings.timetable },
                settings.vault.method,
                settings.vault,
              ),
            catch: () => new Error('Failed to sync settings to vault'),
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
    Effect.catchAll((error) =>
      Effect.sync(() =>
        addToast(`Failed to save settings: ${error.message}`, 'error'),
      ),
    ),
  );
