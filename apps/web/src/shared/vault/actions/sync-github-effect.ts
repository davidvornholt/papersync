import { Effect } from 'effect';
import type { WeekId } from '@/shared/types/schemas';
import type { ExtractedEntry } from '@/shared/vault/actions/sync-helpers-types';
import { SyncValidationError } from '@/shared/vault/errors/sync-types';
import {
  getOverviewPath,
  getWeeklyNotePath,
} from '@/shared/vault/services/config-paths';
import { GitHubServiceLive } from '@/shared/vault/services/github';
import { GitHubService } from '@/shared/vault/services/github-contract';
import { generateOverviewContent } from '@/shared/vault/services/overview-content';
import { parseWeeklyNoteMarkdown } from '@/shared/vault/services/weekly-note-parse';
import { serializeWeeklyNoteToMarkdown } from '@/shared/vault/services/weekly-note-serialize';
import { convertEntriesToWeeklyNote } from './sync-helpers';

type Destination = {
  readonly token: string;
  readonly owner: string;
  readonly repo: string;
  readonly weekId: WeekId;
};
export const syncToGitHubEffect = (
  entries: ReadonlyArray<ExtractedEntry>,
  destination: Destination,
) =>
  Effect.gen(function* () {
    if (entries.length === 0) {
      return yield* Effect.fail(
        new SyncValidationError({ message: 'No entries to sync' }),
      );
    }
    const { weekId } = destination;
    const github = yield* GitHubService;
    const path = getWeeklyNotePath(weekId);
    const file = yield* github.getFile({ ...destination, path });
    const existingNote = file
      ? parseWeeklyNoteMarkdown(file.content, weekId)
      : null;
    const note = convertEntriesToWeeklyNote(entries, weekId, existingNote);
    yield* github.setFile({
      ...destination,
      path,
      content: serializeWeeklyNoteToMarkdown(note),
      message: `Update weekly note: ${weekId}`,
      sha: file?.sha,
    });
    const overview = { ...destination, path: getOverviewPath() };
    if (!(yield* github.getFile(overview))) {
      yield* github.setFile({
        ...overview,
        content: generateOverviewContent(),
        message: 'Create homework overview',
      });
    }
    return path;
  }).pipe(Effect.provide(GitHubServiceLive));
