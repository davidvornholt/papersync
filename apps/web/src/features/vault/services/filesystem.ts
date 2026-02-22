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
        try: async () => {
          const isDirectory = await isDirectoryPath(newPath);
          if (!isDirectory) {
            return Promise.reject(new Error('Path is not a directory'));
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
          const file = Bun.file(fullPath);
          const exists = await file.exists();
          if (!exists) {
            return Promise.reject({ _tag: 'file_not_found' });
          }
          return file.text();
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
        try: async () => {
          const fullPath = resolvePath(relativePath);
          const dir = path.dirname(fullPath);
          const mkdirResult = await runCommand(['mkdir', '-p', dir]);
          if (mkdirResult.exitCode !== 0) {
            return Promise.reject(
              new Error(
                mkdirResult.stderr || `Failed to create directory: ${dir}`,
              ),
            );
          }
          await Bun.write(fullPath, content);
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
        try: async () => {
          const fullPath = resolvePath(relativePath);
          const isDirectory = await isDirectoryPath(fullPath);
          if (!isDirectory) {
            return [];
          }

          const files: string[] = [];
          for await (const file of new Bun.Glob('*').scan({
            cwd: fullPath,
            onlyFiles: true,
          })) {
            files.push(file);
          }

          return files;
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
          const mkdirResult = await runCommand(['mkdir', '-p', fullPath]);
          if (mkdirResult.exitCode !== 0) {
            return Promise.reject(
              new Error(
                mkdirResult.stderr ||
                  `Failed to create directory: ${relativePath}`,
              ),
            );
          }
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
          const rmResult = await runCommand(['rm', fullPath]);
          if (rmResult.exitCode !== 0) {
            return Promise.reject(
              new Error(
                rmResult.stderr || `Failed to delete file: ${fullPath}`,
              ),
            );
          }
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
