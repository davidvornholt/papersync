import { describe, expect, it } from 'bun:test';
import { Schema } from 'effect';
import { OCRResponse } from '@/shared/types/schemas';

const expectedConfidence = 0.95;

describe('OCRResponse Schema', () => {
  it('should accept valid OCR response', () => {
    const response = Schema.decodeUnknownSync(OCRResponse)({
      weekId: '2026-W37',
      entries: [
        {
          day: 'Monday',
          subject: 'Math',
          content: 'Homework',
          isCompleted: false,
          action: 'add',
        },
      ],
      confidence: 0.95,
    });

    expect(response.entries).toHaveLength(1);
    expect(response.confidence).toBe(expectedConfidence);
  });

  it('should accept optional notes', () => {
    const response = Schema.decodeUnknownSync(OCRResponse)({
      weekId: '2026-W37',
      entries: [],
      confidence: 0.8,
      notes: 'Partial extraction',
    });

    expect(response.notes).toBe('Partial extraction');
  });

  it('should clamp confidence to valid range', () => {
    expect(() =>
      Schema.decodeUnknownSync(OCRResponse)({
        weekId: '2026-W37',
        entries: [],
        confidence: 1.5,
      }),
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(OCRResponse)({
        weekId: '2026-W37',
        entries: [],
        confidence: -0.1,
      }),
    ).toThrow();
  });
});
