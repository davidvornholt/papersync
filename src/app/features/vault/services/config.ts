import { Effect } from "effect";
import type {
  AppConfig,
  DayRecord,
  GeneralTask,
  ISODate,
  SubjectsConfig,
  WeekId,
  WeeklyNote,
} from "@/app/shared/types";
import {
  type VaultError,
  type VaultFileNotFoundError,
  VaultService,
} from "./filesystem";

// ============================================================================
// Path Constants
// ============================================================================

const PAPERSYNC_ROOT = "PaperSync";
const CONFIG_DIR = ".papersync";
const CONFIG_FILE = "config.json";
const SUBJECTS_FILE = "subjects.json";
const TIMETABLE_FILE = "timetable.json";
const WEEKLY_DIR = "Weekly";
const OVERVIEW_FILE = "Overview.md";

// ============================================================================
// Config Operations
// ============================================================================

export const getConfigPath = (): string =>
  `${PAPERSYNC_ROOT}/${CONFIG_DIR}/${CONFIG_FILE}`;

export const getSubjectsPath = (): string =>
  `${PAPERSYNC_ROOT}/${CONFIG_DIR}/${SUBJECTS_FILE}`;

export const getWeeklyNotePath = (weekId: WeekId): string =>
  `${PAPERSYNC_ROOT}/${WEEKLY_DIR}/${weekId}.md`;

export const readConfig = (): Effect.Effect<
  AppConfig | null,
  VaultFileNotFoundError | VaultError,
  VaultService
> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const exists = yield* vault.fileExists(getConfigPath());
    if (!exists) {
      return null;
    }
    const content = yield* vault.readFile(getConfigPath());
    return JSON.parse(content) as AppConfig;
  });

export const writeConfig = (
  config: AppConfig,
): Effect.Effect<void, VaultError, VaultService> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/${CONFIG_DIR}`);
    yield* vault.writeFile(getConfigPath(), JSON.stringify(config, null, 2));
  });

// ============================================================================
// Subjects Operations
// ============================================================================

export const readSubjects = (): Effect.Effect<
  SubjectsConfig,
  VaultFileNotFoundError | VaultError,
  VaultService
> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const exists = yield* vault.fileExists(getSubjectsPath());
    if (!exists) {
      return [];
    }
    const content = yield* vault.readFile(getSubjectsPath());
    return JSON.parse(content) as SubjectsConfig;
  });

export const writeSubjects = (
  subjects: SubjectsConfig,
): Effect.Effect<void, VaultError, VaultService> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/${CONFIG_DIR}`);
    yield* vault.writeFile(
      getSubjectsPath(),
      JSON.stringify(subjects, null, 2),
    );
  });

// ============================================================================
// Timetable Operations
// ============================================================================

/**
 * Timetable day structure for vault storage
 */
export type TimetableDayConfig = {
  readonly day: string;
  readonly slots: ReadonlyArray<{ id: string; subjectId: string }>;
};

export type TimetableConfig = ReadonlyArray<TimetableDayConfig>;

export const getTimetablePath = (): string =>
  `${PAPERSYNC_ROOT}/${CONFIG_DIR}/${TIMETABLE_FILE}`;

export const readTimetable = (): Effect.Effect<
  TimetableConfig,
  VaultFileNotFoundError | VaultError,
  VaultService
> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const exists = yield* vault.fileExists(getTimetablePath());
    if (!exists) {
      return [];
    }
    const content = yield* vault.readFile(getTimetablePath());
    return JSON.parse(content) as TimetableConfig;
  });

export const writeTimetable = (
  timetable: TimetableConfig,
): Effect.Effect<void, VaultError, VaultService> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/${CONFIG_DIR}`);
    yield* vault.writeFile(
      getTimetablePath(),
      JSON.stringify(timetable, null, 2),
    );
  });

// ============================================================================
// Weekly Note Operations
// ============================================================================

export const readWeeklyNote = (
  weekId: WeekId,
): Effect.Effect<
  WeeklyNote | null,
  VaultFileNotFoundError | VaultError,
  VaultService
> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const notePath = getWeeklyNotePath(weekId);
    const exists = yield* vault.fileExists(notePath);
    if (!exists) {
      return null;
    }
    const content = yield* vault.readFile(notePath);
    return parseWeeklyNoteMarkdown(content, weekId);
  });

export const writeWeeklyNote = (
  note: WeeklyNote,
): Effect.Effect<void, VaultError, VaultService> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/${WEEKLY_DIR}`);
    const markdown = serializeWeeklyNoteToMarkdown(note);
    yield* vault.writeFile(getWeeklyNotePath(note.week), markdown);
  });

