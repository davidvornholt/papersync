import { describe, expect, it } from 'bun:test';
import { Schema } from 'effect';
import { OCRResponse, QRPayload } from '@/shared/types/schemas';

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
          isTask: true,
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
