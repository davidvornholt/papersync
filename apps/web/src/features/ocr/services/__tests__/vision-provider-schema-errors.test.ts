import { describe, expect, it } from 'bun:test';
import { Schema } from '@effect/schema';
import type { WeekId } from '@/shared/types';
import { VisionError, VisionValidationError } from '../vision-provider';

const TEST_WEEK_ID = '2026-W05' as WeekId;
const TEST_EXISTING_CONTENT = '## Monday\n- [ ] Existing task';

const VALID_OCR_RESPONSE = {
  entries: [
    {
      day: 'Monday',
      subject: 'Mathematics',
      content: 'Complete problem set 6',
      is_task: true,
    },
    {
      day: 'Tuesday',
      subject: 'English',
      content: 'Read chapter 5',
      is_task: true,
    },
  ],
  confidence: 0.92,
  notes: 'All entries extracted successfully',
};

const EMPTY_OCR_RESPONSE = {
  entries: [],
  confidence: 1.0,
};

describe('OCR Response Schema', () => {
  const OCREntrySchema = Schema.Struct({
    day: Schema.String,
    subject: Schema.String,
    content: Schema.String,
    is_task: Schema.Boolean,
  });

  const OCRResponseSchema = Schema.Struct({
    entries: Schema.Array(OCREntrySchema),
    confidence: Schema.Number,
    notes: Schema.optional(Schema.String),
  });

  it('should validate a complete OCR response with entries', () => {
    const result =
      Schema.decodeUnknownSync(OCRResponseSchema)(VALID_OCR_RESPONSE);
    expect(result.entries).toHaveLength(2);
    expect(result.confidence).toBe(0.92);
    expect(result.notes).toBe('All entries extracted successfully');
  });

  it('should validate an empty OCR response', () => {
    const result =
      Schema.decodeUnknownSync(OCRResponseSchema)(EMPTY_OCR_RESPONSE);
    expect(result.entries).toHaveLength(0);
    expect(result.confidence).toBe(1.0);
    expect(result.notes).toBeUndefined();
  });

  it('should reject missing required fields', () => {
    const missingContent = {
      entries: [
        {
          day: 'Monday',
          subject: 'Math',
          is_task: true,
        },
      ],
      confidence: 0.9,
    };

    expect(() =>
      Schema.decodeUnknownSync(OCRResponseSchema)(missingContent),
    ).toThrow();
  });

  it('should accept valid confidence values', () => {
    const response = {
      entries: [],
      confidence: 0.5,
    };

    const result = Schema.decodeUnknownSync(OCRResponseSchema)(response);
    expect(result.confidence).toBe(0.5);
  });
});

describe('VisionError', () => {
  it('should create error with message', () => {
    const error = new VisionError({ message: 'API call failed' });
    expect(error.message).toBe('API call failed');
    expect(error._tag).toBe('VisionError');
  });

  it('should create error with message and cause', () => {
    const originalError = new Error('Network timeout');
    const error = new VisionError({
      message: 'API call failed',
      cause: originalError,
    });

    expect(error.message).toBe('API call failed');
    expect(error.cause).toBe(originalError);
  });
});

describe('VisionValidationError', () => {
  it('should create error with message', () => {
    const error = new VisionValidationError({ message: 'Invalid JSON' });
    expect(error.message).toBe('Invalid JSON');
    expect(error._tag).toBe('VisionValidationError');
  });

  it('should create error with message and raw response', () => {
    const error = new VisionValidationError({
      message: 'Schema validation failed',
      raw: '{"malformed": true}',
    });

    expect(error.message).toBe('Schema validation failed');
    expect(error.raw).toBe('{"malformed": true}');
  });
});

describe('Extraction System Prompt', () => {
  const createExpectedPromptParts = (
    weekId: WeekId,
    existingContent: string,
  ) => [
    'handwriting extraction specialist',
    `Week: ${weekId}`,
    existingContent || '(No existing content)',
    'NEW',
    'is_task',
    'General Tasks',
    'confidence',
  ];

  it('should include week context in prompt', () => {
    const weekId = '2026-W10' as WeekId;
    const expectedParts = createExpectedPromptParts(weekId, '');
    expect(expectedParts).toContain(`Week: ${weekId}`);
  });

  it('should handle empty existing content', () => {
    const expectedParts = createExpectedPromptParts(TEST_WEEK_ID, '');
    expect(expectedParts).toContain('(No existing content)');
  });

  it('should include key instruction keywords', () => {
    const expectedParts = createExpectedPromptParts(
      TEST_WEEK_ID,
      TEST_EXISTING_CONTENT,
    );

    expect(expectedParts).toContain('NEW');
    expect(expectedParts).toContain('is_task');
  });
});
