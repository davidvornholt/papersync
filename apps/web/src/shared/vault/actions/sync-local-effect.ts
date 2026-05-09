import { Effect } from 'effect';
import type { WeekId } from '@/shared/types/schemas';
import {
  generateOverviewContent,
  getOverviewPath,
  getWeeklyNotePath,
  readWeeklyNote,
  writeWeeklyNote,
} from '../services/config';
import {
  makeLocalVaultLayer,
  type VaultError,
  type VaultFileNotFoundError,
  VaultService,
} from '../services/filesystem';
import {
  convertEntriesToWeeklyNote,
  type ExtractedEntry,
} from './sync-helpers';
import { SyncValidationError } from './sync-types';

export const syncToLocalVaultEffect = (
  entries: readonly ExtractedEntry[],
  vaultPath: string,
  weekId: WeekId,
): Effect.Effect<
  string,
  SyncValidationError | VaultError | VaultFileNotFoundError
> =>
  Effect.gen(function* () {
    if (entries.length === 0) {
      return yield* Effect.fail(
        new SyncValidationError({ message: 'No entries to sync' }),
      );
    }
    if (!vaultPath) {
      return yield* Effect.fail(
        new SyncValidationError({ message: 'Vault path not configured' }),
      );
    }

    const vault = yield* VaultService;
    yield* vault.setVaultPath(vaultPath);

    const existingNote = yield* readWeeklyNote(weekId).pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    );
    const weeklyNote = convertEntriesToWeeklyNote(
      entries,
      weekId,
      existingNote,
    );
    yield* writeWeeklyNote(weeklyNote);

    const overviewPath = getOverviewPath();
    const overviewExists = yield* vault.fileExists(overviewPath);
    if (!overviewExists) {
      yield* vault.writeFile(overviewPath, generateOverviewContent());
    }

    return getWeeklyNotePath(weekId);
  }).pipe(Effect.provide(makeLocalVaultLayer(vaultPath)));
