import type { SubjectsConfig } from '@/shared/types/schemas';
import type { TimetableConfig } from '@/shared/vault/services/config-json';
/**
 * Types and Error Classes for Settings Sync
 *
 * These are separated from the server actions file because
 * "use server" files can only export async functions.
 */

export type SettingsToSync = {
  readonly subjects: SubjectsConfig;
  readonly timetable: TimetableConfig;
};

export type VaultMethod = 'local' | 'github';

export type SyncSettingsResult =
  | { readonly success: true; readonly paths: ReadonlyArray<string> }
  | { readonly success: false; readonly error: string };

export type LoadSettingsResult =
  | {
      readonly success: true;
      readonly subjects: SubjectsConfig;
      readonly timetable: TimetableConfig;
    }
  | { readonly success: false; readonly error: string };
