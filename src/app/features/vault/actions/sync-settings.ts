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

// ============================================================================
// Types
// ============================================================================

export type SettingsToSync = {
  readonly subjects: SubjectsConfig;
  readonly timetable: TimetableConfig;
};

export type VaultMethod = "local" | "github";

export type SyncSettingsResult =
  | { readonly success: true; readonly paths: string[] }
  | { readonly success: false; readonly error: string };

// ============================================================================
// Merge Helpers
// ============================================================================

/**
 * Merge subjects: preserve existing, add new ones by ID
 */
const mergeSubjects = (
  existing: SubjectsConfig,
  incoming: SubjectsConfig,
): SubjectsConfig => {
  const existingIds = new Set(existing.map((s) => s.id));
  const newSubjects = incoming.filter((s) => !existingIds.has(s.id));
  return [...existing, ...newSubjects];
};

/**
 * Merge timetable: preserve existing days with slots, add/update others
 */
const mergeTimetable = (
  existing: TimetableConfig,
  incoming: TimetableConfig,
): TimetableConfig => {
  const existingDays = new Map(existing.map((d) => [d.day, d]));

  // For each incoming day, merge slots if existing has slots
  for (const incomingDay of incoming) {
    const existingDay = existingDays.get(incomingDay.day);
    if (existingDay && existingDay.slots.length > 0) {
      // Existing day has slots - preserve them, add new slots
      const existingSlotIds = new Set(existingDay.slots.map((s) => s.id));
      const newSlots = incomingDay.slots.filter(
        (s) => !existingSlotIds.has(s.id),
      );
      existingDays.set(incomingDay.day, {
        ...existingDay,
        slots: [...existingDay.slots, ...newSlots],
      });
    } else if (incomingDay.slots.length > 0) {
      // No existing slots - use incoming
      existingDays.set(incomingDay.day, incomingDay);
    }
  }

  return Array.from(existingDays.values());
};

// ============================================================================
// Local Filesystem Sync
// ============================================================================

async function syncToLocalVault(
  settings: SettingsToSync,
  vaultPath: string,
): Promise<SyncSettingsResult> {
  const program = Effect.gen(function* () {
    // Read existing data from vault
    const existingSubjects = yield* readSubjects().pipe(
      Effect.catchAll(() => Effect.succeed([] as SubjectsConfig)),
    );
    const existingTimetable = yield* readTimetable().pipe(
      Effect.catchAll(() => Effect.succeed([] as TimetableConfig)),
    );

    // Merge: preserve existing, add new
    const mergedSubjects = mergeSubjects(existingSubjects, settings.subjects);
    const mergedTimetable = mergeTimetable(existingTimetable, settings.timetable);

    // Write merged data
    yield* writeSubjects(mergedSubjects);
    yield* writeTimetable(mergedTimetable);
    return [getSubjectsPath(), getTimetablePath()];
  }).pipe(
    Effect.provide(makeLocalVaultLayer(vaultPath)),
    Effect.map((paths) => ({ success: true as const, paths })),
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

async function syncToGitHub(
  settings: SettingsToSync,
  token: string,
  repoFullName: string,
): Promise<SyncSettingsResult> {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    return { success: false, error: "Invalid repository name" };
  }

  const subjectsPath = getSubjectsPath();
  const timetablePath = getTimetablePath();

  // Fetch existing data from GitHub for merging
  const program = Effect.gen(function* () {
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
    const subjectsSha = yield* Effect.promise(() =>
      getFileSha(token, owner, repo, subjectsPath),
    );
    const timetableSha = yield* Effect.promise(() =>
      getFileSha(token, owner, repo, timetablePath),
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

    return [subjectsPath, timetablePath];
  }).pipe(
    Effect.provide(GitHubServiceLive),
    Effect.map((paths) => ({ success: true as const, paths })),
    Effect.catchAll((error: Error) =>
      Effect.succeed({ success: false as const, error: error.message }),
    ),
  );

  return Effect.runPromise(program);
}

// ============================================================================
// Server Action
// ============================================================================

export async function syncSettingsToVault(
  settings: SettingsToSync,
  method: VaultMethod,
  options: {
    localPath?: string;
    githubToken?: string;
    githubRepo?: string;
  },
): Promise<SyncSettingsResult> {
  if (method === "local") {
    if (!options.localPath) {
      return { success: false, error: "Vault path not configured" };
    }
    return syncToLocalVault(settings, options.localPath);
  }

  if (method === "github") {
    if (!options.githubToken) {
      return { success: false, error: "GitHub not connected" };
    }
    if (!options.githubRepo) {
      return { success: false, error: "GitHub repository not selected" };
    }
    return syncToGitHub(settings, options.githubToken, options.githubRepo);
  }

  return { success: false, error: "Invalid vault method" };
}

// ============================================================================
// Load Settings from Vault
// ============================================================================

export type LoadSettingsResult =
  | {
      readonly success: true;
      readonly subjects: SubjectsConfig;
      readonly timetable: TimetableConfig;
    }
  | { readonly success: false; readonly error: string };

export async function loadSettingsFromVault(
  method: VaultMethod,
  options: {
    localPath?: string;
    githubToken?: string;
    githubRepo?: string;
  },
): Promise<LoadSettingsResult> {
  if (method === "local") {
    if (!options.localPath) {
      return { success: false, error: "Vault path not configured" };
    }
    return loadFromLocalVault(options.localPath);
  }

  if (method === "github") {
    if (!options.githubToken) {
      return { success: false, error: "GitHub not connected" };
    }
    if (!options.githubRepo) {
      return { success: false, error: "GitHub repository not selected" };
    }
    return loadFromGitHub(options.githubToken, options.githubRepo);
  }

  return { success: false, error: "Invalid vault method" };
}

async function loadFromLocalVault(
  vaultPath: string,
): Promise<LoadSettingsResult> {
  const { readSubjects, readTimetable } = await import("../services/config");

  const program = Effect.gen(function* () {
    const subjects = yield* readSubjects();
    const timetable = yield* readTimetable();
    return { subjects, timetable };
  }).pipe(
    Effect.provide(makeLocalVaultLayer(vaultPath)),
    Effect.map((data) => ({ success: true as const, ...data })),
    Effect.catchAll((error: Error) =>
      Effect.succeed({ success: false as const, error: error.message }),
    ),
  );

  return Effect.runPromise(program);
}

async function loadFromGitHub(
  token: string,
  repoFullName: string,
): Promise<LoadSettingsResult> {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    return { success: false, error: "Invalid repository name" };
  }

  const subjectsPath = getSubjectsPath();
  const timetablePath = getTimetablePath();

  const program = Effect.gen(function* () {
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
    Effect.map((data) => ({ success: true as const, ...data })),
    Effect.catchAll((error: Error) =>
      Effect.succeed({ success: false as const, error: error.message }),
    ),
  );

  return Effect.runPromise(program);
}
