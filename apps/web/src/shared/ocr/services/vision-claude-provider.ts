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

const imageDataUrl =
  /^data:image\/(?<format>png|jpeg|webp|gif);base64,(?<base64>.+)$/su;

export const createClaudeVisionProvider = (
  client: BedrockRuntimeClient,
): VisionProvider => ({
  extractHandwriting: (imageBase64, weekId) =>
    Effect.tryPromise({
      try: (abortSignal) => {
        const image = imageDataUrl.exec(imageBase64);
        if (!(image?.groups?.format && image.groups.base64)) {
          return Promise.reject(
            new Error('Expected a supported base64 image data URL.'),
          );
        }
        return client.send(
          new ConverseCommand({
            modelId: CLAUDE_MODEL,
            system: [
              {
                text: `${createExtractionSystemPrompt(weekId)}\nReturn JSON matching this schema: ${JSON.stringify(OCRResponseJsonSchema)}`,
              },
            ],
            messages: [
              {
                role: 'user',
                content: [
                  {
                    image: {
                      format: image.groups.format as
                        | 'png'
                        | 'jpeg'
                        | 'webp'
                        | 'gif',
                      source: {
                        bytes: Uint8Array.from(
                          atob(image.groups.base64),
                          (character) => character.charCodeAt(0),
                        ),
                      },
                    },
                  },
                ],
              },
            ],
            additionalModelRequestFields: { thinking: { type: 'adaptive' } },
            outputConfig: {
              effort: 'medium',
            },
          }),
          { abortSignal },
        );
      },
      catch: (cause) =>
        new VisionError({
          message: `Claude ${CLAUDE_MODEL} could not process the image.`,
          cause,
        }),
    }).pipe(
      Effect.flatMap((response) =>
        response.stopReason === 'end_turn'
          ? Schema.decodeUnknown(Schema.parseJson(OCRResponseSchema))(
              response.output?.message?.content
                ?.flatMap((block) =>
                  block.text === undefined ? [] : [block.text],
                )
                .join('') ?? '',
            )
          : Effect.fail(
              new VisionError({
                message:
                  'Claude did not finish the homework extraction. Retry the scan.',
              }),
            ),
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
