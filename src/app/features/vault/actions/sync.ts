"use server";

import { Effect } from "effect";
import type { WeekId } from "@/app/shared/types";
import {
  getWeeklyNotePath,
  readWeeklyNote,
  writeWeeklyNote,
} from "../services/config";
import { makeLocalVaultLayer } from "../services/filesystem";
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

// ============================================================================
// Server Action
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
