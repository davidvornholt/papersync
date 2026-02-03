"use server";

import { Effect } from "effect";
import type { SubjectsConfig } from "@/app/shared/types";
import type { TimetableConfig } from "../services/config";
import {
  getSubjectsPath,
  getTimetablePath,
  readSubjects,
  readTimetable,
  writeSubjects,
  writeTimetable,
} from "../services/config";
import { makeLocalVaultLayer } from "../services/filesystem";
import { GitHubService, GitHubServiceLive } from "../services/github";
import {
  GitHubSyncError,
  SyncSettingsValidationError,
  type LoadSettingsResult,
  type SettingsToSync,
  type SyncSettingsResult,
  type VaultMethod,
} from "./sync-settings-types";

/**
 * Server Actions for Settings Sync
 *
 * Note: Types and error classes are in sync-settings-types.ts because
 * "use server" files can only export async functions.
 */

// Re-export types from the types file for convenience
export type {
  LoadSettingsResult,
  SettingsToSync,
  SyncSettingsResult,
  VaultMethod,
} from "./sync-settings-types";

// ============================================================================
// Merge Helpers
// ============================================================================

/**
 * Merge subjects: update existing ones with incoming data, add new ones by ID.
 * Incoming data takes precedence to ensure edits (like renames) are saved.
 */
const mergeSubjects = (
  existing: SubjectsConfig,
  incoming: SubjectsConfig,
): SubjectsConfig => {
  const incomingById = new Map(incoming.map((s) => [s.id, s]));
  const existingIds = new Set(existing.map((s) => s.id));

  // Update existing subjects with incoming data, or keep existing if not in incoming
  const updatedExisting = existing.map((existingSubject) => {
    const incomingSubject = incomingById.get(existingSubject.id);
    return incomingSubject ?? existingSubject;
  });

  // Add new subjects that don't exist in existing
  const newSubjects = incoming.filter((s) => !existingIds.has(s.id));

  return [...updatedExisting, ...newSubjects];
};

/**
 * Merge timetable: update existing slots with incoming data, add new ones.
 * Incoming data takes precedence to ensure edits (like changing subject) are saved.
 */
const mergeTimetable = (
  existing: TimetableConfig,
  incoming: TimetableConfig,
): TimetableConfig => {
  const existingDays = new Map(existing.map((d) => [d.day, d]));
  const incomingDays = new Map(incoming.map((d) => [d.day, d]));

  // Process all days from both existing and incoming
  const allDays = new Set([...existingDays.keys(), ...incomingDays.keys()]);

  // Use mutable array for accumulation, then return as readonly
  const result: TimetableConfig[number][] = [];

  for (const day of allDays) {
    const existingDay = existingDays.get(day);
    const incomingDay = incomingDays.get(day);

    if (!incomingDay) {
      // Day only exists in existing, keep it
      if (existingDay) {
        result.push(existingDay);
      }
    } else if (!existingDay) {
      // Day only exists in incoming, use it
      result.push(incomingDay);
    } else {
      // Day exists in both - merge slots, preferring incoming data for existing IDs
      const incomingSlotById = new Map(incomingDay.slots.map((s) => [s.id, s]));
      const existingSlotIds = new Set(existingDay.slots.map((s) => s.id));

      // Update existing slots with incoming data, or keep existing if not in incoming
      const updatedExistingSlots = existingDay.slots.map((existingSlot) => {
        const incomingSlot = incomingSlotById.get(existingSlot.id);
        return incomingSlot ?? existingSlot;
      });

      // Add new slots from incoming that don't exist in existing
      const newSlots = incomingDay.slots.filter(
        (s) => !existingSlotIds.has(s.id),
      );

      result.push({
        day,
        slots: [...updatedExistingSlots, ...newSlots],
      });
    }
  }

  return result;
};

// ============================================================================
// Effect-Based Implementations
// ============================================================================

