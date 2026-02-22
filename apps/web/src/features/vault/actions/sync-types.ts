import { Data } from 'effect';
import type { WeekId } from '@/shared/types';

/**
 * Types and Error Classes for Vault Sync
 *
 * These are separated from the server actions file because
 * "use server" files can only export async functions.
 */

// Re-export ExtractedEntry type for backward compatibility
export type { ExtractedEntry } from './sync-helpers';

// ============================================================================
// Error Types
// ============================================================================

export class SyncValidationError extends Data.TaggedError(
  'SyncValidationError',
)<{
  readonly message: string;
}> {}

export class GitHubFileError extends Data.TaggedError('GitHubFileError')<{
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {}

export class GitHubFileNotFound extends Data.TaggedError('GitHubFileNotFound')<{
  readonly path: string;
}> {}

// ============================================================================
// Types
// ============================================================================

export type VaultMethod = 'local' | 'github';

export type SyncOptions = {
  readonly method: VaultMethod;
  readonly localPath?: string;
  readonly githubToken?: string;
  readonly githubRepo?: string;
  readonly weekId?: WeekId;
};

// ============================================================================
// Result Types (for server action responses)
// ============================================================================

export type SyncResult =
  | { readonly success: true; readonly notePath: string }
  | { readonly success: false; readonly error: string };
