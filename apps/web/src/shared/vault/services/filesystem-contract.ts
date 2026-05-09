import { Context, type Effect } from 'effect';
import type { VaultError, VaultFileNotFoundError } from './filesystem-errors';

export type VaultService = {
  readonly getVaultPath: () => Effect.Effect<string, VaultError>;
  readonly setVaultPath: (vaultPath: string) => Effect.Effect<void, VaultError>;
  readonly readFile: (
    relativePath: string,
  ) => Effect.Effect<string, VaultFileNotFoundError | VaultError>;
  readonly writeFile: (
    relativePath: string,
    content: string,
  ) => Effect.Effect<void, VaultError>;
  readonly fileExists: (
    relativePath: string,
  ) => Effect.Effect<boolean, VaultError>;
  readonly listFiles: (
    relativePath: string,
  ) => Effect.Effect<readonly string[], VaultError>;
  readonly ensureDirectory: (
    relativePath: string,
  ) => Effect.Effect<void, VaultError>;
  readonly deleteFile: (
    relativePath: string,
  ) => Effect.Effect<void, VaultError>;
};

export const VaultService = Context.GenericTag<VaultService>('VaultService');
