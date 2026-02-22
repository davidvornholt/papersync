import { describe, expect, it } from 'bun:test';
import type { WeekId } from '@/shared/types';
import { parseWeeklyNoteMarkdown } from '../config';

describe('parseWeeklyNoteMarkdown', () => {
  it('should parse YAML frontmatter', () => {
    const markdown = `---
week: 2026-W05
date_range: 2026-01-26 to 2026-02-01
synced_at: 2026-01-27T12:00:00Z
---

## Monday, January 26
`;

    const result = parseWeeklyNoteMarkdown(markdown, '2026-W05' as WeekId);

    expect(String(result.week)).toBe('2026-W05');
    expect(String(result.dateRange.start)).toBe('2026-01-26');
    expect(String(result.dateRange.end)).toBe('2026-02-01');
    expect(String(result.syncedAt)).toBe('2026-01-27T12:00:00Z');
  });

  it('should handle missing frontmatter gracefully', () => {
    const result = parseWeeklyNoteMarkdown(
      '# No frontmatter',
      '2026-W05' as WeekId,
    );

    expect(String(result.week)).toBe('2026-W05');
    expect(String(result.dateRange.start)).toBe('');
    expect(String(result.dateRange.end)).toBe('');
  });

  it('should parse day headers and create day records', () => {
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

    const result = parseWeeklyNoteMarkdown(markdown, '2026-W05' as WeekId);

    expect(result.days).toHaveLength(2);
    expect(result.days[0].dayName).toBe('Monday');
    expect(result.days[1].dayName).toBe('Tuesday');
  });

  it('should parse subject entries and tasks', () => {
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

    const result = parseWeeklyNoteMarkdown(markdown, '2026-W05' as WeekId);

    expect(result.days[0].entries).toHaveLength(2);

    const mathEntry = result.days[0].entries.find((e) => e.subject === 'Math');
    expect(mathEntry).toBeDefined();
    expect(mathEntry?.tasks).toHaveLength(2);
    expect(mathEntry?.tasks[0].content).toBe('Do homework');
    expect(mathEntry?.tasks[0].isCompleted).toBe(false);
    expect(mathEntry?.tasks[1].content).toBe('Complete exercises');
    expect(mathEntry?.tasks[1].isCompleted).toBe(true);

    const physicsEntry = result.days[0].entries.find(
      (e) => e.subject === 'Physics',
    );
    expect(physicsEntry).toBeDefined();
    expect(physicsEntry?.tasks).toHaveLength(1);
    expect(physicsEntry?.tasks[0].content).toBe('Read chapter 5');
  });

  it('should parse due dates from tasks', () => {
    const markdown = `---
week: 2026-W05
date_range: 2026-01-26 to 2026-02-01
---

## Monday, January 27

### Math
- [ ] Do homework [due:: 2026-01-30]
- [ ] No due date task
`;

    const result = parseWeeklyNoteMarkdown(markdown, '2026-W05' as WeekId);

    const mathEntry = result.days[0].entries[0];
    expect(mathEntry.tasks[0].content).toBe('Do homework');
    expect(String(mathEntry.tasks[0].dueDate)).toBe('2026-01-30');
    expect(mathEntry.tasks[1].content).toBe('No due date task');
    expect(mathEntry.tasks[1].dueDate).toBeUndefined();
  });

  it('should parse week-level general tasks section at the end', () => {
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

    const result = parseWeeklyNoteMarkdown(markdown, '2026-W05' as WeekId);

    expect(result.generalTasks).toHaveLength(2);
    expect(result.generalTasks[0].content).toBe('Buy school supplies');
    expect(result.generalTasks[0].isCompleted).toBe(false);
    expect(result.generalTasks[1].content).toBe('Clean room');
    expect(result.generalTasks[1].isCompleted).toBe(true);
  });
});
