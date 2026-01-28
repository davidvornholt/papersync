import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { JSONSchema, Schema } from "@effect/schema";
import { generateText, jsonSchema, Output } from "ai";
import { Context, Data, Effect, Layer } from "effect";
import type { OCRResponse, WeekId } from "@/app/shared/types";

// ============================================================================
// Error Types
// ============================================================================

export class VisionError extends Data.TaggedError("VisionError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class VisionValidationError extends Data.TaggedError(
  "VisionValidationError",
)<{
  readonly message: string;
  readonly raw?: string;
}> {}

// ============================================================================
// Model Configuration
// ============================================================================

/**
 * Gemini models in priority order (try first model first, fallback to next)
 */
type GeminiModelConfig = {
  readonly modelId: string;
  readonly isGemini3: boolean; // Determines thinkingLevel vs thinkingBudget
};

const GEMINI_MODELS: readonly GeminiModelConfig[] = [
  { modelId: "gemini-3-flash-preview", isGemini3: true },
  { modelId: "gemini-flash-latest", isGemini3: false },
  { modelId: "gemini-2.5-flash", isGemini3: false },
  { modelId: "gemini-flash-lite-latest", isGemini3: false },
  { modelId: "gemini-2.5-flash-lite", isGemini3: false },
] as const;

// ============================================================================
// OCR Response Schema (Effect Schema)
// ============================================================================

const OCREntrySchema = Schema.Struct({
  day: Schema.String,
  subject: Schema.String,
  content: Schema.String,
  is_task: Schema.Boolean,
});

const OCRResponseSchema = Schema.Struct({
  entries: Schema.Array(OCREntrySchema),
  confidence: Schema.Number,
  notes: Schema.optional(Schema.String),
});

// Generate JSON Schema for AI SDK's generateObject
const OCRResponseJsonSchema = JSONSchema.make(OCRResponseSchema);

// ============================================================================
// Vision Provider Interface
// ============================================================================

export type OCRResultWithModel = {
  readonly data: OCRResponse;
  readonly modelUsed: string;
};

export type VisionProvider = {
  readonly extractHandwriting: (
    imageBase64: string,
    weekId: WeekId,
    existingContent: string,
  ) => Effect.Effect<OCRResultWithModel, VisionError | VisionValidationError>;
};

export const VisionProvider =
  Context.GenericTag<VisionProvider>("VisionProvider");

// ============================================================================
// System Prompt
// ============================================================================

/**
 * System prompt for handwriting extraction.
 * Note: No JSON format instructions needed since structured output handles that.
 * Note: Completion status tracking removed - planner uses bullet points, not checkboxes.
 */
const createExtractionSystemPrompt = (
  weekId: WeekId,
  existingContent: string,
): string =>
  `You are a handwriting extraction specialist analyzing a scanned weekly planner image.

CONTEXT:
- Week: ${weekId}
- Existing digital record (Markdown):
\`\`\`markdown
${existingContent || "(No existing content)"}
\`\`\`

TASK:
1. Identify all handwritten entries in the scan
2. Compare against the existing digital record
3. Extract ONLY entries that are NEW (not already in the existing record)
4. Preserve exact wording including abbreviations and shorthand
5. Identify which day and subject each entry belongs to

IMPORTANT:
- "is_task" should be true for homework/assignments, false for general notes
- "subject" should be "General Tasks" for entries not bound to a specific subject
- Return empty "entries" array if no new handwritten content detected
- "confidence" reflects certainty about the extraction (0.0 to 1.0)
- PRESERVE ALL SPECIAL CHARACTERS exactly as written: umlauts (ä, ö, ü, Ä, Ö, Ü), eszett (ß), accented characters (á, é, í, ó, ú, à, è, etc.), and any other non-ASCII characters. Do NOT replace them with $, substitute characters, or escape sequences.`;

// ============================================================================
// Google Gemini Implementation with Model Fallback
// ============================================================================

