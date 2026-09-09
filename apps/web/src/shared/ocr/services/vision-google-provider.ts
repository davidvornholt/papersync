import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import { generateText, jsonSchema, Output } from 'ai';
import { Effect, Schema } from 'effect';
import { VisionError } from '@/shared/ocr/errors/vision-contract';
import { GEMINI_MODEL, type VisionProvider } from './vision-contract';
import {
  createExtractionSystemPrompt,
  normalizeDayName,
} from './vision-prompt';
import { OCRResponseJsonSchema, OCRResponseSchema } from './vision-schema';

export const createGeminiVisionProvider = (
  model: LanguageModel,
): VisionProvider => ({
  extractHandwriting: (imageBase64, weekId, existingContent) =>
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
          system: createExtractionSystemPrompt(weekId, existingContent),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'file', data: imageBase64, mediaType: 'image/*' },
              ],
            },
          ],
          providerOptions: {
            google: {
              mediaResolution: 'MEDIA_RESOLUTION_HIGH',
              thinkingConfig: { thinkingLevel: 'high' },
            },
          },
        }),
      catch: (cause) =>
        new VisionError({
          message: `Gemini ${GEMINI_MODEL} could not process the image.`,
          cause,
        }),
    }).pipe(
      Effect.flatMap((response) =>
        Schema.decodeUnknown(OCRResponseSchema)(response.output),
      ),
      Effect.map((validated) => ({
        data: {
          entries: validated.entries.map((entry) => ({
            ...entry,
            day: normalizeDayName(entry.day),
            action: 'add' as const,
          })),
          confidence: validated.confidence,
          notes: validated.notes,
        },
        modelUsed: GEMINI_MODEL,
      })),
      Effect.mapError(
        (cause) =>
          new VisionError({
            message:
              'Gemini could not extract valid homework. Check the image and server AI configuration, then retry.',
            cause,
          }),
      ),
    ),
});

export const createGoogleVisionProvider = (apiKey: string): VisionProvider =>
  createGeminiVisionProvider(
    createGoogleGenerativeAI({ apiKey })(GEMINI_MODEL),
  );
