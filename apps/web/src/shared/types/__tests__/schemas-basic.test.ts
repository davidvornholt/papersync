import { describe, expect, it } from 'bun:test';
import { Schema } from '@effect/schema';
import {
  ISODate,
  ISODateTime,
  Subject,
  TaskAction,
  TaskEntry,
  WeekId,
} from '@/shared/types/schemas';

describe('WeekId Schema', () => {
  it('should accept valid week IDs', () => {
    expect(String(Schema.decodeUnknownSync(WeekId)('2026-W05'))).toBe(
      '2026-W05',
    );
    expect(String(Schema.decodeUnknownSync(WeekId)('2024-W52'))).toBe(
      '2024-W52',
    );
    expect(String(Schema.decodeUnknownSync(WeekId)('2025-W01'))).toBe(
      '2025-W01',
    );
  });

  it('should reject invalid week IDs', () => {
    expect(() => Schema.decodeUnknownSync(WeekId)('2024-05')).toThrow();
    expect(() => Schema.decodeUnknownSync(WeekId)('W05-2024')).toThrow();
    expect(() => Schema.decodeUnknownSync(WeekId)('invalid')).toThrow();
  });
});

describe('ISODate Schema', () => {
  it('should accept valid ISO dates', () => {
    expect(String(Schema.decodeUnknownSync(ISODate)('2026-01-27'))).toBe(
      '2026-01-27',
    );
    expect(String(Schema.decodeUnknownSync(ISODate)('2024-12-31'))).toBe(
      '2024-12-31',
    );
  });

  it('should reject invalid ISO dates', () => {
    expect(() => Schema.decodeUnknownSync(ISODate)('27-01-2026')).toThrow();
    expect(() => Schema.decodeUnknownSync(ISODate)('2026/01/27')).toThrow();
    expect(() => Schema.decodeUnknownSync(ISODate)('invalid')).toThrow();
  });
});

describe('ISODateTime Schema', () => {
  it('should accept valid ISO date-times', () => {
    expect(
      String(Schema.decodeUnknownSync(ISODateTime)('2026-01-27T12:00:00')),
    ).toBe('2026-01-27T12:00:00');
    expect(
      String(Schema.decodeUnknownSync(ISODateTime)('2026-01-27T12:00:00Z')),
    ).toBe('2026-01-27T12:00:00Z');
  });
});

describe('Subject Schema', () => {
  it('should accept valid subjects with required fields', () => {
    const subject = Schema.decodeUnknownSync(Subject)({
      id: 'subj-123',
      name: 'Mathematics',
      color: '#3B82F6',
    });

    expect(subject.id).toBe('subj-123');
    expect(subject.name).toBe('Mathematics');
    expect(subject.color).toBe('#3B82F6');
  });

  it('should allow optional color', () => {
    const subject = Schema.decodeUnknownSync(Subject)({
      id: 'subj-456',
      name: 'Physics',
    });
    expect(subject.color).toBeUndefined();
  });

  it('should reject missing name', () => {
    expect(() =>
      Schema.decodeUnknownSync(Subject)({
        id: 'subj-789',
      }),
    ).toThrow();
  });
});

describe('TaskAction Schema', () => {
  it('should accept valid task actions', () => {
    expect(Schema.decodeUnknownSync(TaskAction)('add')).toBe('add');
    expect(Schema.decodeUnknownSync(TaskAction)('modify')).toBe('modify');
    expect(Schema.decodeUnknownSync(TaskAction)('complete')).toBe('complete');
  });

  it('should reject invalid task actions', () => {
    expect(() => Schema.decodeUnknownSync(TaskAction)('delete')).toThrow();
    expect(() => Schema.decodeUnknownSync(TaskAction)('invalid')).toThrow();
  });
});

describe('TaskEntry Schema', () => {
  it('should accept valid task entries', () => {
    const entry = Schema.decodeUnknownSync(TaskEntry)({
      day: 'Monday',
      subject: 'Math',
      content: 'Complete problem set',
      isTask: true,
      isCompleted: false,
      action: 'add',
    });

    expect(entry.day).toBe('Monday');
    expect(entry.subject).toBe('Math');
    expect(entry.content).toBe('Complete problem set');
    expect(entry.isCompleted).toBe(false);
    expect(entry.action).toBe('add');
  });
});