const getFileShaEffect = (
  token: string,
  owner: string,
  repo: string,
  filePath: string,
): Effect.Effect<string | undefined, never> =>
  Effect.tryPromise({
    try: async () => {
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
        return data.sha as string;
      }
      return undefined;
    },
    catch: () => undefined,
  }).pipe(Effect.catchAll(() => Effect.succeed(undefined)));

const syncToLocalVaultEffect = (
  settings: SettingsToSync,
  vaultPath: string,
): Effect.Effect<readonly string[], SyncSettingsValidationError | Error> =>
  Effect.gen(function* () {
    if (!vaultPath) {
      return yield* Effect.fail(
        new SyncSettingsValidationError({
          message: "Vault path not configured",
        }),
      );
    }

    // Read existing data from vault
    const existingSubjects = yield* readSubjects().pipe(
      Effect.catchAll(() => Effect.succeed([] as SubjectsConfig)),
    );
    const existingTimetable = yield* readTimetable().pipe(
      Effect.catchAll(() => Effect.succeed([] as TimetableConfig)),
    );

    // Merge: preserve existing, add new
    const mergedSubjects = mergeSubjects(existingSubjects, settings.subjects);
    const mergedTimetable = mergeTimetable(
      existingTimetable,
      settings.timetable,
    );

    // Write merged data
    yield* writeSubjects(mergedSubjects);
    yield* writeTimetable(mergedTimetable);

    return [getSubjectsPath(), getTimetablePath()] as const;
  }).pipe(Effect.provide(makeLocalVaultLayer(vaultPath)));

const syncToGitHubEffect = (
  settings: SettingsToSync,
  token: string,
  owner: string,
  repo: string,
): Effect.Effect<
  readonly string[],
  SyncSettingsValidationError | GitHubSyncError
> =>
  Effect.gen(function* () {
    const subjectsPath = getSubjectsPath();
    const timetablePath = getTimetablePath();

    const github = yield* GitHubService;

    // Read existing subjects
    const existingSubjectsContent = yield* github
      .getFileContent(token, owner, repo, subjectsPath)
      .pipe(Effect.catchAll(() => Effect.succeed(null)));
    const existingSubjects: SubjectsConfig = existingSubjectsContent
      ? JSON.parse(existingSubjectsContent)
      : [];

    // Read existing timetable
    const existingTimetableContent = yield* github
      .getFileContent(token, owner, repo, timetablePath)
      .pipe(Effect.catchAll(() => Effect.succeed(null)));
    const existingTimetable: TimetableConfig = existingTimetableContent
      ? JSON.parse(existingTimetableContent)
      : [];

    // Merge: preserve existing, add new
    const mergedSubjects = mergeSubjects(existingSubjects, settings.subjects);
    const mergedTimetable = mergeTimetable(
      existingTimetable,
      settings.timetable,
    );

    // Get SHA for existing files (needed for update)
    const subjectsSha = yield* getFileShaEffect(
      token,
      owner,
      repo,
      subjectsPath,
    );
    const timetableSha = yield* getFileShaEffect(
      token,
      owner,
      repo,
      timetablePath,
    );

    // Create or update subjects file
    yield* github.createOrUpdateFile(
      token,
      owner,
      repo,
      subjectsPath,
      JSON.stringify(mergedSubjects, null, 2),
      "Update subjects configuration",
      subjectsSha,
    );

    // Create or update timetable file
    yield* github.createOrUpdateFile(
      token,
      owner,
      repo,
      timetablePath,
      JSON.stringify(mergedTimetable, null, 2),
      "Update timetable configuration",
      timetableSha,
    );

    return [subjectsPath, timetablePath] as const;
  }).pipe(
    Effect.provide(GitHubServiceLive),
    Effect.catchTag("GitHubAPIError", (error) =>
      Effect.fail(
        new GitHubSyncError({ message: error.message, cause: error }),
      ),
    ),
  );

const loadFromLocalVaultEffect = (
  vaultPath: string,
): Effect.Effect<
  { readonly subjects: SubjectsConfig; readonly timetable: TimetableConfig },
  SyncSettingsValidationError | Error
