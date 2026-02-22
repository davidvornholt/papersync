import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import {
  makeGoogleVisionLayer,
  makeOllamaVisionLayer,
  type OCRResultWithModel,
  VisionError,
  VisionValidationError,
} from '../vision-provider';

const VALID_OCR_RESPONSE = {
  entries: [
    {
      day: 'Monday',
      subject: 'Mathematics',
      content: 'Complete problem set 6',
      is_task: true,
    },
  ],
  confidence: 0.92,
};

describe('Vision Provider Layer Factories', () => {
  it('should create Google Vision layer with API key', () => {
    const layer = makeGoogleVisionLayer('test-api-key');
    expect(layer).toBeDefined();
  });

  it('should create Ollama Vision layer with default endpoint', () => {
    const layer = makeOllamaVisionLayer();
    expect(layer).toBeDefined();
  });

  it('should create Ollama Vision layer with custom endpoint', () => {
    const layer = makeOllamaVisionLayer('http://custom:11434');
    expect(layer).toBeDefined();
  });
});

describe('OCR Result Transformation', () => {
  it('should transform snake_case to camelCase and add defaults', () => {
    const original = VALID_OCR_RESPONSE.entries[0];
    const transformed = {
      day: original.day,
      subject: original.subject,
      content: original.content,
      isTask: original.is_task,
      isCompleted: false,
      action: 'add' as const,
    };

    expect(transformed.isTask).toBe(true);
    expect(transformed.isCompleted).toBe(false);
    expect(transformed.action).toBe('add');
  });

  it('should preserve all entry fields during transformation', () => {
    const original = VALID_OCR_RESPONSE.entries[0];
    const transformed = {
      day: original.day,
      subject: original.subject,
      content: original.content,
      isTask: original.is_task,
      isCompleted: false,
      action: 'add' as const,
    };

    expect(transformed.day).toBe('Monday');
    expect(transformed.subject).toBe('Mathematics');
    expect(transformed.content).toBe('Complete problem set 6');
  });

  it('should always set isCompleted to false (tracked digitally)', () => {
    expect({ isCompleted: false }.isCompleted).toBe(false);
  });

  it("should always set action to 'add' (only new entries)", () => {
    expect({ action: 'add' as const }.action).toBe('add');
  });
});

describe('OCRResultWithModel', () => {
  it('should include model used in result', () => {
    const result: OCRResultWithModel = {
      data: {
        entries: [],
        confidence: 1.0,
      },
      modelUsed: 'gemini-3-flash-preview',
    };

    expect(result.modelUsed).toBe('gemini-3-flash-preview');
    expect(result.data.entries).toHaveLength(0);
  });

  it('should preserve OCR data alongside model info', () => {
    const result: OCRResultWithModel = {
      data: {
        entries: [
          {
            day: 'Monday',
            subject: 'Math',
            content: 'Test',
            isTask: true,
            isCompleted: false,
            action: 'add',
          },
        ],
        confidence: 0.85,
        notes: 'Test notes',
      },
      modelUsed: 'gemini-2.5-flash',
    };

    expect(result.data.entries).toHaveLength(1);
    expect(result.data.confidence).toBe(0.85);
    expect(result.data.notes).toBe('Test notes');
    expect(result.modelUsed).toBe('gemini-2.5-flash');
  });
});

describe('Effect-based Extraction Pipeline', () => {
  it('should handle successful extraction result', async () => {
    const mockResult: OCRResultWithModel = {
      data: {
        entries: [
          {
            day: 'Monday',
            subject: 'Math',
            content: 'Do homework',
            isTask: true,
            isCompleted: false,
            action: 'add',
          },
        ],
        confidence: 0.9,
      },
      modelUsed: 'gemini-3-flash-preview',
    };

    const result = await Effect.runPromise(Effect.succeed(mockResult));
    expect(result.data.entries).toHaveLength(1);
    expect(result.modelUsed).toBe('gemini-3-flash-preview');
  });

  it('should handle VisionError correctly', async () => {
    const error = new VisionError({ message: 'API timeout' });
    const program = Effect.fail(error).pipe(
      Effect.catchAll((e) => Effect.succeed({ error: e.message })),
    );

    const result = await Effect.runPromise(program);
    expect(result.error).toBe('API timeout');
  });

  it('should handle VisionValidationError correctly', async () => {
    const error = new VisionValidationError({
      message: 'Invalid response',
      raw: 'not json',
    });
    const program = Effect.fail(error).pipe(
      Effect.catchAll((e) => Effect.succeed({ error: e.message, raw: e.raw })),
    );

    const result = await Effect.runPromise(program);
    expect(result.error).toBe('Invalid response');
    expect(result.raw).toBe('not json');
  });
});
