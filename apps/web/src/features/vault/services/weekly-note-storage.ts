import { Effect } from 'effect';
import type { WeekId, WeeklyNote } from '@/shared/types';
import { getWeeklyNotePath, PAPERSYNC_ROOT, WEEKLY_DIR } from './config-paths';
import {
  type VaultError,
  type VaultFileNotFoundError,
  VaultService,
} from './filesystem';
import { parseWeeklyNoteMarkdown } from './weekly-note-parse';
import { serializeWeeklyNoteToMarkdown } from './weekly-note-serialize';

export const readWeeklyNote = (
  weekId: WeekId,
): Effect.Effect<
  WeeklyNote | null,
  VaultFileNotFoundError | VaultError,
  VaultService
> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const notePath = getWeeklyNotePath(weekId);
    const exists = yield* vault.fileExists(notePath);
    if (!exists) {
      return null;
    }
    const content = yield* vault.readFile(notePath);
    return parseWeeklyNoteMarkdown(content, weekId);
  });

export const writeWeeklyNote = (
  note: WeeklyNote,
): Effect.Effect<void, VaultError, VaultService> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/${WEEKLY_DIR}`);
    const markdown = serializeWeeklyNoteToMarkdown(note);
    yield* vault.writeFile(getWeeklyNotePath(note.week), markdown);
  });
