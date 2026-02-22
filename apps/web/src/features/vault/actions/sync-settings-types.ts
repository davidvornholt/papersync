import { Data } from 'effect';
import type { SubjectsConfig } from '@/shared/types';
import type { TimetableConfig } from '../services/config';

/**
 * Types and Error Classes for Settings Sync
 *
 * These are separated from the server actions file because
 * "use server" files can only export async functions.
 */

// ============================================================================
// Error Types
// ============================================================================

export class SyncSettingsValidationError extends Data.TaggedError(
  'SyncSettingsValidationError',
)<{
  readonly message: string;
}> {}

export class GitHubSyncError extends Data.TaggedError('GitHubSyncError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ============================================================================
// Types
// ============================================================================

export type SettingsToSync = {
  readonly subjects: SubjectsConfig;
  readonly timetable: TimetableConfig;
};

export type VaultMethod = 'local' | 'github';

// ============================================================================
// Result Types (for server action responses)
// ============================================================================

export type SyncSettingsResult =
  | { readonly success: true; readonly paths: readonly string[] }
  | { readonly success: false; readonly error: string };

export type LoadSettingsResult =
  | {
      readonly success: true;
      readonly subjects: SubjectsConfig;
      readonly timetable: TimetableConfig;
    }
  | { readonly success: false; readonly error: string };
