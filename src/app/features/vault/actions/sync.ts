"use server";

import { Effect } from "effect";
import type {
  DayRecord,
  ISODate,
  ISODateTime,
  WeekId,
  WeeklyNote,
} from "@/app/shared/types";
import {
  getWeeklyNotePath,
  readWeeklyNote,
  writeWeeklyNote,
} from "../services/config";
import { makeLocalVaultLayer } from "../services/filesystem";

// ============================================================================
// Types
// ============================================================================

type ExtractedEntry = {
  readonly id: string;
  readonly day: string;
  readonly subject: string;
  readonly content: string;
  readonly isTask: boolean;
  readonly isCompleted: boolean;
  readonly isNew: boolean;
};

export type SyncResult =
  | { readonly success: true; readonly notePath: string }
  | { readonly success: false; readonly error: string };

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the current week ID in YYYY-Www format
 */
const getCurrentWeekId = (): WeekId => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
  );
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}` as WeekId;
};

/**
 * Get the date range for a given week ID
 */
const getWeekDateRange = (weekId: WeekId): { start: ISODate; end: ISODate } => {
  const [year, weekPart] = weekId.split("-W");
  const weekNumber = parseInt(weekPart, 10);

  // Calculate the first day of the year
  const jan1 = new Date(parseInt(year, 10), 0, 1);
  // Find the first Monday of the year
  const dayOffset = (jan1.getDay() + 6) % 7; // Days since Monday
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() - dayOffset + (dayOffset > 3 ? 7 : 0));

  // Calculate start of the target week
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    start: weekStart.toISOString().split("T")[0] as ISODate,
    end: weekEnd.toISOString().split("T")[0] as ISODate,
  };
};

/**
 * Get the ISO date for a day name within the current week
 */
const getDayDate = (dayName: string, weekId: WeekId): ISODate => {
  const dayMap: Record<string, number> = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6,
  };

  const dayOffset = dayMap[dayName] ?? 0;
  const { start } = getWeekDateRange(weekId);
  const startDate = new Date(start);
  startDate.setDate(startDate.getDate() + dayOffset);

  return startDate.toISOString().split("T")[0] as ISODate;
};

/**
 * Convert ExtractedEntry[] to WeeklyNote format
 */
const convertEntriesToWeeklyNote = (
  entries: readonly ExtractedEntry[],
  weekId: WeekId,
  existingNote: WeeklyNote | null,
): WeeklyNote => {
  const dateRange = getWeekDateRange(weekId);
  const syncedAt = new Date().toISOString() as ISODateTime;

  // Group entries by day
  const entriesByDay = new Map<string, ExtractedEntry[]>();
  for (const entry of entries) {
    const dayEntries = entriesByDay.get(entry.day) || [];
    dayEntries.push(entry);
    entriesByDay.set(entry.day, dayEntries);
  }

  // Create or update day records
  const dayNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const days: DayRecord[] = [];

  for (const dayName of dayNames) {
    const dayEntries = entriesByDay.get(dayName) || [];
    if (dayEntries.length === 0 && !existingNote) continue;

    const date = getDayDate(dayName, weekId);

    // Group by subject
    const entriesBySubject = new Map<string, ExtractedEntry[]>();
    const generalTasks: ExtractedEntry[] = [];

    for (const entry of dayEntries) {
      if (entry.subject === "General Tasks" || !entry.subject) {
        generalTasks.push(entry);
      } else {
        const subjectEntries = entriesBySubject.get(entry.subject) || [];
        subjectEntries.push(entry);
        entriesBySubject.set(entry.subject, subjectEntries);
      }
    }

    // Find existing day record
    const existingDay = existingNote?.days.find((d) => d.dayName === dayName);

    // Merge with existing entries
    const subjectEntries: Array<{
      subject: string;
      tasks: Array<{ content: string; isCompleted: boolean }>;
    }> = [];

    for (const [subject, subjectItems] of entriesBySubject.entries()) {
      const existingSubjectEntry = existingDay?.entries.find(
        (e) => e.subject === subject,
      );
      const existingTasks = existingSubjectEntry?.tasks || [];

      const newTasks = subjectItems.map((item) => ({
        content: item.content,
        isCompleted: item.isCompleted,
      }));

      // Merge: keep existing tasks, add new ones (deduplicate by content)
      const mergedTasks: Array<{ content: string; isCompleted: boolean }> = [
        ...existingTasks,
      ];
      for (const newTask of newTasks) {
        if (!mergedTasks.some((t) => t.content === newTask.content)) {
          mergedTasks.push(newTask);
        }
      }

      subjectEntries.push({
        subject,
        tasks: mergedTasks,
      });
    }

    // Keep existing subject entries that aren't being updated
    if (existingDay) {
      for (const existingEntry of existingDay.entries) {
        if (!entriesBySubject.has(existingEntry.subject)) {
          subjectEntries.push({
            subject: existingEntry.subject,
            tasks: [...existingEntry.tasks],
          });
        }
      }
    }

    // Merge general tasks
    const existingGeneralTasks = existingDay?.generalTasks || [];
    const newGeneralTasks = generalTasks.map((t) => ({
      content: t.content,
      isCompleted: t.isCompleted,
    }));

    const mergedGeneralTasks = [...existingGeneralTasks];
    for (const newTask of newGeneralTasks) {
      if (!mergedGeneralTasks.some((t) => t.content === newTask.content)) {
        mergedGeneralTasks.push(newTask);
      }
    }

    if (subjectEntries.length > 0 || mergedGeneralTasks.length > 0) {
      days.push({
        date,
        dayName,
        entries: subjectEntries,
        generalTasks: mergedGeneralTasks,
      });
    }
  }

  return {
    week: weekId,
    dateRange,
    syncedAt,
    days,
  };
};

// ============================================================================
// Server Action
// ============================================================================

export async function syncToVault(
  entries: readonly ExtractedEntry[],
  vaultPath: string,
  weekId?: WeekId,
): Promise<SyncResult> {
  const effectiveWeekId = weekId ?? getCurrentWeekId();

  if (entries.length === 0) {
    return { success: false, error: "No entries to sync" };
  }

  if (!vaultPath) {
    return { success: false, error: "Vault path not configured" };
  }

  const program = Effect.gen(function* () {
    // Read existing note if present
    const existingNote = yield* readWeeklyNote(effectiveWeekId).pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    );

    // Convert entries to weekly note format, merging with existing
    const weeklyNote = convertEntriesToWeeklyNote(
      entries,
      effectiveWeekId,
      existingNote,
    );

    // Write the updated note
    yield* writeWeeklyNote(weeklyNote);

    return getWeeklyNotePath(effectiveWeekId);
  }).pipe(
    Effect.provide(makeLocalVaultLayer(vaultPath)),
    Effect.map((notePath) => ({ success: true as const, notePath })),
    Effect.catchAll((error: Error) =>
      Effect.succeed({ success: false as const, error: error.message }),
    ),
  );

  return Effect.runPromise(program);
}
