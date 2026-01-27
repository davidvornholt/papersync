import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Schema } from "@effect/schema";
import { generateText } from "ai";
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
// OCR Response Schema
// ============================================================================

const OCREntrySchema = Schema.Struct({
  day: Schema.String,
  subject: Schema.String,
  content: Schema.String,
  is_task: Schema.Boolean,
  is_completed: Schema.Boolean,
  action: Schema.Literal("add", "modify", "complete"),
});

const OCRResponseSchema = Schema.Struct({
  entries: Schema.Array(OCREntrySchema),
  confidence: Schema.Number,
  notes: Schema.optional(Schema.String),
});

// ============================================================================
// Vision Provider Interface
// ============================================================================

export type VisionProvider = {
  readonly extractHandwriting: (
    imageBase64: string,
    weekId: WeekId,
    existingContent: string,
  ) => Effect.Effect<OCRResponse, VisionError | VisionValidationError>;
};

export const VisionProvider =
  Context.GenericTag<VisionProvider>("VisionProvider");

// ============================================================================
// Prompt Template
// ============================================================================

const createExtractionPrompt = (
  weekId: WeekId,
  existingContent: string,
): string => `You are a handwriting extraction specialist. Analyze the scanned weekly planner image.

CONTEXT:
- Week: ${weekId}
- Existing digital record (Markdown):
\`\`\`markdown
${existingContent || "(No existing content)"}
\`\`\`

TASK:
1. Identify all handwritten entries in the scan
2. Compare against the existing digital record
3. Extract ONLY entries that are NEW or MODIFIED (not already in the existing record)
4. Preserve the exact wording, including abbreviations and shorthand
5. Infer task completion status from checkmarks (✓), strikethroughs, or X marks
6. Identify which day and subject each entry belongs to

OUTPUT FORMAT (JSON only, no markdown):
{
  "entries": [
    {
      "day": "Monday",
      "subject": "Mathematics",
      "content": "Complete problem set 6",
      "is_task": true,
      "is_completed": false,
      "action": "add"
    }
  ],
  "confidence": 0.85,
  "notes": "One entry was partially illegible"
}

IMPORTANT:
- "action" must be one of: "add" (new entry), "modify" (changed existing), "complete" (marked as done)
- "subject" should be "General Tasks" for entries not bound to a specific subject
- Return empty "entries" array if no new handwritten content is detected
- "confidence" should reflect how certain you are about the extraction (0.0 to 1.0)

Respond with ONLY the JSON object, no additional text or markdown formatting.`;

// ============================================================================
// Google Gemini Implementation
// ============================================================================

const createGoogleVisionProvider = (apiKey: string): VisionProvider => ({
  extractHandwriting: (
    imageBase64: string,
    weekId: WeekId,
    existingContent: string,
  ) =>
    Effect.gen(function* () {
      const google = createGoogleGenerativeAI({ apiKey });

      const response = yield* Effect.tryPromise({
        try: async () => {
          const result = await generateText({
            model: google("gemini-2.5-flash-preview-05-20"),
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    image: imageBase64,
                  },
                  {
                    type: "text",
                    text: createExtractionPrompt(weekId, existingContent),
                  },
                ],
              },
            ],
          });

          return result.text;
        },
        catch: (error) =>
          new VisionError({
            message: "Failed to call Google Vision API",
            cause: error,
          }),
      });

      // Parse and validate response
      const parsed = yield* Effect.try({
        try: () => {
          // Remove potential markdown code blocks
          const cleaned = response
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          return JSON.parse(cleaned);
        },
        catch: () =>
          new VisionValidationError({
            message: "Failed to parse OCR response as JSON",
            raw: response,
          }),
      });

      const validated = yield* Schema.decodeUnknown(OCRResponseSchema)(
        parsed,
      ).pipe(
        Effect.mapError(
          () =>
            new VisionValidationError({
              message: "OCR response failed schema validation",
              raw: response,
            }),
        ),
      );

      // Transform to canonical format
      return {
        entries: validated.entries.map((e) => ({
          day: e.day,
          subject: e.subject,
          content: e.content,
          isTask: e.is_task,
          isCompleted: e.is_completed,
          action: e.action,
        })),
        confidence: validated.confidence,
        notes: validated.notes,
      } as OCRResponse;
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
              prompt: createExtractionPrompt(weekId, existingContent),
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
        entries: validated.entries.map((e) => ({
          day: e.day,
          subject: e.subject,
          content: e.content,
          isTask: e.is_task,
          isCompleted: e.is_completed,
          action: e.action,
        })),
        confidence: validated.confidence,
        notes: validated.notes,
      } as OCRResponse;
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
