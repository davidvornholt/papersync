"use server";

import { Effect } from "effect";
import type { WeekId } from "@/app/shared/types";
import {
  generateOverviewContent,
  getOverviewPath,
  getWeeklyNotePath,
  readWeeklyNote,
  serializeWeeklyNoteToMarkdown,
  writeWeeklyNote,
} from "../services/config";
import { makeLocalVaultLayer, VaultService } from "../services/filesystem";
import { GitHubService, GitHubServiceLive } from "../services/github";
import {
  convertEntriesToWeeklyNote,
  type ExtractedEntry,
  getCurrentWeekId,
} from "./sync-helpers";

// Re-export ExtractedEntry type for backward compatibility
export type { ExtractedEntry } from "./sync-helpers";

// ============================================================================
// Types
// ============================================================================

export type SyncResult =
  | { readonly success: true; readonly notePath: string }
  | { readonly success: false; readonly error: string };

export type VaultMethod = "local" | "github";

export type SyncOptions = {
  readonly method: VaultMethod;
  readonly localPath?: string;
  readonly githubToken?: string;
  readonly githubRepo?: string;
  readonly weekId?: WeekId;
};

// ============================================================================
// Local Sync (existing function)
// ============================================================================

export async function syncToVault(
  entries: readonly ExtractedEntry[],
  vaultPath: string,
  weekId?: WeekId,
): Promise<SyncResult> {
  const effectiveWeekId = weekId ?? getCurrentWeekId();

  if (entries.length === 0) {
    return { success: false, error: "No entries to sync" };
  }

  if (!vaultPath) {
    return { success: false, error: "Vault path not configured" };
  }

  const program = Effect.gen(function* () {
    // Read existing note if present
    const existingNote = yield* readWeeklyNote(effectiveWeekId).pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    );

    // Convert entries to weekly note format, merging with existing
    const weeklyNote = convertEntriesToWeeklyNote(
      entries,
      effectiveWeekId,
      existingNote,
    );

    // Write the updated note
    yield* writeWeeklyNote(weeklyNote);

    // Create Overview.md if it doesn't exist
    const vault = yield* VaultService;
    const overviewPath = getOverviewPath();
    const overviewExists = yield* vault.fileExists(overviewPath);
    if (!overviewExists) {
      yield* vault.writeFile(overviewPath, generateOverviewContent());
    }

    return getWeeklyNotePath(effectiveWeekId);
  }).pipe(
    Effect.provide(makeLocalVaultLayer(vaultPath)),
    Effect.map((notePath) => ({ success: true as const, notePath })),
    Effect.catchAll((error: Error) =>
      Effect.succeed({ success: false as const, error: error.message }),
    ),
  );

  return Effect.runPromise(program);
}

// ============================================================================
// GitHub Sync
// ============================================================================



type GitHubFileResult =
  | { readonly status: "found"; readonly content: string; readonly sha: string }
  | { readonly status: "not_found" }
  | { readonly status: "error"; readonly message: string };

/**
 * Safely fetch a file from GitHub, distinguishing between:
 * - File exists → returns content and SHA
 * - File doesn't exist (404) → returns not_found (OK for new files)
 * - Error occurred → returns error message (should fail sync to prevent data loss)
 */
