import type { LanguageModel } from 'ai';
import { generateText, jsonSchema, Output } from 'ai';
import { Effect, Schema } from 'effect';
import { VisionError } from '@/shared/ocr/errors/vision-contract';
import { CLAUDE_MODEL, type VisionProvider } from './vision-contract';
import {
  createExtractionSystemPrompt,
  normalizeDayName,
} from './vision-prompt';
import { OCRResponseJsonSchema, OCRResponseSchema } from './vision-schema';

export const createClaudeVisionProvider = (
  model: LanguageModel,
): VisionProvider => ({
  extractHandwriting: (imageBase64, weekId) =>
    Effect.tryPromise({
      try: (abortSignal) =>
        generateText({
          model,
          abortSignal,
          output: Output.object({
            schema: jsonSchema(
              OCRResponseJsonSchema as Parameters<typeof jsonSchema>[0],
            ),
          }),
          system: createExtractionSystemPrompt(weekId),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'file', data: imageBase64, mediaType: 'image/*' },
              ],
            },
          ],
          providerOptions: {
            bedrock: {
              reasoningConfig: {
                type: 'adaptive',
                maxReasoningEffort: 'medium',
              },
              structuredOutputMode: 'outputFormat',
            },
          },
        }),
      catch: (cause) =>
        new VisionError({
          message: `Claude ${CLAUDE_MODEL} could not process the image.`,
          cause,
        }),
    }).pipe(
      Effect.flatMap((response) =>
        Schema.decodeUnknown(OCRResponseSchema)(response.output),
      ),
      Effect.map((validated) => ({
        data: {
          weekId: weekId ?? validated.weekId,
          entries: validated.entries.map((entry) => ({
            ...entry,
            day: normalizeDayName(entry.day),
            dueDate: entry.dueDate ?? undefined,
            action: 'add' as const,
          })),
          confidence: validated.confidence,
          notes: validated.notes,
        },
        modelUsed: CLAUDE_MODEL,
      })),
      Effect.mapError(
        (cause) =>
          new VisionError({
            message:
              'Claude could not extract valid homework. Check the image and server AI configuration, then retry.',
            cause,
          }),
      ),
    ),
});
