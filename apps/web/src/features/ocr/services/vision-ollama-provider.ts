import { Schema } from '@effect/schema';
import { Effect } from 'effect';
import type { OCRResponse, WeekId } from '@/shared/types';
import type { VisionProvider } from './vision-contract';
import { VisionError, VisionValidationError } from './vision-contract';
import {
  createExtractionSystemPrompt,
  normalizeDayName,
} from './vision-prompt';
import { OCRResponseSchema } from './vision-schema';

export const createOllamaVisionProvider = (
  endpoint: string,
): VisionProvider => ({
  extractHandwriting: (
    imageBase64: string,
    weekId: WeekId,
    existingContent: string,
  ) =>
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: async () => {
          const res = await fetch(`${endpoint}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'qwen3-vl-4b',
              prompt: createExtractionSystemPrompt(weekId, existingContent),
              images: [imageBase64.replace(/^data:image\/\w+;base64,/, '')],
              stream: false,
            }),
          });

          if (!res.ok) {
            return Promise.reject(new Error(`Ollama API error: ${res.status}`));
          }

          const data = await res.json();
          return data.response as string;
        },
        catch: (error) =>
          new VisionError({
            message: 'Failed to call Ollama Vision API',
            cause: error,
          }),
      });

      const parsed = yield* Effect.try({
        try: () => {
          const cleaned = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          return JSON.parse(cleaned);
        },
        catch: () =>
          new VisionValidationError({
            message: 'Failed to parse Ollama response as JSON',
            raw: response,
          }),
      });

      const validated = yield* Schema.decodeUnknown(OCRResponseSchema)(
        parsed,
      ).pipe(
        Effect.mapError(
          () =>
            new VisionValidationError({
              message: 'Ollama response failed schema validation',
              raw: response,
            }),
        ),
      );

      return {
        data: {
          entries: validated.entries.map((entry) => ({
            day: normalizeDayName(entry.day),
            subject: entry.subject,
            content: entry.content,
            isTask: entry.is_task,
            isCompleted: false,
            action: 'add' as const,
            dueDate:
              entry.due_date as OCRResponse['entries'][number]['dueDate'],
          })),
          confidence: validated.confidence,
          notes: validated.notes,
        } as OCRResponse,
        modelUsed: 'qwen3-vl-4b',
      };
    }),
});
