import * as path from 'node:path';
import { Effect, Layer } from 'effect';
import { isDirectoryPath, runCommand } from './filesystem-command';
import type { VaultService } from './filesystem-contract';
import { VaultService as VaultServiceTag } from './filesystem-contract';
import {
  VaultError,
  VaultFileNotFoundError,
  VaultNotFoundError,
} from './filesystem-errors';

export { VaultService } from './filesystem-contract';
export { VaultError, VaultFileNotFoundError, VaultNotFoundError };

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
          isDirectoryPath(newPath).then((isDirectory) => {
            if (!isDirectory) {
              return Promise.reject(new Error('Path is not a directory'));
            }
            vaultPath = newPath;
          }),
        catch: (error) =>
          new VaultError({
            message: `Failed to set vault path: ${newPath}`,
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
          const dir = path.dirname(fullPath);
          return runCommand(['mkdir', '-p', dir]).then((mkdirResult) => {
            if (mkdirResult.exitCode !== 0) {
              return Promise.reject(
                new Error(
                  mkdirResult.stderr || `Failed to create directory: ${dir}`,
                ),
              );
            }
            return Bun.write(fullPath, content).then(() => undefined);
          });
        },
        catch: (error) =>
          new VaultError({
            message: `Failed to write file: ${relativePath}`,
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
          return isDirectoryPath(fullPath).then((isDirectory) =>
            isDirectory
              ? Array.fromAsync(
                  new Bun.Glob('*').scan({
                    cwd: fullPath,
                    onlyFiles: true,
                  }),
                )
              : [],
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
          return runCommand(['mkdir', '-p', fullPath]).then((mkdirResult) => {
            if (mkdirResult.exitCode !== 0) {
              return Promise.reject(
                new Error(
                  mkdirResult.stderr ||
                    `Failed to create directory: ${relativePath}`,
                ),
              );
            }
          });
        },
        catch: (error) =>
          new VaultError({
            message: `Failed to create directory: ${relativePath}`,
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
              return runCommand(['rm', fullPath]).then((rmResult) => {
                if (rmResult.exitCode !== 0) {
                  return Promise.reject(
                    new Error(
                      rmResult.stderr || `Failed to delete file: ${fullPath}`,
                    ),
                  );
                }
              });
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
