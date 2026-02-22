import type { WeeklyNote } from '@/shared/types';
import { formatDate } from './weekly-note-date';

export const serializeWeeklyNoteToMarkdown = (note: WeeklyNote): string => {
  const lines: string[] = [
    '---',
    `week: ${note.week}`,
    `date_range: ${note.dateRange.start} to ${note.dateRange.end}`,
  ];

  if (note.syncedAt) {
    lines.push(`synced_at: ${note.syncedAt}`);
  }

  lines.push('---', '');

  for (const [index, day] of note.days.entries()) {
    if (index > 0) {
      lines.push('---', '');
    }

    lines.push(`## ${day.dayName}, ${formatDate(day.date)}`, '');

    for (const entry of day.entries) {
      lines.push(`### ${entry.subject}`);
      for (const task of entry.tasks) {
        const checkbox = task.isCompleted ? '[x]' : '[ ]';
        const dueDateSuffix = task.dueDate ? ` [due:: ${task.dueDate}]` : '';
        lines.push(`- ${checkbox} ${task.content}${dueDateSuffix}`);
      }
      lines.push('');
    }
  }

  if (note.generalTasks.length > 0) {
    lines.push('---', '', '## General Tasks', '');
    for (const task of note.generalTasks) {
      const checkbox = task.isCompleted ? '[x]' : '[ ]';
      const dueDateSuffix = task.dueDate ? ` [due:: ${task.dueDate}]` : '';
      lines.push(`- ${checkbox} ${task.content}${dueDateSuffix}`);
    }
    lines.push('');
  }

  return lines.join('\n');
};
