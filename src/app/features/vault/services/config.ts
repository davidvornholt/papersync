import { Effect } from "effect";
import type {
  AppConfig,
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

  return {
    week: weekId,
    dateRange: {
      start: (dateRange[0] ?? "") as WeeklyNote["dateRange"]["start"],
      end: (dateRange[1] ?? "") as WeeklyNote["dateRange"]["end"],
    },
    syncedAt: frontmatter.synced_at as WeeklyNote["syncedAt"],
    days: [], // TODO: Parse daily entries from markdown body
  };
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

  for (const day of note.days) {
    lines.push(`## ${day.dayName}, ${formatDate(day.date)}`, "");

    for (const entry of day.entries) {
      lines.push(`### ${entry.subject}`);
      for (const task of entry.tasks) {
        const checkbox = task.isCompleted ? "[x]" : "[ ]";
        lines.push(`- ${checkbox} ${task.content}`);
      }
      lines.push("");
    }

    if (day.generalTasks.length > 0) {
      lines.push("## General Tasks");
      for (const task of day.generalTasks) {
        const checkbox = task.isCompleted ? "[x]" : "[ ]";
        lines.push(`- ${checkbox} ${task.content}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
};

export const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
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