async function fetchGitHubFile(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
): Promise<GitHubFileResult> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  console.log(`[fetchGitHubFile] Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    console.log(`[fetchGitHubFile] Response status: ${response.status} ${response.statusText}`);

    if (response.status === 404) {
      console.log("[fetchGitHubFile] File not found (404) - this is OK for new vaults");
      return { status: "not_found" };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[fetchGitHubFile] API error: ${response.status} - ${errorText}`);
      return {
        status: "error",
        message: `GitHub API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    if (data.content && data.sha) {
      console.log(`[fetchGitHubFile] File found, content length: ${data.content.length}, SHA: ${data.sha}`);
      return {
        status: "found",
        content: Buffer.from(data.content, "base64").toString("utf-8"),
        sha: data.sha,
      };
    }

    console.error("[fetchGitHubFile] Invalid response - missing content or sha");
    return { status: "error", message: "Invalid response from GitHub API" };
  } catch (error) {
    console.error("[fetchGitHubFile] Network/fetch error:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

async function syncToGitHub(
  entries: readonly ExtractedEntry[],
  token: string,
  repoFullName: string,
  weekId?: WeekId,
): Promise<SyncResult> {
  const effectiveWeekId = weekId ?? getCurrentWeekId();
  const [owner, repo] = repoFullName.split("/");

  if (!owner || !repo) {
    return { success: false, error: "Invalid repository name" };
  }

  const notePath = getWeeklyNotePath(effectiveWeekId);
  console.log(`[syncToGitHub] Syncing ${entries.length} entries to ${owner}/${repo}/${notePath}`);

  // Safely fetch existing file - fail on errors to prevent data loss
  const fileResult = await fetchGitHubFile(token, owner, repo, notePath);
  console.log(`[syncToGitHub] File result status: ${fileResult.status}`);

  if (fileResult.status === "error") {
    return {
      success: false,
      error: `Cannot safely sync: ${fileResult.message}. Aborting to prevent data loss.`,
    };
  }

  // Parse existing note if file exists
  let existingNote = null;
  let fileSha: string | undefined;

  if (fileResult.status === "found") {
    fileSha = fileResult.sha;
    try {
      const { parseWeeklyNoteMarkdown } = await import("../services/config");
      existingNote = parseWeeklyNoteMarkdown(fileResult.content, effectiveWeekId);
    } catch {
      // If parsing fails, start fresh but log warning
      console.warn("[syncToGitHub] Failed to parse existing note, starting fresh");
    }
  }

  // Convert entries to weekly note format
  const weeklyNote = convertEntriesToWeeklyNote(
    entries,
    effectiveWeekId,
    existingNote,
  );

  // Serialize to markdown
  const markdown = serializeWeeklyNoteToMarkdown(weeklyNote);

  const program = Effect.gen(function* () {
    const github = yield* GitHubService;

    yield* github.createOrUpdateFile(
      token,
      owner,
      repo,
      notePath,
      markdown,
      `Update weekly note: ${effectiveWeekId}`,
      fileSha,
    );

    // Create Overview.md if it doesn't exist
    const overviewPath = getOverviewPath();
    const overviewResult = yield* Effect.promise(() =>
      fetchGitHubFile(token, owner, repo, overviewPath),
    );
    if (overviewResult.status !== "found") {
      yield* github.createOrUpdateFile(
        token,
        owner,
        repo,
        overviewPath,
        generateOverviewContent(),
        "Create homework overview",
        undefined,
      );
    }

    return notePath;
  }).pipe(
    Effect.provide(GitHubServiceLive),
    Effect.map((path) => ({ success: true as const, notePath: path })),
    Effect.catchAll((error: Error) =>
      Effect.succeed({ success: false as const, error: error.message }),
    ),
  );

  return Effect.runPromise(program);
}

// ============================================================================
// Unified Sync Function
// ============================================================================

export async function syncEntriesToVault(
  entries: readonly ExtractedEntry[],
  options: SyncOptions,
): Promise<SyncResult> {
  if (entries.length === 0) {
    return { success: false, error: "No entries to sync" };
  }

  if (options.method === "local") {
    if (!options.localPath) {
      return { success: false, error: "Vault path not configured" };
    }
    return syncToVault(entries, options.localPath, options.weekId);
  }

  if (options.method === "github") {
    if (!options.githubToken) {
      return { success: false, error: "GitHub not connected" };
    }
    if (!options.githubRepo) {
      return { success: false, error: "GitHub repository not selected" };
    }
    return syncToGitHub(
      entries,
      options.githubToken,
      options.githubRepo,
      options.weekId,
    );
  }

  return { success: false, error: "Invalid vault method" };
}