> =>
  Effect.gen(function* () {
    if (!vaultPath) {
      return yield* Effect.fail(
        new SyncSettingsValidationError({
          message: "Vault path not configured",
        }),
      );
    }

    const subjects = yield* readSubjects();
    const timetable = yield* readTimetable();
    return { subjects, timetable };
  }).pipe(Effect.provide(makeLocalVaultLayer(vaultPath)));

const loadFromGitHubEffect = (
  token: string,
  owner: string,
  repo: string,
): Effect.Effect<
  { readonly subjects: SubjectsConfig; readonly timetable: TimetableConfig },
  GitHubSyncError
> =>
  Effect.gen(function* () {
    const subjectsPath = getSubjectsPath();
    const timetablePath = getTimetablePath();

    const github = yield* GitHubService;

    const subjectsContent = yield* github.getFileContent(
      token,
      owner,
      repo,
      subjectsPath,
    );
    const timetableContent = yield* github.getFileContent(
      token,
      owner,
      repo,
      timetablePath,
    );

    const subjects: SubjectsConfig = subjectsContent
      ? JSON.parse(subjectsContent)
      : [];
    const timetable: TimetableConfig = timetableContent
      ? JSON.parse(timetableContent)
      : [];

    return { subjects, timetable };
  }).pipe(
    Effect.provide(GitHubServiceLive),
    Effect.catchTag("GitHubAPIError", (error) =>
      Effect.fail(
        new GitHubSyncError({ message: error.message, cause: error }),
      ),
    ),
  );

// ============================================================================
// Server Actions (Public API)
// ============================================================================

export const syncSettingsToVault = async (
  settings: SettingsToSync,
  method: VaultMethod,
  options: {
    localPath?: string;
    githubToken?: string;
    githubRepo?: string;
  },
): Promise<SyncSettingsResult> => {
  if (method === "local") {
    if (!options.localPath) {
      return { success: false, error: "Vault path not configured" };
    }

    return Effect.runPromise(
      syncToLocalVaultEffect(settings, options.localPath).pipe(
        Effect.map((paths) => ({ success: true as const, paths })),
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
      ),
    );
  }

  if (method === "github") {
    if (!options.githubToken) {
      return { success: false, error: "GitHub not connected" };
    }
    if (!options.githubRepo) {
      return { success: false, error: "GitHub repository not selected" };
    }

    const [owner, repo] = options.githubRepo.split("/");
    if (!owner || !repo) {
      return { success: false, error: "Invalid repository name" };
    }

    return Effect.runPromise(
      syncToGitHubEffect(settings, options.githubToken, owner, repo).pipe(
        Effect.map((paths) => ({ success: true as const, paths })),
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
      ),
    );
  }

  return { success: false, error: "Invalid vault method" };
};

// ============================================================================
// Load Settings from Vault
// ============================================================================

export const loadSettingsFromVault = async (
  method: VaultMethod,
  options: {
    localPath?: string;
    githubToken?: string;
    githubRepo?: string;
  },
): Promise<LoadSettingsResult> => {
  if (method === "local") {
    if (!options.localPath) {
      return { success: false, error: "Vault path not configured" };
    }

    return Effect.runPromise(
      loadFromLocalVaultEffect(options.localPath).pipe(
        Effect.map((data) => ({ success: true as const, ...data })),
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
      ),
    );
  }

  if (method === "github") {
    if (!options.githubToken) {
      return { success: false, error: "GitHub not connected" };
    }
    if (!options.githubRepo) {
      return { success: false, error: "GitHub repository not selected" };
    }

    const [owner, repo] = options.githubRepo.split("/");
    if (!owner || !repo) {
      return { success: false, error: "Invalid repository name" };
    }

    return Effect.runPromise(
      loadFromGitHubEffect(options.githubToken, owner, repo).pipe(
        Effect.map((data) => ({ success: true as const, ...data })),
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
      ),
    );
  }

  return { success: false, error: "Invalid vault method" };
};
