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
            generalTasks: [],
          },
        ],
      };

      const result = serializeWeeklyNoteToMarkdown(note);

      expect(result).toContain("## Monday");
      expect(result).toContain("### Math");
      expect(result).toContain("- [ ] Homework");
      expect(result).toContain("- [x] Review");
    });

    it("should serialize general tasks", () => {
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
            generalTasks: [{ content: "General task", isCompleted: false }],
          },
        ],
      };

      const result = serializeWeeklyNoteToMarkdown(note);

      expect(result).toContain("## General Tasks");
      expect(result).toContain("- [ ] General task");
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
