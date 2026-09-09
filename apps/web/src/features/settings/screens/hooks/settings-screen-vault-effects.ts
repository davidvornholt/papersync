import { Data, Effect } from 'effect';
import type {
  Settings,
  Subject,
  TimetableDay,
} from '@/shared/hooks/use-settings-schema';
import { loadSettingsFromVault } from '@/shared/vault/actions/sync-settings';
import type { GitHubRepository } from '../../actions/github-oauth-types';

class SettingsVaultEffectError extends Data.TaggedError(
  'SettingsVaultEffectError',
)<{
  readonly message: string;
}> {}

type AddToast = (
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning',
) => void;

type ApplyLoadedSettings = (
  subjects: ReadonlyArray<Subject>,
  timetable: ReadonlyArray<TimetableDay>,
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
    catch: () =>
      new SettingsVaultEffectError({
        message: 'Failed to load GitHub OAuth actions',
      }),
  }).pipe(
    Effect.flatMap((module) =>
      Effect.tryPromise({
        try: () => module.getGitHubUser(accessToken),
        catch: () =>
          new SettingsVaultEffectError({
            message: 'Failed to fetch GitHub user',
          }),
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
    catch: () =>
      new SettingsVaultEffectError({
        message: 'Failed to load settings from GitHub vault',
      }),
  }).pipe(
    Effect.tap((result) =>
      Effect.sync(() => {
        if (!result.success) {
          addToast(`Selected repository: ${repo.fullName}`, 'success');
          return;
        }
        applyLoadedSettings(
          result.subjects as Array<Subject>,
          result.timetable as Array<TimetableDay>,
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
