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
} from '@/shared/types';
import type { ExtractedEntry } from './sync-helpers-types';
import {
  getCurrentWeekId,
  getDayDate,
  getWeekDateRange,
} from './sync-helpers-week';

export { getCurrentWeekId, getDayDate, getWeekDateRange };
export type { ExtractedEntry } from './sync-helpers-types';

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
