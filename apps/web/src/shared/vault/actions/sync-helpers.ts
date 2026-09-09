import { getDayDate, getWeekIsoDateRange } from '@/shared/planner/week';
import type {
  DayEntry,
  GeneralTask,
  ISODate,
  ISODateTime,
  WeekId,
  WeeklyNote,
} from '@/shared/types/schemas';
import type { ExtractedEntry } from './sync-helpers-types';
import { isValidDateRange, isValidISODate } from '../services/weekly-note-date';

const dayNames = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const isGeneralTask = (entry: ExtractedEntry) =>
  entry.subject === 'General Tasks' || !entry.subject;
const mergeTasks = (
  existing: ReadonlyArray<GeneralTask>,
  entries: ReadonlyArray<ExtractedEntry>,
): ReadonlyArray<GeneralTask> => {
  const tasks = new Map(existing.map((task) => [task.content, task]));
  for (const entry of entries) {
    const previous = tasks.get(entry.content);
    tasks.set(entry.content, {
      content: entry.content,
      isCompleted: entry.isCompleted || previous?.isCompleted === true,
      dueDate: (entry.dueDate as ISODate | undefined) ?? previous?.dueDate,
    });
  }
  return [...tasks.values()];
};
const mergeSubjects = (
  existing: ReadonlyArray<DayEntry>,
  entries: ReadonlyArray<ExtractedEntry>,
): ReadonlyArray<DayEntry> => {
  const subjects = new Set([
    ...entries.map((entry) => entry.subject),
    ...existing.map((entry) => entry.subject),
  ]);
  return [...subjects].map((subject) => ({
    subject,
    tasks: mergeTasks(
      existing.find((entry) => entry.subject === subject)?.tasks ?? [],
      entries.filter((entry) => entry.subject === subject),
    ),
  }));
};
export const convertEntriesToWeeklyNote = (
  entries: ReadonlyArray<ExtractedEntry>,
  weekId: WeekId,
  existingNote: WeeklyNote | null,
): WeeklyNote => ({
  week: weekId,
  dateRange: isValidDateRange(existingNote?.dateRange)
    ? existingNote.dateRange
    : getWeekIsoDateRange(weekId),
  syncedAt: new Date().toISOString() as ISODateTime,
  days: dayNames.flatMap((dayName) => {
    const existing = existingNote?.days.find((day) => day.dayName === dayName);
    const incoming = entries.filter(
      (entry) =>
        !isGeneralTask(entry) &&
        entry.day.toLowerCase() === dayName.toLowerCase(),
    );
    const subjects = mergeSubjects(existing?.entries ?? [], incoming);
    return subjects.length > 0
      ? [
          {
            date:
              existing && isValidISODate(existing.date)
                ? existing.date
                : getDayDate(dayName, weekId),
            dayName,
            entries: subjects,
          },
        ]
      : [];
  }),
  generalTasks: mergeTasks(
    existingNote?.generalTasks ?? [],
    entries.filter(isGeneralTask),
  ),
});
