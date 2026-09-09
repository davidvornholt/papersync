import type {
  GeneralTask,
  ISODate,
  ISODateTime,
  WeekId,
  WeeklyNote,
} from '@/shared/types/schemas';
import { getDayDateFromHeading, parseDateRange } from './weekly-note-date';

const frontmatterPattern = /^---\r?\n(?<metadata>[\s\S]*?)\r?\n---/u;
const sectionPattern =
  /^## (?<heading>.+)\r?\n(?<body>[\s\S]*?)(?=^## |$(?![\s\S]))/gmu;
const subjectPattern =
  /^### (?<subject>.+)\r?\n(?<body>[\s\S]*?)(?=^### |$(?![\s\S]))/gmu;
const taskPattern = /^- \[(?<completed>[ xX])\]\s*(?<content>.+)$/gmu;
const duePattern = /\[due::\s*(?<date>\d{4}-\d{2}-\d{2})\]/u;
const dayPattern =
  /^(?<day>Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,?\s+(?<date>.+))?$/u;
const syncedAtPattern = /^synced_at:\s*(?<value>.+)$/mu;

const parseTasks = (body: string): ReadonlyArray<GeneralTask> =>
  [...body.matchAll(taskPattern)].flatMap((match) => {
    const { groups } = match;
    if (!groups) {
      return [];
    }
    const due = duePattern.exec(groups.content);
    return [
      {
        content: groups.content.replace(duePattern, '').trim(),
        isCompleted: groups.completed.toLowerCase() === 'x',
        dueDate: due?.groups?.date as ISODate | undefined,
      },
    ];
  });
export const parseWeeklyNoteMarkdown = (
  content: string,
  weekId: WeekId,
): WeeklyNote => {
  const metadata = frontmatterPattern.exec(content)?.groups?.metadata ?? '';
  const dateRange = parseDateRange(metadata, weekId);
  const sections = [
    ...content.replace(frontmatterPattern, '').matchAll(sectionPattern),
  ];
  return {
    week: weekId,
    dateRange,
    syncedAt: syncedAtPattern.exec(metadata)?.groups?.value as
      | ISODateTime
      | undefined,
    days: sections.flatMap((section) => {
      const { groups } = section;
      if (!groups) {
        return [];
      }
      const dayGroups = dayPattern.exec(groups.heading)?.groups;
      const dayName = dayGroups?.day;
      if (!dayName) {
        return [];
      }
      return [
        {
          date: getDayDateFromHeading(
            dayName,
            dayGroups.date,
            dateRange,
            weekId,
          ),
          dayName,
          entries: [...groups.body.matchAll(subjectPattern)].flatMap(
            (subject) =>
              subject.groups
                ? [
                    {
                      subject: subject.groups.subject.trim(),
                      tasks: parseTasks(subject.groups.body),
                    },
                  ]
                : [],
          ),
        },
      ];
    }),
    generalTasks: sections.flatMap((section) =>
      section.groups?.heading.trim().toLowerCase() === 'general tasks'
        ? parseTasks(section.groups.body)
        : [],
    ),
  };
};