const createGoogleVisionProvider = (apiKey: string): VisionProvider => ({
  extractHandwriting: (
    imageBase64: string,
    weekId: WeekId,
    existingContent: string,
  ) =>
    Effect.gen(function* () {
      const google = createGoogleGenerativeAI({ apiKey });
      const systemPrompt = createExtractionSystemPrompt(weekId, existingContent);

      // Try each model in order until one succeeds
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
                  role: "user",
                  content: [
                    {
                      type: "image",
                      image: imageBase64,
                    },
                  ],
                },
              ],
              providerOptions: {
                google: {
                  mediaResolution: "MEDIA_RESOLUTION_HIGH",
                  thinkingConfig: modelConfig.isGemini3
                    ? { thinkingLevel: "medium" as const }
                    : { thinkingBudget: 4096 },
                },
              },
            });

            return { object: response.output, modelId: modelConfig.modelId };
          },
          catch: (error) => error,
        }).pipe(Effect.option);

        if (result._tag === "Some") {
          const validated = result.value.object;

          // Transform to canonical format (add defaults for constant fields)
          const ocrResponse: OCRResponse = {
            entries: validated.entries.map((e) => ({
              day: e.day,
              subject: e.subject,
              content: e.content,
              isTask: e.is_task,
              isCompleted: false, // Always false - completion tracked digitally
              action: "add" as const, // Always add - planner only tracks new entries
            })),
            confidence: validated.confidence,
            notes: validated.notes,
          };

          return {
            data: ocrResponse,
            modelUsed: result.value.modelId,
          };
        }

        // Store error and try next model
        lastError = result;
        console.warn(
          `[VisionProvider] Model ${modelConfig.modelId} failed, trying next...`,
        );
      }

      // All models failed
      return yield* Effect.fail(
        new VisionError({
          message: "All Gemini models failed to process the image",
          cause: lastError,
        }),
      );
    }),
});

// ============================================================================
// Ollama Implementation (Qwen3-VL-4B)
// ============================================================================

const createOllamaVisionProvider = (endpoint: string): VisionProvider => ({
  extractHandwriting: (
    imageBase64: string,
    weekId: WeekId,
    existingContent: string,
  ) =>
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: async () => {
          const res = await fetch(`${endpoint}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "qwen3-vl-4b",
              prompt: createExtractionSystemPrompt(weekId, existingContent),
              images: [imageBase64.replace(/^data:image\/\w+;base64,/, "")],
              stream: false,
            }),
          });

          if (!res.ok) {
            throw new Error(`Ollama API error: ${res.status}`);
          }

          const data = await res.json();
          return data.response as string;
        },
        catch: (error) =>
          new VisionError({
            message: "Failed to call Ollama Vision API",
            cause: error,
          }),
      });

      // Parse and validate
      const parsed = yield* Effect.try({
        try: () => {
          const cleaned = response
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          return JSON.parse(cleaned);
        },
        catch: () =>
          new VisionValidationError({
            message: "Failed to parse Ollama response as JSON",
            raw: response,
          }),
      });

      const validated = yield* Schema.decodeUnknown(OCRResponseSchema)(
        parsed,
      ).pipe(
        Effect.mapError(
          () =>
            new VisionValidationError({
              message: "Ollama response failed schema validation",
              raw: response,
            }),
        ),
      );

      return {
        data: {
          entries: validated.entries.map((e) => ({
            day: e.day,
            subject: e.subject,
            content: e.content,
            isTask: e.is_task,
            isCompleted: false, // Always false - completion tracked digitally
            action: "add" as const, // Always add - planner only tracks new entries
          })),
          confidence: validated.confidence,
          notes: validated.notes,
        } as OCRResponse,
        modelUsed: "qwen3-vl-4b",
      };
    }),
});

// ============================================================================
// Layers
// ============================================================================

export const makeGoogleVisionLayer = (
  apiKey: string,
): Layer.Layer<VisionProvider, never, never> =>
  Layer.succeed(VisionProvider, createGoogleVisionProvider(apiKey));

export const makeOllamaVisionLayer = (
  endpoint = "http://localhost:11434",
): Layer.Layer<VisionProvider, never, never> =>
  Layer.succeed(VisionProvider, createOllamaVisionProvider(endpoint));
