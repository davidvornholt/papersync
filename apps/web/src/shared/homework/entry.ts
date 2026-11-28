import type { TaskAction } from '@/shared/types/schemas';
export type ExtractedEntry = {
  readonly id: string;
  readonly day: string;
  readonly subject: string;
  readonly content: string;
  readonly action: TaskAction;
  readonly dueDate?: string;
  readonly savedHomeworkIds?: ReadonlyArray<string>;
  readonly readingId?: string;
  readonly readDueDate?: string | null;
  readonly savedDueDate?: string | null;
  readonly isDueDateChosen?: boolean;
};

export const markReviewed = (
  entries: ReadonlyArray<ExtractedEntry>,
  id: string,
  updates: Partial<ExtractedEntry>,
): ReadonlyArray<ExtractedEntry> =>
  entries.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          ...updates,
          ...('dueDate' in updates ? { isDueDateChosen: true } : {}),
          action: entry.action === 'skip' ? 'modify' : entry.action,
        }
      : entry,
  );

// Drafts stored before this field omit it; null means saved without a date.
export const savedDueDateOf = (
  entry: Pick<ExtractedEntry, 'dueDate' | 'savedDueDate'>,
) =>
  entry.savedDueDate === undefined
    ? entry.dueDate
    : (entry.savedDueDate ?? undefined);

// A date still as the scan read it, when an earlier scan of the same homework
// read it too, keeps the date reviewed after that scan, so a corrected
// misreading is neither offered nor queued again. A date the reviewer changed,
// or one the scan reads differently, is a change.
export const keepsReviewedDate = (
  entry: Pick<ExtractedEntry, 'dueDate' | 'readDueDate' | 'isDueDateChosen'>,
  savedReadDueDate: string | null,
) =>
  !entry.isDueDateChosen &&
  entry.readDueDate !== undefined &&
  (entry.dueDate ?? null) === entry.readDueDate &&
  entry.readDueDate === savedReadDueDate;
