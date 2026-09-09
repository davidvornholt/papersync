import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, jsonSchema, Output } from 'ai';
import { Effect, Schema } from 'effect';
import { VisionError } from '@/shared/ocr/errors/vision-contract';
import { GEMINI_MODELS, type VisionProvider } from './vision-contract';
import {
  createExtractionSystemPrompt,
  normalizeDayName,
} from './vision-prompt';
import { OCRResponseJsonSchema, OCRResponseSchema } from './vision-schema';

export const createGoogleVisionProvider = (apiKey: string): VisionProvider => ({
  extractHandwriting: (imageBase64, weekId, existingContent) => {
    const google = createGoogleGenerativeAI({ apiKey });
    const attempts = GEMINI_MODELS.map((modelId) =>
      Effect.tryPromise({
        try: (abortSignal) =>
          generateText({
            model: google(modelId),
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
                thinkingConfig: { thinkingLevel: 'medium' },
              },
            },
          }),
        catch: (cause) =>
          new VisionError({
            message: `Gemini ${modelId} could not process the image.`,
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
          modelUsed: modelId,
        })),
        Effect.mapError(
          (cause) =>
            new VisionError({
              message:
                'Gemini could not extract valid homework. Check the image and API key, then retry.',
              cause,
            }),
        ),
      ),
    );
    return Effect.firstSuccessOf(attempts);
  },
});
