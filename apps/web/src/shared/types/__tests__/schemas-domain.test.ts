import { describe, expect, it } from 'bun:test';
import { Schema } from '@effect/schema';
import { OCRResponse, QRPayload, WeeklyNote } from '@/shared/types/schemas';

describe('OCRResponse Schema', () => {
  it('should accept valid OCR response', () => {
    const response = Schema.decodeUnknownSync(OCRResponse)({
      entries: [
        {
          day: 'Monday',
          subject: 'Math',
          content: 'Homework',
          isTask: true,
          isCompleted: false,
          action: 'add',
        },
      ],
      confidence: 0.95,
    });

    expect(response.entries).toHaveLength(1);
    expect(response.confidence).toBe(0.95);
  });

  it('should accept optional notes', () => {
    const response = Schema.decodeUnknownSync(OCRResponse)({
      entries: [],
      confidence: 0.8,
      notes: 'Partial extraction',
    });

    expect(response.notes).toBe('Partial extraction');
  });

  it('should clamp confidence to valid range', () => {
    expect(() =>
      Schema.decodeUnknownSync(OCRResponse)({
        entries: [],
        confidence: 1.5,
      }),
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(OCRResponse)({
        entries: [],
        confidence: -0.1,
      }),
    ).toThrow();
  });
});

describe('WeeklyNote Schema', () => {
  it('should accept valid weekly note', () => {
    const note = Schema.decodeUnknownSync(WeeklyNote)({
      week: '2026-W05',
      dateRange: {
        start: '2026-01-27',
        end: '2026-02-02',
      },
      days: [],
      generalTasks: [],
    });

    expect(String(note.week)).toBe('2026-W05');
    expect(String(note.dateRange.start)).toBe('2026-01-27');
    expect(note.days).toEqual([]);
    expect(note.generalTasks).toEqual([]);
  });

  it('should accept weekly note with day entries', () => {
    const note = Schema.decodeUnknownSync(WeeklyNote)({
      week: '2026-W05',
      dateRange: {
        start: '2026-01-27',
        end: '2026-02-02',
      },
      days: [
        {
          date: '2026-01-27',
          dayName: 'Monday',
          entries: [
            {
              subject: 'Mathematics',
              tasks: [{ content: 'Problem set 7', isCompleted: false }],
            },
          ],
        },
      ],
      generalTasks: [{ content: 'Buy supplies', isCompleted: false }],
    });

    expect(note.days).toHaveLength(1);
    expect(note.days[0].entries[0].subject).toBe('Mathematics');
    expect(note.generalTasks).toHaveLength(1);
  });
});

describe('QRPayload Schema', () => {
  it('should accept valid QR payload', () => {
    const payload = Schema.decodeUnknownSync(QRPayload)({
      week: '2026-W05',
      checksum: 'abc123',
      version: 1,
    });

    expect(String(payload.week)).toBe('2026-W05');
    expect(payload.checksum).toBe('abc123');
    expect(payload.version).toBe(1);
  });

  it('should reject invalid version', () => {
    expect(() =>
      Schema.decodeUnknownSync(QRPayload)({
        week: '2026-W05',
        checksum: 'abc',
        version: 2,
      }),
    ).toThrow();
  });

  it('should require valid week ID format', () => {
    expect(() =>
      Schema.decodeUnknownSync(QRPayload)({
        week: 'invalid-week',
        checksum: 'abc123',
        version: 1,
      }),
    ).toThrow();
  });
});
