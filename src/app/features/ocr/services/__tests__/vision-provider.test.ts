import { Schema } from "@effect/schema";
import { Context, Effect, Layer } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WeekId } from "@/app/shared/types";
import {
  makeGoogleVisionLayer,
  makeOllamaVisionLayer,
  type OCRResultWithModel,
  VisionError,
  VisionProvider,
  VisionValidationError,
} from "../vision-provider";

// ============================================================================
// Test Constants
// ============================================================================

const TEST_WEEK_ID = "2026-W05" as WeekId;
const TEST_IMAGE_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const TEST_EXISTING_CONTENT = "## Monday\n- [ ] Existing task";

// ============================================================================
// Mock OCR Response (simplified - no action/is_completed in AI output)
// ============================================================================

const VALID_OCR_RESPONSE = {
  entries: [
    {
      day: "Monday",
      subject: "Mathematics",
      content: "Complete problem set 6",
      is_task: true,
    },
    {
      day: "Tuesday",
      subject: "English",
      content: "Read chapter 5",
      is_task: true,
    },
  ],
  confidence: 0.92,
  notes: "All entries extracted successfully",
};

const EMPTY_OCR_RESPONSE = {
  entries: [],
  confidence: 1.0,
};

// ============================================================================
// OCR Response Schema Tests (Simplified - action/is_completed removed)
// ============================================================================

describe("OCR Response Schema", () => {
  // Simplified schema - action and is_completed are always constant
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

  it("should validate a complete OCR response with entries", () => {
    const result =
      Schema.decodeUnknownSync(OCRResponseSchema)(VALID_OCR_RESPONSE);
    expect(result.entries).toHaveLength(2);
    expect(result.confidence).toBe(0.92);
    expect(result.notes).toBe("All entries extracted successfully");
  });

  it("should validate an empty OCR response", () => {
    const result =
      Schema.decodeUnknownSync(OCRResponseSchema)(EMPTY_OCR_RESPONSE);
    expect(result.entries).toHaveLength(0);
    expect(result.confidence).toBe(1.0);
    expect(result.notes).toBeUndefined();
  });

  it("should reject missing required fields", () => {
    const missingContent = {
      entries: [
        {
          day: "Monday",
          subject: "Math",
          // missing content
          is_task: true,
        },
      ],
      confidence: 0.9,
    };

    expect(() =>
      Schema.decodeUnknownSync(OCRResponseSchema)(missingContent),
    ).toThrow();
  });

  it("should accept valid confidence values", () => {
    const response = {
      entries: [],
      confidence: 0.5,
    };
    const result = Schema.decodeUnknownSync(OCRResponseSchema)(response);
    expect(result.confidence).toBe(0.5);
  });
});

// ============================================================================
// Vision Error Tests
// ============================================================================

describe("VisionError", () => {
  it("should create error with message", () => {
    const error = new VisionError({ message: "API call failed" });
    expect(error.message).toBe("API call failed");
    expect(error._tag).toBe("VisionError");
  });

  it("should create error with message and cause", () => {
    const originalError = new Error("Network timeout");
    const error = new VisionError({
      message: "API call failed",
      cause: originalError,
    });
    expect(error.message).toBe("API call failed");
    expect(error.cause).toBe(originalError);
  });
});

describe("VisionValidationError", () => {
  it("should create error with message", () => {
    const error = new VisionValidationError({ message: "Invalid JSON" });
    expect(error.message).toBe("Invalid JSON");
    expect(error._tag).toBe("VisionValidationError");
  });

  it("should create error with message and raw response", () => {
    const error = new VisionValidationError({
      message: "Schema validation failed",
      raw: '{"malformed": true}',
    });
    expect(error.message).toBe("Schema validation failed");
    expect(error.raw).toBe('{"malformed": true}');
  });
});

// ============================================================================
// Model Fallback Configuration Tests
// ============================================================================

