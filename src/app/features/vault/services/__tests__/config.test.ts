import { describe, expect, it } from "vitest";
import type { ISODate, WeekId, WeeklyNote } from "@/app/shared/types";
import {
  formatDate,
  getConfigPath,
  getSubjectsPath,
  getWeeklyNotePath,
  parseWeeklyNoteMarkdown,
  serializeWeeklyNoteToMarkdown,
} from "../config";

describe("Config Path Utilities", () => {
  describe("getConfigPath", () => {
    it("should return path to config.json", () => {
      const result = getConfigPath();
      expect(result).toBe("PaperSync/.papersync/config.json");
    });
  });

  describe("getSubjectsPath", () => {
    it("should return path to subjects.json", () => {
      const result = getSubjectsPath();
      expect(result).toBe("PaperSync/.papersync/subjects.json");
    });
  });

  describe("getWeeklyNotePath", () => {
    it("should return path with week ID", () => {
      const result = getWeeklyNotePath("2026-W05" as WeekId);
      expect(result).toBe("PaperSync/Weekly/2026-W05.md");
    });
  });
});

describe("Markdown Serialization", () => {
  describe("serializeWeeklyNoteToMarkdown", () => {
    it("should include YAML frontmatter", () => {
      const note: WeeklyNote = {
        week: "2026-W05" as WeekId,
        dateRange: {
          start: "2026-01-26" as ISODate,
          end: "2026-02-01" as ISODate,
        },
        days: [],
        generalTasks: [],
      };

      const result = serializeWeeklyNoteToMarkdown(note);

      expect(result).toContain("---");
      expect(result).toContain("week: 2026-W05");
      expect(result).toContain("date_range: 2026-01-26 to 2026-02-01");
    });

    it("should include syncedAt when present", () => {
      const note: WeeklyNote = {
        week: "2026-W05" as WeekId,
        dateRange: {
          start: "2026-01-26" as ISODate,
          end: "2026-02-01" as ISODate,
        },
        syncedAt: "2026-01-27T12:00:00Z" as WeeklyNote["syncedAt"],
        days: [],
        generalTasks: [],
      };

      const result = serializeWeeklyNoteToMarkdown(note);

      expect(result).toContain("synced_at: 2026-01-27T12:00:00Z");
    });

    it("should serialize day entries with subjects", () => {
      const note: WeeklyNote = {
        week: "2026-W05" as WeekId,
        dateRange: {
          start: "2026-01-26" as ISODate,
          end: "2026-02-01" as ISODate,
        },
        days: [
          {
            date: "2026-01-26" as ISODate,
            dayName: "Monday",
            entries: [
              {
                subject: "Math",
                tasks: [
                  { content: "Homework", isCompleted: false },
                  { content: "Review", isCompleted: true },
                ],
              },
            ],
          },
        ],
        generalTasks: [],
      };

      const result = serializeWeeklyNoteToMarkdown(note);

      expect(result).toContain("## Monday");
      expect(result).toContain("### Math");
      expect(result).toContain("- [ ] Homework");
      expect(result).toContain("- [x] Review");
    });

    it("should serialize general tasks at the end", () => {
      const note: WeeklyNote = {
        week: "2026-W05" as WeekId,
        dateRange: {
          start: "2026-01-26" as ISODate,
          end: "2026-02-01" as ISODate,
        },
        days: [
          {
            date: "2026-01-26" as ISODate,
            dayName: "Monday",
            entries: [],
          },
        ],
        generalTasks: [
          { content: "General task 1", isCompleted: false },
          { content: "General task 2", isCompleted: true },
        ],
      };

      const result = serializeWeeklyNoteToMarkdown(note);

      expect(result).toContain("## General Tasks");
      expect(result).toContain("- [ ] General task 1");
      expect(result).toContain("- [x] General task 2");

      // General tasks should come after all day entries
      const mondayIndex = result.indexOf("## Monday");
      const generalTasksIndex = result.indexOf("## General Tasks");
      expect(generalTasksIndex).toBeGreaterThan(mondayIndex);
    });
  });

  describe("parseWeeklyNoteMarkdown", () => {
    it("should parse YAML frontmatter", () => {
      const markdown = `---
week: 2026-W05
date_range: 2026-01-26 to 2026-02-01
synced_at: 2026-01-27T12:00:00Z
---

## Monday, January 26
`;

      const result = parseWeeklyNoteMarkdown(markdown, "2026-W05" as WeekId);

      expect(result.week).toBe("2026-W05");
      expect(result.dateRange.start).toBe("2026-01-26");
      expect(result.dateRange.end).toBe("2026-02-01");
      expect(result.syncedAt).toBe("2026-01-27T12:00:00Z");
    });

    it("should handle missing frontmatter gracefully", () => {
      const markdown = "# No frontmatter";

      const result = parseWeeklyNoteMarkdown(markdown, "2026-W05" as WeekId);

      expect(result.week).toBe("2026-W05");
      expect(result.dateRange.start).toBe("");
      expect(result.dateRange.end).toBe("");
    });

    it("should parse day headers and create day records", () => {
      const markdown = `---
week: 2026-W05
date_range: 2026-01-26 to 2026-02-01
---

## Monday, January 27

### Math
- [ ] Do homework

## Tuesday, January 28

### Physics
- [ ] Study for test
`;

      const result = parseWeeklyNoteMarkdown(markdown, "2026-W05" as WeekId);

      expect(result.days).toHaveLength(2);
      expect(result.days[0].dayName).toBe("Monday");
      expect(result.days[1].dayName).toBe("Tuesday");
    });

    it("should parse subject entries and tasks", () => {
      const markdown = `---
week: 2026-W05
date_range: 2026-01-26 to 2026-02-01
---

## Monday, January 27

### Math
- [ ] Do homework
- [x] Complete exercises

### Physics
- [ ] Read chapter 5
`;

      const result = parseWeeklyNoteMarkdown(markdown, "2026-W05" as WeekId);

      expect(result.days[0].entries).toHaveLength(2);

      const mathEntry = result.days[0].entries.find(
        (e) => e.subject === "Math",
      );
      expect(mathEntry).toBeDefined();
      expect(mathEntry?.tasks).toHaveLength(2);
      expect(mathEntry?.tasks[0].content).toBe("Do homework");
      expect(mathEntry?.tasks[0].isCompleted).toBe(false);
      expect(mathEntry?.tasks[1].content).toBe("Complete exercises");
      expect(mathEntry?.tasks[1].isCompleted).toBe(true);

      const physicsEntry = result.days[0].entries.find(
        (e) => e.subject === "Physics",
      );
      expect(physicsEntry).toBeDefined();
      expect(physicsEntry?.tasks).toHaveLength(1);
      expect(physicsEntry?.tasks[0].content).toBe("Read chapter 5");
    });

    it("should parse due dates from tasks", () => {
      const markdown = `---
week: 2026-W05
date_range: 2026-01-26 to 2026-02-01
---

## Monday, January 27

### Math
- [ ] Do homework [due:: 2026-01-30]
- [ ] No due date task
`;

      const result = parseWeeklyNoteMarkdown(markdown, "2026-W05" as WeekId);

      const mathEntry = result.days[0].entries[0];
      expect(mathEntry.tasks[0].content).toBe("Do homework");
      expect(mathEntry.tasks[0].dueDate).toBe("2026-01-30");
      expect(mathEntry.tasks[1].content).toBe("No due date task");
      expect(mathEntry.tasks[1].dueDate).toBeUndefined();
    });

    it("should parse week-level general tasks section at the end", () => {
      const markdown = `---
week: 2026-W05
date_range: 2026-01-26 to 2026-02-01
---

## Monday, January 27

### Math
- [ ] Do homework

## Tuesday, January 28

### Physics
- [ ] Study

## General Tasks
- [ ] Buy school supplies
- [x] Clean room
`;

      const result = parseWeeklyNoteMarkdown(markdown, "2026-W05" as WeekId);

      // General tasks are at week level, not day level
      expect(result.generalTasks).toHaveLength(2);
      expect(result.generalTasks[0].content).toBe("Buy school supplies");
      expect(result.generalTasks[0].isCompleted).toBe(false);
      expect(result.generalTasks[1].content).toBe("Clean room");
      expect(result.generalTasks[1].isCompleted).toBe(true);
    });

    it("should round-trip serialize and parse without losing data", () => {
      const originalNote: WeeklyNote = {
        week: "2026-W05" as WeekId,
        dateRange: {
          start: "2026-01-26" as ISODate,
          end: "2026-02-01" as ISODate,
        },
        syncedAt: "2026-01-27T12:00:00Z" as WeeklyNote["syncedAt"],
        days: [
          {
            date: "2026-01-27" as ISODate,
            dayName: "Monday",
            entries: [
              {
                subject: "Math",
                tasks: [
                  {
                    content: "Do homework",
                    isCompleted: false,
                    dueDate: "2026-01-30" as ISODate,
                  },
                  { content: "Complete exercises", isCompleted: true },
                ],
              },
              {
                subject: "Physics",
                tasks: [{ content: "Read chapter 5", isCompleted: false }],
              },
            ],
          },
        ],
        generalTasks: [
          { content: "Buy supplies", isCompleted: false },
          { content: "Call parent", isCompleted: true },
        ],
      };

      const markdown = serializeWeeklyNoteToMarkdown(originalNote);
      const parsedNote = parseWeeklyNoteMarkdown(
        markdown,
        "2026-W05" as WeekId,
      );

      // Verify frontmatter
      expect(parsedNote.week).toBe(originalNote.week);
      expect(parsedNote.dateRange.start).toBe(originalNote.dateRange.start);
      expect(parsedNote.dateRange.end).toBe(originalNote.dateRange.end);
      expect(parsedNote.syncedAt).toBe(originalNote.syncedAt);

      // Verify day structure
      expect(parsedNote.days).toHaveLength(1);
      expect(parsedNote.days[0].dayName).toBe("Monday");

      // Verify entries
      expect(parsedNote.days[0].entries).toHaveLength(2);

      const mathEntry = parsedNote.days[0].entries.find(
        (e) => e.subject === "Math",
      );
      expect(mathEntry?.tasks).toHaveLength(2);
      expect(mathEntry?.tasks[0].content).toBe("Do homework");
      expect(mathEntry?.tasks[0].isCompleted).toBe(false);
      expect(mathEntry?.tasks[0].dueDate).toBe("2026-01-30");
      expect(mathEntry?.tasks[1].content).toBe("Complete exercises");
      expect(mathEntry?.tasks[1].isCompleted).toBe(true);

      // Verify week-level general tasks
      expect(parsedNote.generalTasks).toHaveLength(2);
      expect(parsedNote.generalTasks[0].content).toBe("Buy supplies");
      expect(parsedNote.generalTasks[0].isCompleted).toBe(false);
      expect(parsedNote.generalTasks[1].content).toBe("Call parent");
      expect(parsedNote.generalTasks[1].isCompleted).toBe(true);
    });
  });

  describe("formatDate", () => {
    it("should format ISO date to readable format", () => {
      const result = formatDate("2026-01-27");

      expect(result).toContain("January");
      expect(result).toContain("27");
    });

    it("should handle different months", () => {
      const result = formatDate("2026-07-15");

      expect(result).toContain("July");
      expect(result).toContain("15");
    });
  });
});
