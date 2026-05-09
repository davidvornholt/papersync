import * as path from 'node:path';
import { Effect, Layer } from 'effect';
import type { VaultService } from './filesystem-contract';
import { VaultService as VaultServiceTag } from './filesystem-contract';
import {
  VaultError,
  VaultFileNotFoundError,
  VaultNotFoundError,
} from './filesystem-errors';

export { VaultService } from './filesystem-contract';
export { VaultError, VaultFileNotFoundError, VaultNotFoundError };

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.length > 0 ? error.message : fallback;

const isMissingDirectoryError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes('ENOENT') || error.message.includes('ENOTDIR'));

const assertDirectoryExists = (directoryPath: string): Promise<void> =>
  Array.fromAsync(new Bun.Glob('*').scan({ cwd: directoryPath })).then(
    () => undefined,
  );

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
        try: () =>
          assertDirectoryExists(newPath).then(() => {
            vaultPath = newPath;
          }),
        catch: (error) =>
          new VaultError({
            message: `Failed to set vault path: ${newPath}${
              error instanceof Error && error.message.length > 0
                ? ` (${error.message})`
                : ''
            }`,
            cause: error,
          }),
      }),

    readFile: (relativePath: string) =>
      Effect.tryPromise({
        try: () => {
          const fullPath = resolvePath(relativePath);
          const file = Bun.file(fullPath);
          return file.exists().then((exists) => {
            if (!exists) {
              return Promise.reject({ _tag: 'file_not_found' as const });
            }
            return file.text();
          });
        },
        catch: (error) => {
          if (
            typeof error === 'object' &&
            error !== null &&
            '_tag' in error &&
            error._tag === 'file_not_found'
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
        try: () => {
          const fullPath = resolvePath(relativePath);
          return Bun.write(fullPath, content).then(() => undefined);
        },
        catch: (error) =>
          new VaultError({
            message: getErrorMessage(
              error,
              `Failed to write file: ${relativePath}`,
            ),
            cause: error,
          }),
      }),

    fileExists: (relativePath: string) =>
      Effect.tryPromise({
        try: () => {
          const fullPath = resolvePath(relativePath);
          return Bun.file(fullPath).exists();
        },
        catch: (error) =>
          new VaultError({
            message: `Failed to check file existence: ${relativePath}`,
            cause: error,
          }),
      }),

    listFiles: (relativePath: string) =>
      Effect.tryPromise({
        try: () => {
          const fullPath = resolvePath(relativePath);
          return Array.fromAsync(
            new Bun.Glob('*').scan({
              cwd: fullPath,
              onlyFiles: true,
            }),
          ).catch((error) =>
            isMissingDirectoryError(error) ? [] : Promise.reject(error),
          );
        },
        catch: (error) =>
          new VaultError({
            message: `Failed to list files: ${relativePath}`,
            cause: error,
          }),
      }),

    ensureDirectory: (relativePath: string) =>
      Effect.tryPromise({
        try: () => {
          const fullPath = resolvePath(relativePath);
          const markerPath = path.join(fullPath, '.papersync-dir-marker');
          return Bun.write(markerPath, '').then(() =>
            Bun.file(markerPath)
              .delete()
              .then(() => undefined),
          );
        },
        catch: (error) =>
          new VaultError({
            message: getErrorMessage(
              error,
              `Failed to create directory: ${relativePath}`,
            ),
            cause: error,
          }),
      }),

    deleteFile: (relativePath: string) =>
      Effect.tryPromise({
        try: () => {
          const fullPath = resolvePath(relativePath);
          return Bun.file(fullPath)
            .exists()
            .then((exists) => {
              if (!exists) {
                return Promise.reject(
                  new Error(`Failed to delete file: ${fullPath}`),
                );
              }
              return Bun.file(fullPath)
                .delete()
                .then(() => undefined);
            });
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
  Layer.succeed(VaultServiceTag, createLocalVaultService(vaultPath));