// ============================================================================
// Markdown Parsing & Serialization
// ============================================================================

export const parseWeeklyNoteMarkdown = (
  content: string,
  weekId: WeekId,
): WeeklyNote => {
  // Parse YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter: Record<string, string> = {};

  if (frontmatterMatch) {
    const lines = frontmatterMatch[1].split("\n");
    for (const line of lines) {
      const [key, ...valueParts] = line.split(":");
      if (key && valueParts.length > 0) {
        frontmatter[key.trim()] = valueParts.join(":").trim();
      }
    }
  }

  const dateRange = frontmatter.date_range?.split(" to ") ?? [];

  // Parse markdown body for day records
  const bodyContent = frontmatterMatch
    ? content.slice(frontmatterMatch[0].length).trim()
    : content.trim();

  // Mutable builder types for parsing
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

  const days: DayRecord[] = [];
  const generalTasks: GeneralTask[] = []; // Week-level general tasks
  let currentDay: MutableDayRecord | null = null;
  let currentSubject: string | null = null;
  let currentEntryTasks: MutableTask[] = [];
  let isInGeneralTasksSection = false;

  const lines = bodyContent.split("\n");

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
      // Convert mutable day to readonly DayRecord
      days.push({
        date: currentDay.date,
        dayName: currentDay.dayName,
        entries: currentDay.entries.map((e) => ({
          subject: e.subject,
          tasks: [...e.tasks],
        })),
      });
    }
  };

  for (const line of lines) {
    // Match "## General Tasks" header (week-level, at the end)
    if (line.match(/^##\s*General Tasks\s*$/i)) {
      flushCurrentDay();
      currentDay = null;
      isInGeneralTasksSection = true;
      currentSubject = null;
      continue;
    }

    // Match day headers: ## Monday, January 27
    const dayMatch = line.match(/^## ([A-Za-z]+),?\s*(.*)$/);
    if (dayMatch && !line.includes("General Tasks")) {
      flushCurrentDay();
      isInGeneralTasksSection = false;

      const dayName = dayMatch[1];
      // Try to parse date from the header, or calculate from week ID
      let date: ISODate;
      const dateStr = dayMatch[2]?.trim();
      if (dateStr) {
        // Try to parse date like "January 27" - we need the year from the weekId
        const year = weekId.split("-W")[0];
        const parsedDate = new Date(`${dateStr}, ${year}`);
        if (!Number.isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString().split("T")[0] as ISODate;
        } else {
          // Fallback: calculate from week ID
          date = getDayDateFromWeekId(dayName, weekId);
        }
      } else {
        date = getDayDateFromWeekId(dayName, weekId);
      }

      currentDay = {
        date,
        dayName,
        entries: [],
      };
      currentSubject = null;
      currentEntryTasks = [];
      continue;
    }

    // Match subject headers: ### Mathematics
    const subjectMatch = line.match(/^### (.+)$/);
    if (subjectMatch && currentDay && !isInGeneralTasksSection) {
      flushCurrentSubject();
      currentSubject = subjectMatch[1].trim();
      currentEntryTasks = [];
      continue;
    }

    // Match task lines: - [ ] or - [x] content 📅 2024-01-27
    const taskMatch = line.match(/^- \[([ xX])\]\s*(.+)$/);
    if (taskMatch) {
      const isCompleted = taskMatch[1].toLowerCase() === "x";
      let taskContent = taskMatch[2].trim();
      let dueDate: ISODate | undefined;

      // Extract due date if present
      const dueDateMatch = taskContent.match(/\[due::\s*(\d{4}-\d{2}-\d{2})\]/);
      if (dueDateMatch) {
        dueDate = dueDateMatch[1] as ISODate;
        taskContent = taskContent.replace(/\[due::\s*\d{4}-\d{2}-\d{2}\]/, "").trim();
      }

      const task: MutableTask = {
        content: taskContent,
        isCompleted,
        ...(dueDate && { dueDate }),
      };

      if (isInGeneralTasksSection) {
        // Week-level general tasks
        generalTasks.push(task as GeneralTask);
      } else if (currentSubject && currentDay) {
        currentEntryTasks.push(task);
      }
    }
  }

  // Flush the last day
  flushCurrentDay();

  return {
    week: weekId,
    dateRange: {
      start: (dateRange[0] ?? "") as WeeklyNote["dateRange"]["start"],
      end: (dateRange[1] ?? "") as WeeklyNote["dateRange"]["end"],
    },
    syncedAt: frontmatter.synced_at as WeeklyNote["syncedAt"],
    days,
    generalTasks,
  };
};

/**
 * Helper to calculate date from day name and week ID
 */
const getDayDateFromWeekId = (dayName: string, weekId: WeekId): ISODate => {
  const dayMap: Record<string, number> = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6,
  };

  const [yearStr, weekPart] = weekId.split("-W");
  const year = parseInt(yearStr, 10);
  const weekNumber = parseInt(weekPart, 10);

  // Calculate the first day of the year
  const jan1 = new Date(year, 0, 1);
  // Find the first Monday of the year
  const dayOffset = (jan1.getDay() + 6) % 7;
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() - dayOffset + (dayOffset > 3 ? 7 : 0));

  // Calculate start of the target week
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  // Add the day offset
  const targetDate = new Date(weekStart);
  targetDate.setDate(weekStart.getDate() + (dayMap[dayName] ?? 0));

  return targetDate.toISOString().split("T")[0] as ISODate;
};

