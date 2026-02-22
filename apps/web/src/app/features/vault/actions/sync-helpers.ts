/**
 * Sync helper utilities that are pure functions (not server actions)
 * These are used by the sync server action and tests
 */

import type {
  DayRecord,
  ISODate,
  ISODateTime,
  WeekId,
  WeeklyNote,
} from '@/app/shared/types';

// ============================================================================
// Types
// ============================================================================

export type ExtractedEntry = {
  readonly id: string;
  readonly day: string;
  readonly subject: string;
  readonly content: string;
  readonly isTask: boolean;
  readonly isCompleted: boolean;
  readonly isNew: boolean;
  readonly dueDate?: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the current week ID in YYYY-Www format
 */
export const getCurrentWeekId = (): WeekId => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
  );
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}` as WeekId;
};

/**
 * Get the date range for a given week ID
 */
export const getWeekDateRange = (
  weekId: WeekId,
): { start: ISODate; end: ISODate } => {
  const [year, weekPart] = weekId.split('-W');
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
    start: weekStart.toISOString().split('T')[0] as ISODate,
    end: weekEnd.toISOString().split('T')[0] as ISODate,
  };
};

/**
 * Get the ISO date for a day name within the current week
 * Uses case-insensitive matching for day names.
 */
export const getDayDate = (dayName: string, weekId: WeekId): ISODate => {
  // Case-insensitive day mapping
  const dayMap: Record<string, number> = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6,
  };

  const dayOffset = dayMap[dayName.toLowerCase()] ?? 0;
  const { start } = getWeekDateRange(weekId);
  const startDate = new Date(start);
  startDate.setDate(startDate.getDate() + dayOffset);

  return startDate.toISOString().split('T')[0] as ISODate;
};

/**
 * Convert ExtractedEntry[] to WeeklyNote format
 */
export const convertEntriesToWeeklyNote = (
  entries: readonly ExtractedEntry[],
  weekId: WeekId,
  existingNote: WeeklyNote | null,
): WeeklyNote => {
  const dateRange = getWeekDateRange(weekId);
  const syncedAt = new Date().toISOString() as ISODateTime;

  // Separate general tasks from subject-specific entries
  const subjectEntries: ExtractedEntry[] = [];
  const newGeneralTasks: ExtractedEntry[] = [];

  for (const entry of entries) {
    if (entry.subject === 'General Tasks' || !entry.subject) {
      newGeneralTasks.push(entry);
    } else {
      subjectEntries.push(entry);
    }
  }

  // Helper to normalize day names to proper case
  const normalizeDayName = (day: string): string => {
    const normalizedDays: Record<string, string> = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    };
    return normalizedDays[day.toLowerCase()] ?? day;
  };

  // Group subject entries by day (normalized to proper case)
  const entriesByDay = new Map<string, ExtractedEntry[]>();
  for (const entry of subjectEntries) {
    const normalizedDay = normalizeDayName(entry.day);
    const dayEntries = entriesByDay.get(normalizedDay) || [];
    dayEntries.push(entry);
    entriesByDay.set(normalizedDay, dayEntries);
  }

  // Create or update day records
  const dayNames = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const days: DayRecord[] = [];

  for (const dayName of dayNames) {
    const dayEntries = entriesByDay.get(dayName) || [];
    if (dayEntries.length === 0 && !existingNote) continue;

    const date = getDayDate(dayName, weekId);

    // Group by subject
    const entriesBySubject = new Map<string, ExtractedEntry[]>();

    for (const entry of dayEntries) {
      const subjectEntriesArr = entriesBySubject.get(entry.subject) || [];
      subjectEntriesArr.push(entry);
      entriesBySubject.set(entry.subject, subjectEntriesArr);
    }

    // Find existing day record
    const existingDay = existingNote?.days.find((d) => d.dayName === dayName);

    // Merge with existing entries
    const mergedSubjectEntries: Array<{
      subject: string;
      tasks: Array<{
        content: string;
        isCompleted: boolean;
        dueDate?: ISODate;
      }>;
    }> = [];

    for (const [subject, subjectItems] of entriesBySubject.entries()) {
      const existingSubjectEntry = existingDay?.entries.find(
        (e) => e.subject === subject,
      );
      const existingTasks = existingSubjectEntry?.tasks || [];

      const newTasks = subjectItems.map((item) => ({
        content: item.content,
        isCompleted: item.isCompleted,
        dueDate: item.dueDate as ISODate | undefined,
      }));

      // Merge: keep existing tasks, add new ones (deduplicate by content)
      const mergedTasks: Array<{
        content: string;
        isCompleted: boolean;
        dueDate?: ISODate;
      }> = [...existingTasks];
      for (const newTask of newTasks) {
        if (!mergedTasks.some((t) => t.content === newTask.content)) {
          mergedTasks.push(newTask);
        }
      }

      mergedSubjectEntries.push({
        subject,
        tasks: mergedTasks,
      });
    }

    // Keep existing subject entries that aren't being updated
    if (existingDay) {
      for (const existingEntry of existingDay.entries) {
        if (!entriesBySubject.has(existingEntry.subject)) {
          mergedSubjectEntries.push({
            subject: existingEntry.subject,
            tasks: [...existingEntry.tasks],
          });
        }
      }
    }

    if (mergedSubjectEntries.length > 0) {
      days.push({
        date,
        dayName,
        entries: mergedSubjectEntries,
      });
    }
  }

  // Merge general tasks at week level
  const existingGeneralTasks = existingNote?.generalTasks || [];
  const mergedGeneralTasks = [...existingGeneralTasks];

  for (const newTask of newGeneralTasks) {
    if (!mergedGeneralTasks.some((t) => t.content === newTask.content)) {
      mergedGeneralTasks.push({
        content: newTask.content,
        isCompleted: newTask.isCompleted,
        dueDate: newTask.dueDate as ISODate | undefined,
      });
    }
  }

  return {
    week: weekId,
    dateRange,
    syncedAt,
    days,
    generalTasks: mergedGeneralTasks,
  };
};
