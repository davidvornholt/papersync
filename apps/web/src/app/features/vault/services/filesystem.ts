import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Context, Data, Effect, Layer } from 'effect';

// ============================================================================
// Error Types
// ============================================================================

export class VaultError extends Data.TaggedError('VaultError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class VaultNotFoundError extends Data.TaggedError('VaultNotFoundError')<{
  readonly path: string;
}> {}

export class VaultFileNotFoundError extends Data.TaggedError(
  'VaultFileNotFoundError',
)<{
  readonly filePath: string;
}> {}

// ============================================================================
// Vault Service Interface
// ============================================================================

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

// ============================================================================
// Local Filesystem Implementation
// ============================================================================

const createLocalVaultService = (initialPath: string): VaultService => {
  let vaultPath = initialPath;

  const resolvePath = (relativePath: string): string =>
    path.join(vaultPath, relativePath);

  return {
    getVaultPath: () => Effect.succeed(vaultPath),

    setVaultPath: (newPath: string) =>
      Effect.tryPromise({
        try: async () => {
          const stats = await fs.stat(newPath);
          if (!stats.isDirectory()) {
            throw new Error('Path is not a directory');
          }
          vaultPath = newPath;
        },
        catch: (error) =>
          new VaultError({
            message: `Failed to set vault path: ${newPath}`,
            cause: error,
          }),
      }),

    readFile: (relativePath: string) =>
      Effect.tryPromise({
        try: async () => {
          const fullPath = resolvePath(relativePath);
          return await fs.readFile(fullPath, 'utf-8');
        },
        catch: (error) => {
          if (
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
          ) {
            return new VaultFileNotFoundError({
              filePath: relativePath,
            });
          }
          return new VaultError({
            message: `Failed to read file: ${relativePath}`,
            cause: error,
          });
        },
      }),

    writeFile: (relativePath: string, content: string) =>
      Effect.tryPromise({
        try: async () => {
          const fullPath = resolvePath(relativePath);
          const dir = path.dirname(fullPath);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(fullPath, content, 'utf-8');
        },
        catch: (error) =>
          new VaultError({
            message: `Failed to write file: ${relativePath}`,
            cause: error,
          }),
      }),

    fileExists: (relativePath: string) =>
      Effect.tryPromise({
        try: async () => {
          const fullPath = resolvePath(relativePath);
          try {
            await fs.access(fullPath);
            return true;
          } catch {
            return false;
          }
        },
        catch: (error) =>
          new VaultError({
            message: `Failed to check file existence: ${relativePath}`,
            cause: error,
          }),
      }),

    listFiles: (relativePath: string) =>
      Effect.tryPromise({
        try: async () => {
          const fullPath = resolvePath(relativePath);
          try {
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            return entries
              .filter((entry) => entry.isFile())
              .map((entry) => entry.name);
          } catch {
            return [];
          }
        },
        catch: (error) =>
          new VaultError({
            message: `Failed to list files: ${relativePath}`,
            cause: error,
          }),
      }),

    ensureDirectory: (relativePath: string) =>
      Effect.tryPromise({
        try: async () => {
          const fullPath = resolvePath(relativePath);
          await fs.mkdir(fullPath, { recursive: true });
        },
        catch: (error) =>
          new VaultError({
            message: `Failed to create directory: ${relativePath}`,
            cause: error,
          }),
      }),

    deleteFile: (relativePath: string) =>
      Effect.tryPromise({
        try: async () => {
          const fullPath = resolvePath(relativePath);
          await fs.unlink(fullPath);
        },
        catch: (error) =>
          new VaultError({
            message: `Failed to delete file: ${relativePath}`,
            cause: error,
          }),
      }),
  };
};

// ============================================================================
// Layer
// ============================================================================

export const makeLocalVaultLayer = (
  vaultPath: string,
): Layer.Layer<VaultService, never, never> =>
  Layer.succeed(VaultService, createLocalVaultService(vaultPath));
