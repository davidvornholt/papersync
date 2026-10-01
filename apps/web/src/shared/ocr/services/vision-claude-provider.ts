import {
  type BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { Effect, Schema } from 'effect';
import { VisionError } from '@/shared/ocr/errors/vision-contract';
import { CLAUDE_MODEL, type VisionProvider } from './vision-contract';
import {
  createExtractionSystemPrompt,
  normalizeDayName,
} from './vision-prompt';
import { OCRResponseJsonSchema, OCRResponseSchema } from './vision-schema';

export const createClaudeVisionProvider = (
  client: BedrockRuntimeClient,
): VisionProvider => ({
  extractHandwriting: (images, weekId) =>
    Effect.tryPromise({
      try: (abortSignal) =>
        client.send(
          new ConverseCommand({
            modelId: CLAUDE_MODEL,
            system: [
              {
                text: `${createExtractionSystemPrompt(weekId, images.length)}\nReturn JSON matching this schema: ${JSON.stringify(OCRResponseJsonSchema)}`,
              },
            ],
            messages: [
              {
                role: 'user',
                content: images.map((image) => ({
                  image: {
                    format: (
                      {
                        'image/jpeg': 'jpeg',
                        'image/png': 'png',
                        'image/webp': 'webp',
                      } as const
                    )[image.mediaType],
                    source: { bytes: image.data },
                  },
                })),
              },
            ],
            additionalModelRequestFields: { thinking: { type: 'adaptive' } },
            outputConfig: {
              effort: 'medium',
            },
          }),
          { abortSignal },
        ),
      catch: (cause) =>
        new VisionError({
          message: `Claude ${CLAUDE_MODEL} could not process the scan.`,
          cause,
        }),
    }).pipe(
      Effect.flatMap((response) =>
        Effect.gen(function* () {
          if (response.stopReason !== 'end_turn') {
            return yield* Effect.fail(
              new VisionError({
                message:
                  'Claude did not finish the homework extraction. Retry the scan.',
              }),
            );
          }
          return yield* Schema.decodeUnknown(
            Schema.parseJson(OCRResponseSchema),
          )(
            response.output?.message?.content
              ?.flatMap((block) =>
                block.text === undefined ? [] : [block.text],
              )
              .join('') ?? '',
          );
        }),
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
              'Claude could not extract valid homework. Check the photos and server AI configuration, then retry.',
            cause,
          }),
      ),
    ),
});
