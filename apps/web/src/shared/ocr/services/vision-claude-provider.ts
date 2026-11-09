import Anthropic from '@anthropic-ai/sdk';
import { transformJSONSchema } from '@anthropic-ai/sdk/lib/transform-json-schema';
import { Effect, Redacted, Schema } from 'effect';
import {
  VisionConfigurationError,
  VisionError,
} from '@/shared/ocr/errors/vision-contract';
import { CLAUDE_MODEL, type VisionProvider } from './vision-contract';
import {
  createExtractionSystemPrompt,
  normalizeDayName,
} from './vision-prompt';
import { OCRResponseJsonSchema, OCRResponseSchema } from './vision-schema';

const { $schema: _metaSchema, ...ocrResponseJsonSchema } =
  OCRResponseJsonSchema;
// Structured outputs reject numeric and length constraints. The SDK moves them
// into descriptions, and OCRResponseSchema still enforces them on the result.
const ocrResponseFormat = {
  type: 'json_schema',
  schema: transformJSONSchema(ocrResponseJsonSchema),
} as const;

const extractionFailure =
  'Claude could not extract valid homework. Check the photos and server AI configuration, then retry.';

export const createClaudeVisionProvider = (
  apiKey: Redacted.Redacted<string>,
): VisionProvider => {
  const client = new Anthropic({
    apiKey: Redacted.value(apiKey),
    // Pin what the SDK would otherwise take from ANTHROPIC_* variables, so the
    // key reaches only the Claude API and no request body is logged or traced.
    baseURL: 'https://api.anthropic.com',
    logLevel: 'warn',
    openTelemetry: false,
    // Three attempts in all. The SDK retries rate limits, overload, server
    // errors, timeouts, and connection failures, but no other rejection.
    maxRetries: 2,
    // Ten minutes per attempt, the most a non-streaming request may take.
    timeout: 600_000,
  });
  return {
    extractHandwriting: (images, weekId) =>
      Effect.tryPromise({
        try: (abortSignal) =>
          client.beta.messages.create(
            {
              model: CLAUDE_MODEL,
              // biome-ignore lint/style/useNamingConvention: Claude API field name.
              max_tokens: 16_000,
              betas: ['server-side-fallback-2026-07-01'],
              // The API retries a declined scan on Anthropic's default fallback model.
              fallbacks: 'default',
              thinking: { type: 'adaptive' },
              // biome-ignore lint/style/useNamingConvention: Claude API field name.
              output_config: { effort: 'medium', format: ocrResponseFormat },
              system: createExtractionSystemPrompt(weekId, images.length),
              messages: [
                {
                  role: 'user',
                  content: images.map((image) => ({
                    type: 'image' as const,
                    source: {
                      type: 'base64' as const,
                      // biome-ignore lint/style/useNamingConvention: Claude API field name.
                      media_type: image.mediaType,
                      data: Buffer.from(image.data).toString('base64'),
                    },
                  })),
                },
              ],
            },
            { signal: abortSignal },
          ),
        catch: (cause) =>
          cause instanceof Anthropic.AuthenticationError ||
          cause instanceof Anthropic.PermissionDeniedError
            ? new VisionConfigurationError({
                message:
                  'The Claude API rejected the server key. Ask the server administrator to check ANTHROPIC_API_KEY.',
              })
            : // An API error can quote the request, so it stays out of the error.
              new VisionError({ message: extractionFailure }),
      }).pipe(
        Effect.flatMap((response) =>
          // A refusal after every fallback, or output cut off at max_tokens,
          // leaves no complete answer to read.
          response.stop_reason === 'end_turn'
            ? Schema.decodeUnknownEffect(
                Schema.fromJsonString(OCRResponseSchema),
              )(
                response.content
                  .flatMap((block) =>
                    block.type === 'text' ? [block.text] : [],
                  )
                  .join(''),
              ).pipe(
                // The parse issue quotes model output, so it stays out of the error.
                Effect.mapError(
                  () => new VisionError({ message: extractionFailure }),
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
                  // After a fallback this names the model that answered.
                  modelUsed: response.model,
                })),
              )
            : Effect.fail(new VisionError({ message: extractionFailure })),
        ),
      ),
  };
};
