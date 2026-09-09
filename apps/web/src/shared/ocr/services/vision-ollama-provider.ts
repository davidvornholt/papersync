import { Effect, Schema } from 'effect';
import { fetchJson } from '@/shared/http/json';
import {
  VisionError,
  VisionValidationError,
} from '@/shared/ocr/errors/vision-contract';
import type { VisionProvider } from './vision-contract';
import {
  createExtractionSystemPrompt,
  normalizeDayName,
} from './vision-prompt';
import { OCRResponseSchema } from './vision-schema';

const imageDataPattern = /^data:image\/\w+;base64,/u;
const codeFencePattern = /```(?:json)?\n?/gu;
const responseSchema = Schema.Struct({ response: Schema.String });
export const createOllamaVisionProvider = (
  endpoint: string,
): VisionProvider => ({
  extractHandwriting: (imageBase64, weekId, existingContent) =>
    Effect.gen(function* () {
      const body = yield* fetchJson(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3-vl-4b',
          prompt: createExtractionSystemPrompt(weekId, existingContent),
          images: [imageBase64.replace(imageDataPattern, '')],
          stream: false,
        }),
      }).pipe(
        Effect.mapError(
          (cause) =>
            new VisionError({
              message: 'Failed to call Ollama Vision API',
              cause,
            }),
        ),
      );
      const response = yield* Schema.decodeUnknown(responseSchema)(body).pipe(
        Effect.mapError(
          (cause) =>
            new VisionValidationError({
              message: 'Ollama returned an invalid response envelope.',
              raw: String(cause),
            }),
        ),
      );
      const parsed = yield* Effect.try({
        try: () =>
          JSON.parse(
            response.response.replace(codeFencePattern, '').trim(),
          ) as unknown,
        catch: () =>
          new VisionValidationError({
            message: 'Failed to parse Ollama response as JSON',
            raw: response.response,
          }),
      });
      const validated = yield* Schema.decodeUnknown(OCRResponseSchema)(
        parsed,
      ).pipe(
        Effect.mapError(
          () =>
            new VisionValidationError({
              message: 'Ollama response failed schema validation',
              raw: response.response,
            }),
        ),
      );
      return {
        data: {
          entries: validated.entries.map((entry) => ({
            day: normalizeDayName(entry.day),
            subject: entry.subject,
            content: entry.content,
            isTask: entry.isTask,
            isCompleted: entry.isCompleted,
            action: 'add' as const,
            dueDate: entry.dueDate,
          })),
          confidence: validated.confidence,
          notes: validated.notes,
        },
        modelUsed: 'qwen3-vl-4b',
      };
    }),
});
