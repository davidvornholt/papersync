import { describe, expect, it } from 'bun:test';
import { Schema } from 'effect';
import { ISODate, WeekId } from '@/shared/types/schemas';

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