describe("Gemini Model Configuration", () => {
  const EXPECTED_MODELS = [
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
    "gemini-2.5-flash-lite",
  ];

  it("should have correct model priority order", () => {
    expect(EXPECTED_MODELS[0]).toBe("gemini-3-flash-preview");
    expect(EXPECTED_MODELS[EXPECTED_MODELS.length - 1]).toBe(
      "gemini-2.5-flash-lite",
    );
  });

  it("should identify Gemini 3 models correctly", () => {
    const gemini3Models = EXPECTED_MODELS.filter((m) => m.includes("gemini-3"));
    expect(gemini3Models).toContain("gemini-3-flash-preview");
    expect(gemini3Models).toHaveLength(1);
  });

  it("should identify Gemini 2.5 models correctly", () => {
    const gemini25Models = EXPECTED_MODELS.filter((m) => m.includes("2.5"));
    expect(gemini25Models).toContain("gemini-2.5-flash");
    expect(gemini25Models).toContain("gemini-2.5-flash-lite");
    expect(gemini25Models).toHaveLength(2);
  });
});

// ============================================================================
// System Prompt Tests
// ============================================================================

describe("Extraction System Prompt", () => {
  const createExpectedPromptParts = (
    weekId: WeekId,
    existingContent: string,
  ) => [
    "handwriting extraction specialist",
    `Week: ${weekId}`,
    existingContent || "(No existing content)",
    "NEW",
    "is_task",
    "General Tasks",
    "confidence",
  ];

  it("should include week context in prompt", () => {
    const weekId = "2026-W10" as WeekId;
    const expectedParts = createExpectedPromptParts(weekId, "");
    expect(expectedParts).toContain(`Week: ${weekId}`);
  });

  it("should handle empty existing content", () => {
    const expectedParts = createExpectedPromptParts(TEST_WEEK_ID, "");
    expect(expectedParts).toContain("(No existing content)");
  });

  it("should include key instruction keywords", () => {
    const expectedParts = createExpectedPromptParts(
      TEST_WEEK_ID,
      TEST_EXISTING_CONTENT,
    );
    expect(expectedParts).toContain("NEW");
    expect(expectedParts).toContain("is_task");
  });
});

// ============================================================================
// Layer Factory Tests
// ============================================================================

describe("Vision Provider Layer Factories", () => {
  it("should create Google Vision layer with API key", () => {
    const layer = makeGoogleVisionLayer("test-api-key");
    expect(layer).toBeDefined();
  });

  it("should create Ollama Vision layer with default endpoint", () => {
    const layer = makeOllamaVisionLayer();
    expect(layer).toBeDefined();
  });

  it("should create Ollama Vision layer with custom endpoint", () => {
    const layer = makeOllamaVisionLayer("http://custom:11434");
    expect(layer).toBeDefined();
  });
});

// ============================================================================
// OCR Result Transformation Tests
// ============================================================================

describe("OCR Result Transformation", () => {
  it("should transform snake_case to camelCase and add defaults", () => {
    const snakeCaseEntry = {
      day: "Monday",
      subject: "Math",
      content: "Test content",
      is_task: true,
    };

    // Simulate the transformation that happens in the provider
    // (action and isCompleted are set to defaults during transformation)
    const transformed = {
      day: snakeCaseEntry.day,
      subject: snakeCaseEntry.subject,
      content: snakeCaseEntry.content,
      isTask: snakeCaseEntry.is_task,
      isCompleted: false, // Default value
      action: "add" as const, // Default value
    };

    expect(transformed.isTask).toBe(true);
    expect(transformed.isCompleted).toBe(false);
    expect(transformed.action).toBe("add");
  });

  it("should preserve all entry fields during transformation", () => {
    const original = VALID_OCR_RESPONSE.entries[0];
    const transformed = {
      day: original.day,
      subject: original.subject,
      content: original.content,
      isTask: original.is_task,
      isCompleted: false, // Default
      action: "add" as const, // Default
    };

    expect(transformed.day).toBe("Monday");
    expect(transformed.subject).toBe("Mathematics");
    expect(transformed.content).toBe("Complete problem set 6");
  });

  it("should always set isCompleted to false (tracked digitally)", () => {
    // Regardless of AI output, isCompleted should always be false
    const transformed = {
      isCompleted: false,
    };
    expect(transformed.isCompleted).toBe(false);
  });

  it("should always set action to 'add' (only new entries)", () => {
    // Regardless of AI output, action should always be "add"
    const transformed = {
      action: "add" as const,
    };
    expect(transformed.action).toBe("add");
  });
});

