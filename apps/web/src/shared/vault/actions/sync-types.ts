import type { WeekId } from '@/shared/types/schemas';
/**
 * Types and Error Classes for Vault Sync
 *
 * These are separated from the server actions file because
 * "use server" files can only export async functions.
 */

// Re-export ExtractedEntry type for backward compatibility

export type VaultMethod = 'local' | 'github' | 'super-productivity';

export type SyncOptions = {
  readonly method: VaultMethod;
  readonly localPath?: string;
  readonly githubToken?: string;
  readonly githubRepo?: string;
  readonly superProductivityProjectId?: string;
  readonly superProductivityTagIds?: ReadonlyArray<string>;
  readonly weekId?: WeekId;
};

export type SyncResult =
  | { readonly success: true; readonly notePath: string }
  | { readonly success: false; readonly error: string };