export const serializeWeeklyNoteToMarkdown = (note: WeeklyNote): string => {
  const lines: string[] = [
    "---",
    `week: ${note.week}`,
    `date_range: ${note.dateRange.start} to ${note.dateRange.end}`,
  ];

  if (note.syncedAt) {
    lines.push(`synced_at: ${note.syncedAt}`);
  }

  lines.push("---", "");

  // Write all day entries with separators between them
  for (let i = 0; i < note.days.length; i++) {
    const day = note.days[i];

    // Add separator before each day (except the first)
    if (i > 0) {
      lines.push("---", "");
    }

    lines.push(`## ${day.dayName}, ${formatDate(day.date)}`, "");

    for (const entry of day.entries) {
      lines.push(`### ${entry.subject}`);
      for (const task of entry.tasks) {
        const checkbox = task.isCompleted ? "[x]" : "[ ]";
        const dueDateSuffix = task.dueDate ? ` [due:: ${task.dueDate}]` : "";
        lines.push(`- ${checkbox} ${task.content}${dueDateSuffix}`);
      }
      lines.push("");
    }
  }

  // Write week-level general tasks at the end
  if (note.generalTasks.length > 0) {
    lines.push("---", "", "## General Tasks", "");
    for (const task of note.generalTasks) {
      const checkbox = task.isCompleted ? "[x]" : "[ ]";
      const dueDateSuffix = task.dueDate ? ` [due:: ${task.dueDate}]` : "";
      lines.push(`- ${checkbox} ${task.content}${dueDateSuffix}`);
    }
    lines.push("");
  }

  return lines.join("\n");
};

export const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
};

// ============================================================================
// Overview File Operations
// ============================================================================

export const getOverviewPath = (): string => `${OVERVIEW_FILE}`;

/**
 * Generate the content for Overview.md with DataViewJS queries.
 * This file displays uncompleted homework tasks grouped by due date.
 */
