import type {
  DayRecord,
  GeneralTask,
  WeeklyNote,
} from '@/shared/types/schemas';
import { formatDate } from './weekly-note-date';

const serializeTask = (task: GeneralTask) =>
  `- ${task.isCompleted ? '[x]' : '[ ]'} ${task.content}${task.dueDate ? ` [due:: ${task.dueDate}]` : ''}`;
const serializeDay = (day: DayRecord) =>
  [
    `## ${day.dayName}, ${formatDate(day.date)}`,
    '',
    ...day.entries.flatMap((entry) => [
      `### ${entry.subject}`,
      ...entry.tasks.map(serializeTask),
      '',
    ]),
  ].join('\n');
export const serializeWeeklyNoteToMarkdown = (note: WeeklyNote): string =>
  [
    '---',
    `week: ${note.week}`,
    `date_range: ${note.dateRange.start} to ${note.dateRange.end}`,
    ...(note.syncedAt ? [`synced_at: ${note.syncedAt}`] : []),
    '---',
    '',
    note.days.map(serializeDay).join('---\n\n'),
    ...(note.generalTasks.length > 0
      ? [
          '---',
          '',
          '## General Tasks',
          '',
          ...note.generalTasks.map(serializeTask),
          '',
        ]
      : []),
  ].join('\n');
