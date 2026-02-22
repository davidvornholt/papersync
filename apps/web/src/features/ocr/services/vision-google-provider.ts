import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, jsonSchema, Output } from 'ai';
import { Effect } from 'effect';
import type { OCRResponse, WeekId } from '@/shared/types';
import {
  GEMINI_MODELS,
  type OCRResultWithModel,
  VisionError,
  type VisionProvider,
} from './vision-contract';
import {
  createExtractionSystemPrompt,
  normalizeDayName,
} from './vision-prompt';
import { OCRResponseJsonSchema, type OCRResponseSchema } from './vision-schema';

export const createGoogleVisionProvider = (apiKey: string): VisionProvider => ({
  extractHandwriting: (
    imageBase64: string,
    weekId: WeekId,
    existingContent: string,
  ) =>
    Effect.gen(function* () {
      const google = createGoogleGenerativeAI({ apiKey });
      const systemPrompt = createExtractionSystemPrompt(
        weekId,
        existingContent,
      );
      let lastError: unknown = null;

      for (const modelConfig of GEMINI_MODELS) {
        const result = yield* Effect.tryPromise({
          try: async () => {
            const response = await generateText({
              model: google(modelConfig.modelId),
              output: Output.object({
                schema: jsonSchema<typeof OCRResponseSchema.Type>(
                  OCRResponseJsonSchema as Parameters<typeof jsonSchema>[0],
                ),
              }),
              system: systemPrompt,
              messages: [
                {
                  role: 'user',
                  content: [{ type: 'image', image: imageBase64 }],
                },
              ],
              providerOptions: {
                google: {
                  mediaResolution: 'MEDIA_RESOLUTION_HIGH',
                  thinkingConfig: modelConfig.isGemini3
                    ? { thinkingLevel: 'medium' as const }
                    : { thinkingBudget: 4096 },
                },
              },
            });
            return { object: response.output, modelId: modelConfig.modelId };
          },
          catch: (error) => error,
        }).pipe(Effect.option);

        if (result._tag === 'Some') {
          const validated = result.value.object;
          const ocrResponse: OCRResponse = {
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
          };

          const response: OCRResultWithModel = {
            data: ocrResponse,
            modelUsed: result.value.modelId,
          };
          return response;
        }

        lastError = result;
        yield* Effect.logWarning(
          `[VisionProvider] Model ${modelConfig.modelId} failed, trying next.`,
        );
      }

      return yield* Effect.fail(
        new VisionError({
          message: 'All Gemini models failed to process the image',
          cause: lastError,
        }),
      );
    }),
});