export const generateOverviewContent = (): string => {
  return `---
title: Homework Overview
---

# 📚 Homework Overview

This page dynamically displays all uncompleted homework tasks from PaperSync. Click checkboxes to mark tasks as complete.

---

## ⚠️ Overdue

\`\`\`dataviewjs
const today = dv.date("today").toISODate();
const pages = dv.pages('"PaperSync/Weekly"');

const tasks = [];
for (const page of pages) {
  const pageTasks = page.file.tasks.where(t => !t.completed && t.text.includes("[due::"));
  for (const task of pageTasks) {
    const dateMatch = task.text.match(/\\[due::\\s*(\\d{4}-\\d{2}-\\d{2})\\]/);
    if (dateMatch && dateMatch[1] < today) {
      tasks.push(task);
    }
  }
}

if (tasks.length === 0) {
  dv.paragraph("✅ No overdue tasks!");
} else {
  dv.taskList(tasks, false);
}
\`\`\`

---

## 🔴 Due Today

\`\`\`dataviewjs
const today = dv.date("today").toISODate();
const pages = dv.pages('"PaperSync/Weekly"');

const tasks = [];
for (const page of pages) {
  const pageTasks = page.file.tasks.where(t => !t.completed && t.text.includes("[due::"));
  for (const task of pageTasks) {
    const dateMatch = task.text.match(/\\[due::\\s*(\\d{4}-\\d{2}-\\d{2})\\]/);
    if (dateMatch && dateMatch[1] === today) {
      tasks.push(task);
    }
  }
}

if (tasks.length === 0) {
  dv.paragraph("✅ No tasks due today!");
} else {
  dv.taskList(tasks, false);
}
\`\`\`

---

## 🟡 Due Tomorrow

\`\`\`dataviewjs
const tomorrow = dv.date("today").plus({ days: 1 }).toISODate();
const pages = dv.pages('"PaperSync/Weekly"');

const tasks = [];
for (const page of pages) {
  const pageTasks = page.file.tasks.where(t => !t.completed && t.text.includes("[due::"));
  for (const task of pageTasks) {
    const dateMatch = task.text.match(/\\[due::\\s*(\\d{4}-\\d{2}-\\d{2})\\]/);
    if (dateMatch && dateMatch[1] === tomorrow) {
      tasks.push(task);
    }
  }
}

if (tasks.length === 0) {
  dv.paragraph("✅ No tasks due tomorrow!");
} else {
  dv.taskList(tasks, false);
}
\`\`\`

---

## 🟢 Due Later

\`\`\`dataviewjs
const tomorrow = dv.date("today").plus({ days: 1 }).toISODate();
const pages = dv.pages('"PaperSync/Weekly"');

const tasks = [];
for (const page of pages) {
  const pageTasks = page.file.tasks.where(t => !t.completed && t.text.includes("[due::"));
  for (const task of pageTasks) {
    const dateMatch = task.text.match(/\\[due::\\s*(\\d{4}-\\d{2}-\\d{2})\\]/);
    if (dateMatch && dateMatch[1] > tomorrow) {
      tasks.push(task);
    }
  }
}

if (tasks.length === 0) {
  dv.paragraph("✅ No upcoming tasks!");
} else {
  dv.taskList(tasks, false);
}
\`\`\`

---

## 📋 General Tasks

\`\`\`dataviewjs
const pages = dv.pages('"PaperSync/Weekly"');

const tasks = [];
for (const page of pages) {
  // Get tasks that are in the General Tasks section
  const allTasks = page.file.tasks.where(t => !t.completed);
  for (const task of allTasks) {
    // Check if the task is under a "General Tasks" section header
    if (task.section && task.section.subpath === "General Tasks") {
      tasks.push(task);
    }
  }
}

if (tasks.length === 0) {
  dv.paragraph("✅ No uncompleted general tasks!");
} else {
  dv.taskList(tasks, false);
}
\`\`\`

---

## 📝 No Due Date

\`\`\`dataviewjs
const pages = dv.pages('"PaperSync/Weekly"');

const tasks = [];
for (const page of pages) {
  const pageTasks = page.file.tasks.where(t => !t.completed && !t.text.includes("[due::"));
  for (const task of pageTasks) {
    // Exclude tasks from General Tasks section (shown separately)
    if (!task.section || task.section.subpath !== "General Tasks") {
      tasks.push(task);
    }
  }
}

if (tasks.length === 0) {
  dv.paragraph("✅ All tasks have due dates!");
} else {
  dv.taskList(tasks, false);
}
\`\`\`
`;
};

// ============================================================================
// Vault Initialization
// ============================================================================

export const initializeVault = (): Effect.Effect<
  void,
  VaultError,
  VaultService
> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;

    // Create directory structure
    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/${CONFIG_DIR}`);
    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/${WEEKLY_DIR}`);
    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/Tasks`);
    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/Subjects`);

    // Create default config if not exists
    const configExists = yield* vault.fileExists(getConfigPath());
    if (!configExists) {
      const defaultConfig: AppConfig = {
        vaultPath: "",
        vaultAccessMethod: "local",
        aiProvider: "google",
        subjectsPerDay: 4,
      };
      yield* writeConfig(defaultConfig);
    }

    // Create default subjects if not exists
    const subjectsExist = yield* vault.fileExists(getSubjectsPath());
    if (!subjectsExist) {
      const defaultSubjects: SubjectsConfig = [
        { id: "1", name: "Mathematics", order: 1 },
        { id: "2", name: "Physics", order: 2 },
        { id: "3", name: "Chemistry", order: 3 },
        { id: "4", name: "Literature", order: 4 },
      ];
      yield* writeSubjects(defaultSubjects);
    }
  });
