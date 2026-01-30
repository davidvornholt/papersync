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

// ============================================================================
// Types
// ============================================================================

export type VaultSettings = {
  readonly method: "local" | "github";
  readonly localPath?: string;
  readonly githubToken?: string;
  readonly githubRepo?: string;
};

export type ExtractionOptions = {
  readonly imageBase64: string;
  readonly weekId: WeekId;
  readonly provider: "google" | "ollama";
  readonly googleApiKey?: string;
  readonly ollamaEndpoint?: string;
  readonly vaultSettings?: VaultSettings;
};

export type ExtractionResult =
  | {
      readonly success: true;
      readonly data: OCRResponse;
      readonly modelUsed: string;
    }
  | { readonly success: false; readonly error: string };

// ============================================================================
// Helper: Fetch Existing Content from Vault
// ============================================================================

async function fetchExistingContent(
  weekId: WeekId,
  vaultSettings?: VaultSettings,
): Promise<string> {
  if (!vaultSettings) return "";

  try {
    if (vaultSettings.method === "local" && vaultSettings.localPath) {
      // Read from local filesystem
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        const notePath = getWeeklyNotePath(weekId);
        const exists = yield* vault.fileExists(notePath);
        if (!exists) return "";
        return yield* vault.readFile(notePath);
      }).pipe(
        Effect.provide(makeLocalVaultLayer(vaultSettings.localPath)),
        Effect.catchAll(() => Effect.succeed("")),
      );

      return await Effect.runPromise(program);
    }

    if (
      vaultSettings.method === "github" &&
      vaultSettings.githubToken &&
      vaultSettings.githubRepo
    ) {
      // Read from GitHub
      const [owner, repo] = vaultSettings.githubRepo.split("/");
      if (!owner || !repo) return "";

      const notePath = getWeeklyNotePath(weekId);
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${notePath}`,
        {
          headers: {
            Authorization: `Bearer ${vaultSettings.githubToken}`,
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
    }
  } catch {
    // If fetching fails, proceed without existing content
    console.warn(
      "[extractHandwriting] Failed to fetch existing content, proceeding without it",
    );
  }

  return "";
}

// ============================================================================
// Server Action
// ============================================================================

export async function extractHandwriting(
  options: ExtractionOptions,
): Promise<ExtractionResult> {
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

  // Fetch existing content from vault to provide context to AI
  const existingContent = await fetchExistingContent(weekId, vaultSettings);

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
    Effect.map((result) => ({
      success: true as const,
      data: result.data,
      modelUsed: result.modelUsed,
    })),
    Effect.catchAll((error: VisionError | VisionValidationError) =>
      Effect.succeed({ success: false as const, error: error.message }),
    ),
  );

  return Effect.runPromise(program);
}