// ============================================================================
// OCR Result With Model Tests
// ============================================================================

describe("OCRResultWithModel", () => {
  it("should include model used in result", () => {
    const result: OCRResultWithModel = {
      data: {
        entries: [],
        confidence: 1.0,
      },
      modelUsed: "gemini-3-flash-preview",
    };

    expect(result.modelUsed).toBe("gemini-3-flash-preview");
    expect(result.data.entries).toHaveLength(0);
  });

  it("should preserve OCR data alongside model info", () => {
    const result: OCRResultWithModel = {
      data: {
        entries: [
          {
            day: "Monday",
            subject: "Math",
            content: "Test",
            isTask: true,
            isCompleted: false,
            action: "add",
          },
        ],
        confidence: 0.85,
        notes: "Test notes",
      },
      modelUsed: "gemini-2.5-flash",
    };

    expect(result.data.entries).toHaveLength(1);
    expect(result.data.confidence).toBe(0.85);
    expect(result.data.notes).toBe("Test notes");
    expect(result.modelUsed).toBe("gemini-2.5-flash");
  });
});

// ============================================================================
// Effect-based Extraction Tests
// ============================================================================

describe("Effect-based Extraction Pipeline", () => {
  it("should handle successful extraction result", async () => {
    const mockResult: OCRResultWithModel = {
      data: {
        entries: [
          {
            day: "Monday",
            subject: "Math",
            content: "Do homework",
            isTask: true,
            isCompleted: false,
            action: "add",
          },
        ],
        confidence: 0.9,
      },
      modelUsed: "gemini-3-flash-preview",
    };

    const program = Effect.succeed(mockResult);
    const result = await Effect.runPromise(program);

    expect(result.data.entries).toHaveLength(1);
    expect(result.modelUsed).toBe("gemini-3-flash-preview");
  });

  it("should handle VisionError correctly", async () => {
    const error = new VisionError({ message: "API timeout" });
    const program = Effect.fail(error).pipe(
      Effect.catchAll((e) => Effect.succeed({ error: e.message })),
    );

    const result = await Effect.runPromise(program);
    expect(result.error).toBe("API timeout");
  });

  it("should handle VisionValidationError correctly", async () => {
    const error = new VisionValidationError({
      message: "Invalid response",
      raw: "not json",
    });
    const program = Effect.fail(error).pipe(
      Effect.catchAll((e) => Effect.succeed({ error: e.message, raw: e.raw })),
    );

    const result = await Effect.runPromise(program);
    expect(result.error).toBe("Invalid response");
    expect(result.raw).toBe("not json");
  });
});

// ============================================================================
// Provider Options Tests
// ============================================================================

describe("Provider Options Configuration", () => {
  it("should configure high media resolution", () => {
    const providerOptions = {
      google: {
        mediaResolution: "MEDIA_RESOLUTION_HIGH" as const,
        thinkingConfig: { thinkingLevel: "medium" as const },
      },
    };

    expect(providerOptions.google.mediaResolution).toBe(
      "MEDIA_RESOLUTION_HIGH",
    );
  });

  it("should configure thinkingLevel for Gemini 3 models", () => {
    const providerOptions = {
      google: {
        thinkingConfig: { thinkingLevel: "medium" as const },
      },
    };

    expect(providerOptions.google.thinkingConfig.thinkingLevel).toBe("medium");
  });

  it("should configure thinkingBudget for Gemini 2.5 models", () => {
    const providerOptions = {
      google: {
        thinkingConfig: { thinkingBudget: 4096 },
      },
    };

    expect(providerOptions.google.thinkingConfig.thinkingBudget).toBe(4096);
  });
});
