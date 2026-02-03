"use server";

import { Effect } from "effect";
import { getWeeklyNotePath } from "@/app/features/vault/services/config";
import {
  makeLocalVaultLayer,
  VaultService,
} from "@/app/features/vault/services/filesystem";
import type { OCRResponse, WeekId } from "@/app/shared/types";
import {
  makeGoogleVisionLayer,
  makeOllamaVisionLayer,
  type VisionError,
  VisionProvider,
  type VisionValidationError,
} from "../services/vision-provider";
import {
  ExtractionValidationError,
  type ExtractionOptions,
  type ExtractionResult,
  type VaultSettings,
} from "./extract-types";

/**
 * Server Actions for OCR Extraction
 *
 * Note: Types and error classes are in extract-types.ts because
 * "use server" files can only export async functions.
 */

// Re-export types from the types file for convenience
export type { ExtractionOptions, ExtractionResult, VaultSettings };

// ============================================================================
// Effect-Based Implementations
// ============================================================================

const fetchExistingContentFromLocal = (
  weekId: WeekId,
  localPath: string,
): Effect.Effect<string, never> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const notePath = getWeeklyNotePath(weekId);
    const exists = yield* vault.fileExists(notePath);
    if (!exists) return "";
    return yield* vault.readFile(notePath);
  }).pipe(
    Effect.provide(makeLocalVaultLayer(localPath)),
    Effect.catchAll(() => Effect.succeed("")),
  );

const fetchExistingContentFromGitHub = (
  weekId: WeekId,
  token: string,
  owner: string,
  repo: string,
): Effect.Effect<string, never> =>
  Effect.tryPromise({
    try: async () => {
      const notePath = getWeeklyNotePath(weekId);
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${notePath}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          return Buffer.from(data.content, "base64").toString("utf-8");
        }
      }
      return "";
    },
    catch: () => "",
  }).pipe(Effect.catchAll(() => Effect.succeed("")));

const fetchExistingContentEffect = (
  weekId: WeekId,
  vaultSettings?: VaultSettings,
): Effect.Effect<string, never> => {
  if (!vaultSettings) {
    return Effect.succeed("");
  }

  if (vaultSettings.method === "local" && vaultSettings.localPath) {
    return fetchExistingContentFromLocal(weekId, vaultSettings.localPath);
  }

  if (
    vaultSettings.method === "github" &&
    vaultSettings.githubToken &&
    vaultSettings.githubRepo
  ) {
    const [owner, repo] = vaultSettings.githubRepo.split("/");
    if (!owner || !repo) {
      return Effect.succeed("");
    }
    return fetchExistingContentFromGitHub(
      weekId,
      vaultSettings.githubToken,
      owner,
      repo,
    );
  }

  return Effect.succeed("");
};

const extractHandwritingEffect = (
  options: ExtractionOptions,
): Effect.Effect<
  { readonly data: OCRResponse; readonly modelUsed: string },
  ExtractionValidationError | VisionError | VisionValidationError
> =>
  Effect.gen(function* () {
    const {
      imageBase64,
      weekId,
      provider,
      googleApiKey,
      ollamaEndpoint,
      vaultSettings,
    } = options;

    // Validate provider configuration
    if (provider === "google" && !googleApiKey) {
      return yield* Effect.fail(
        new ExtractionValidationError({
          message: "Google API key not configured. Please add it in Settings.",
        }),
      );
    }

    if (provider === "ollama" && !ollamaEndpoint) {
      return yield* Effect.fail(
        new ExtractionValidationError({
          message: "Ollama endpoint not configured. Please add it in Settings.",
        }),
      );
    }

    // Fetch existing content from vault to provide context to AI
    const existingContent = yield* fetchExistingContentEffect(
      weekId,
      vaultSettings,
    );

    // Create the appropriate layer based on provider
    const visionLayer =
      provider === "google"
        ? makeGoogleVisionLayer(googleApiKey ?? "")
        : makeOllamaVisionLayer(ollamaEndpoint ?? "http://localhost:11434");

    // Run the extraction with the vision provider
    const vision = yield* Effect.provide(VisionProvider, visionLayer);
    const result = yield* Effect.provide(
      vision.extractHandwriting(imageBase64, weekId, existingContent),
      visionLayer,
    );

    return { data: result.data, modelUsed: result.modelUsed };
  });

// ============================================================================
// Server Action (Public API)
// ============================================================================

export const extractHandwriting = async (
  options: ExtractionOptions,
): Promise<ExtractionResult> =>
  Effect.runPromise(
    extractHandwritingEffect(options).pipe(
      Effect.map((result) => ({
        success: true as const,
        data: result.data,
        modelUsed: result.modelUsed,
      })),
      Effect.catchAll((error) =>
        Effect.succeed({ success: false as const, error: error.message }),
      ),
    ),
  );
