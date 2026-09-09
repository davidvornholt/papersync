import { Effect } from 'effect';
import type { WeekId } from '@/shared/types/schemas';
import type { ExtractedEntry } from '@/shared/vault/actions/sync-helpers-types';
import type {
  VaultError,
  VaultFileNotFoundError,
} from '@/shared/vault/errors/filesystem-errors';
import { SyncValidationError } from '@/shared/vault/errors/sync-types';
import {
  getOverviewPath,
  getWeeklyNotePath,
} from '@/shared/vault/services/config-paths';
import { VaultService } from '@/shared/vault/services/filesystem-contract';
import { generateOverviewContent } from '@/shared/vault/services/overview-content';
import {
  readWeeklyNote,
  writeWeeklyNote,
} from '@/shared/vault/services/weekly-note-storage';
import { makeLocalVaultLayer } from '../services/filesystem';
import { convertEntriesToWeeklyNote } from './sync-helpers';

const vaultWrites = Effect.runSync(Effect.makeSemaphore(1));

export const syncToLocalVaultEffect = (
  entries: ReadonlyArray<ExtractedEntry>,
  vaultPath: string,
  weekId: WeekId,
): Effect.Effect<
  string,
  SyncValidationError | VaultError | VaultFileNotFoundError
> =>
  vaultWrites.withPermits(1)(
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

      const existingNote = yield* readWeeklyNote(weekId);
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
    }).pipe(Effect.provide(makeLocalVaultLayer(vaultPath))),
  );
