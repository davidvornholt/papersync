"use server";

import { Effect } from "effect";
import type { WeekId } from "@/app/shared/types";
import {
  getWeeklyNotePath,
  readWeeklyNote,
  serializeWeeklyNoteToMarkdown,
  writeWeeklyNote,
} from "../services/config";
import { makeLocalVaultLayer } from "../services/filesystem";
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

async function getFileSha(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );
    if (response.ok) {
      const data = await response.json();
      return data.sha;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
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
    return null;
  } catch {
    return null;
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

  // Get existing file content and SHA
  const existingContent = await getFileContent(token, owner, repo, notePath);
  const fileSha = await getFileSha(token, owner, repo, notePath);

  // Parse existing note if any
  let existingNote = null;
  if (existingContent) {
    try {
      const { parseWeeklyNoteMarkdown } = await import("../services/config");
      existingNote = parseWeeklyNoteMarkdown(existingContent, effectiveWeekId);
    } catch {
      // If parsing fails, start fresh
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
    return syncToGitHub(entries, options.githubToken, options.githubRepo, options.weekId);
  }

  return { success: false, error: "Invalid vault method" };
}
