"use server";

import { Effect } from "effect";
import type { OCRResponse, WeekId } from "@/app/shared/types";
import {
  makeGoogleVisionLayer,
  makeOllamaVisionLayer,
  type VisionError,
  VisionProvider,
  type VisionValidationError,
} from "../services/vision-provider";

// ============================================================================
// Types
// ============================================================================

export type ExtractionOptions = {
  readonly imageBase64: string;
  readonly weekId: WeekId;
  readonly existingContent?: string;
  readonly provider: "google" | "ollama";
  readonly googleApiKey?: string;
  readonly ollamaEndpoint?: string;
};

export type ExtractionResult =
  | { readonly success: true; readonly data: OCRResponse }
  | { readonly success: false; readonly error: string };

// ============================================================================
// Server Action
// ============================================================================

export async function extractHandwriting(
  options: ExtractionOptions,
): Promise<ExtractionResult> {
  const {
    imageBase64,
    weekId,
    existingContent = "",
    provider,
    googleApiKey,
    ollamaEndpoint,
  } = options;

  // Validate provider configuration
  if (provider === "google" && !googleApiKey) {
    return {
      success: false,
      error: "Google API key not configured. Please add it in Settings.",
    };
  }

  if (provider === "ollama" && !ollamaEndpoint) {
    return {
      success: false,
      error: "Ollama endpoint not configured. Please add it in Settings.",
    };
  }

  // Create the appropriate layer based on provider
  const visionLayer =
    provider === "google"
      ? makeGoogleVisionLayer(googleApiKey ?? "")
      : makeOllamaVisionLayer(ollamaEndpoint ?? "http://localhost:11434");

  // Run the extraction
  const program = Effect.gen(function* () {
    const vision = yield* VisionProvider;
    return yield* vision.extractHandwriting(
      imageBase64,
      weekId,
      existingContent,
    );
  }).pipe(
    Effect.provide(visionLayer),
    Effect.map((data) => ({ success: true as const, data })),
    Effect.catchAll((error: VisionError | VisionValidationError) =>
      Effect.succeed({ success: false as const, error: error.message }),
    ),
  );

  return Effect.runPromise(program);
}
