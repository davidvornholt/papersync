import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { JSONSchema, Schema } from '@effect/schema';
import { generateText, jsonSchema, Output } from 'ai';
import { Context, Data, Effect, Layer } from 'effect';
import type { OCRResponse, WeekId } from '@/app/shared/types';

// ============================================================================
// Error Types
// ============================================================================

export class VisionError extends Data.TaggedError('VisionError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class VisionValidationError extends Data.TaggedError(
  'VisionValidationError',
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
  { modelId: 'gemini-3-flash-preview', isGemini3: true },
  { modelId: 'gemini-flash-latest', isGemini3: false },
  { modelId: 'gemini-2.5-flash', isGemini3: false },
  { modelId: 'gemini-flash-lite-latest', isGemini3: false },
  { modelId: 'gemini-2.5-flash-lite', isGemini3: false },
] as const;

// ============================================================================
// OCR Response Schema (Effect Schema)
// ============================================================================

const OCREntrySchema = Schema.Struct({
  day: Schema.String,
  subject: Schema.String,
  content: Schema.String,
  is_task: Schema.Boolean,
  due_date: Schema.optional(Schema.String),
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
  Context.GenericTag<VisionProvider>('VisionProvider');

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
- Today's date for reference: ${new Date().toISOString().split('T')[0]}
- Existing digital record (Markdown):
\`\`\`markdown
${existingContent || '(No existing content)'}
\`\`\`

PLANNER LAYOUT:
The planner is printed on 2 pages:
- Page 1 (front): Monday, Tuesday, Wednesday
- Page 2 (back): Thursday, Friday, Notes section

CRITICAL DAY IDENTIFICATION RULES:
1. NEVER assume the first section on the page is Monday
2. ALWAYS read the actual printed day name text from each section header
3. Each day section has a header with the day name in UPPERCASE BOLD TEXT (e.g., "THURSDAY", "FRIDAY", "MONDAY")
4. The day name and date appear together like: "THURSDAY  Jan 30" or "MONDAY  Jan 27"
5. If you see "THURSDAY" or "FRIDAY" printed in the headers, those entries belong to Thursday or Friday - NOT Monday or Tuesday!

COMMON MISTAKE TO AVOID:
If the scan shows headers like "THURSDAY" and "FRIDAY", and you output entries with day="Monday" or day="Tuesday", that is WRONG. The day field MUST match the actual printed header text on the page.

TASK:
1. Identify all handwritten entries in the scan
2. Read the printed day headers to correctly identify which day each entry belongs to
3. Compare against the existing digital record
4. Extract ONLY entries that are NEW (not already in the existing record)
5. Preserve exact wording including abbreviations and shorthand
6. Extract any due dates mentioned in the text

DUE DATE EXTRACTION:
Look for phrases indicating deadlines and extract the date in YYYY-MM-DD format.
IMPORTANT: Remove the due date phrase from the "content" field - only include the core task description.

Examples (English):
- "Analyze periodic table due by Friday" → content: "Analyze periodic table", due_date: calculated Friday date
- "Read chapter 5 until 2025-02-10" → content: "Read chapter 5", due_date: "2025-02-10"
- "Essay due February 14" → content: "Essay", due_date: "2025-02-14"

Examples (German):
- "Periodensystem analysieren bis Freitag" → content: "Periodensystem analysieren", due_date: calculated Friday date
- "Periodensystem analysieren bis nächsten Freitag" → content: "Periodensystem analysieren", due_date: calculated date
- "Kapitel 5 lesen bis zum 14. Februar" → content: "Kapitel 5 lesen", due_date: "2025-02-14"
- "Hausaufgaben Abgabe: 5. März" → content: "Hausaufgaben", due_date: calculated date
- "Aufsatz muss bis zum 10.02. fertig sein" → content: "Aufsatz", due_date: "2025-02-10"

IMPORTANT:
- "content" should be the CLEANED task description WITHOUT any due date phrases (remove "bis...", "until...", "due...", "Abgabe:", etc.)
- "is_task" should be true for homework/assignments, false for general notes
- "subject" should be "General Tasks" for entries not bound to a specific subject
- "due_date" should be the extracted deadline in YYYY-MM-DD format, or omitted if none
- Return empty "entries" array if no new handwritten content detected
- "confidence" reflects certainty about the extraction (0.0 to 1.0)
- PRESERVE ALL SPECIAL CHARACTERS exactly as written: umlauts (ä, ö, ü, Ä, Ö, Ü), eszett (ß), accented characters (á, é, í, ó, ú, à, è, etc.), and any other non-ASCII characters. Do NOT replace them with $, substitute characters, or escape sequences.`;

// ============================================================================
// Day Name Normalization
// ============================================================================

/**
 * Normalizes day names to proper case (e.g., "monday" -> "Monday")
 * Returns null if the input is not a recognized day name.
 */
const normalizeDayName = (day: string): string => {
  const normalizedDays: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };
  return normalizedDays[day.toLowerCase()] ?? day;
};

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
      const systemPrompt = createExtractionSystemPrompt(
        weekId,
        existingContent,
      );

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
                  role: 'user',
                  content: [
                    {
                      type: 'image',
                      image: imageBase64,
                    },
                  ],
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

          // Transform to canonical format (add defaults for constant fields)
          const ocrResponse: OCRResponse = {
            entries: validated.entries.map((e) => ({
              day: normalizeDayName(e.day),
              subject: e.subject,
              content: e.content,
              isTask: e.is_task,
              isCompleted: false, // Always false - completion tracked digitally
              action: 'add' as const, // Always add - planner only tracks new entries
              dueDate: e.due_date as OCRResponse['entries'][number]['dueDate'],
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
          message: 'All Gemini models failed to process the image',
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
            throw new Error(`Ollama API error: ${res.status}`);
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

      // Parse and validate
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
          entries: validated.entries.map((e) => ({
            day: normalizeDayName(e.day),
            subject: e.subject,
            content: e.content,
            isTask: e.is_task,
            isCompleted: false, // Always false - completion tracked digitally
            action: 'add' as const, // Always add - planner only tracks new entries
            dueDate: e.due_date as OCRResponse['entries'][number]['dueDate'],
          })),
          confidence: validated.confidence,
          notes: validated.notes,
        } as OCRResponse,
        modelUsed: 'qwen3-vl-4b',
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
  endpoint = 'http://localhost:11434',
): Layer.Layer<VisionProvider, never, never> =>
  Layer.succeed(VisionProvider, createOllamaVisionProvider(endpoint));
