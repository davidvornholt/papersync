import type {
  DayRecord,
  GeneralTask,
  ISODate,
  WeekId,
  WeeklyNote,
} from '@/shared/types';
import { getDayDateFromWeekId } from './weekly-note-date';

type MutableTask = {
  content: string;
  isCompleted: boolean;
  dueDate?: ISODate;
};

type MutableDayEntry = {
  subject: string;
  tasks: MutableTask[];
};

type MutableDayRecord = {
  date: ISODate;
  dayName: string;
  entries: MutableDayEntry[];
};

export const parseWeeklyNoteMarkdown = (
  content: string,
  weekId: WeekId,
): WeeklyNote => {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter: Record<string, string> = {};

  if (frontmatterMatch) {
    for (const line of frontmatterMatch[1].split('\n')) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        frontmatter[key.trim()] = valueParts.join(':').trim();
      }
    }
  }

  const dateRange = frontmatter.date_range?.split(' to ') ?? [];
  const bodyContent = frontmatterMatch
    ? content.slice(frontmatterMatch[0].length).trim()
    : content.trim();

  const days: DayRecord[] = [];
  const generalTasks: GeneralTask[] = [];
  let currentDay: MutableDayRecord | null = null;
  let currentSubject: string | null = null;
  let currentEntryTasks: MutableTask[] = [];
  let isInGeneralTasksSection = false;

  const flushCurrentSubject = () => {
    if (currentDay && currentSubject && currentEntryTasks.length > 0) {
      currentDay.entries.push({
        subject: currentSubject,
        tasks: [...currentEntryTasks],
      });
      currentEntryTasks = [];
    }
  };

  const flushCurrentDay = () => {
    flushCurrentSubject();
    if (currentDay && currentDay.entries.length > 0) {
      days.push({
        date: currentDay.date,
        dayName: currentDay.dayName,
        entries: currentDay.entries.map((entry) => ({
          subject: entry.subject,
          tasks: [...entry.tasks],
        })),
      });
    }
  };

  for (const line of bodyContent.split('\n')) {
    if (line.match(/^##\s*General Tasks\s*$/i)) {
      flushCurrentDay();
      currentDay = null;
      isInGeneralTasksSection = true;
      currentSubject = null;
      continue;
    }

    const dayMatch = line.match(/^## ([A-Za-z]+),?\s*(.*)$/);
    if (dayMatch && !line.includes('General Tasks')) {
      flushCurrentDay();
      isInGeneralTasksSection = false;

      const dayName = dayMatch[1];
      const dateStr = dayMatch[2]?.trim();
      const date = dateStr
        ? parseDayDate(dateStr, weekId, dayName)
        : getDayDateFromWeekId(dayName, weekId);

      currentDay = { date, dayName, entries: [] };
      currentSubject = null;
      currentEntryTasks = [];
      continue;
    }

    const subjectMatch = line.match(/^### (.+)$/);
    if (subjectMatch && currentDay && !isInGeneralTasksSection) {
      flushCurrentSubject();
      currentSubject = subjectMatch[1].trim();
      currentEntryTasks = [];
      continue;
    }

    const taskMatch = line.match(/^- \[([ xX])\]\s*(.+)$/);
    if (!taskMatch) continue;

    const isCompleted = taskMatch[1].toLowerCase() === 'x';
    let taskContent = taskMatch[2].trim();
    let dueDate: ISODate | undefined;

    const dueDateMatch = taskContent.match(/\[due::\s*(\d{4}-\d{2}-\d{2})\]/);
    if (dueDateMatch) {
      dueDate = dueDateMatch[1] as ISODate;
      taskContent = taskContent
        .replace(/\[due::\s*\d{4}-\d{2}-\d{2}\]/, '')
        .trim();
    }

    const task: MutableTask = { content: taskContent, isCompleted, dueDate };
    if (isInGeneralTasksSection) {
      generalTasks.push(task as GeneralTask);
    } else if (currentSubject && currentDay) {
      currentEntryTasks.push(task);
    }
  }

  flushCurrentDay();

  return {
    week: weekId,
    dateRange: {
      start: (dateRange[0] ?? '') as WeeklyNote['dateRange']['start'],
      end: (dateRange[1] ?? '') as WeeklyNote['dateRange']['end'],
    },
    syncedAt: frontmatter.synced_at as WeeklyNote['syncedAt'],
    days,
    generalTasks,
  };
};

const parseDayDate = (
  dateStr: string,
  weekId: WeekId,
  dayName: string,
): ISODate => {
  const year = weekId.split('-W')[0];
  const parsedDate = new Date(`${dateStr}, ${year}`);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().split('T')[0] as ISODate;
  }
  return getDayDateFromWeekId(dayName, weekId);
};
