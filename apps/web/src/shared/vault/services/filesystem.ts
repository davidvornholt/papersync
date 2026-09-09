import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { Effect, Layer } from 'effect';
import {
  VaultError,
  VaultFileNotFoundError,
} from '@/shared/vault/errors/filesystem-errors';
import { VaultService } from './filesystem-contract';

const isMissing = (cause: unknown): boolean =>
  typeof cause === 'object' &&
  cause !== null &&
  'code' in cause &&
  cause.code === 'ENOENT';

const getVaultFilePath = (
  vaultPath: string,
  relativePath: string,
): Effect.Effect<string, VaultError> => {
  const resolved = path.resolve(vaultPath, relativePath);
  const relative = path.relative(vaultPath, resolved);
  return path.isAbsolute(relativePath) ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`)
    ? Effect.fail(
        new VaultError({
          message: 'Choose a path inside the configured vault.',
        }),
      )
    : Effect.succeed(resolved);
};

const createLocalVaultService = (initialPath: string): VaultService => {
  let vaultPath = path.resolve(initialPath);
  const getPath = (relativePath: string) =>
    getVaultFilePath(vaultPath, relativePath);
  const operation = <T>(
    relativePath: string,
    run: (fullPath: string) => Promise<T>,
  ) =>
    getPath(relativePath).pipe(
      Effect.flatMap((fullPath) =>
        Effect.tryPromise({
          try: () => run(fullPath),
          catch: (cause) =>
            new VaultError({
              message: `Vault operation failed for ${relativePath || '.'}. Check the path and permissions.`,
              cause,
            }),
        }),
      ),
    );

  return {
    getVaultPath: () => Effect.succeed(vaultPath),
    setVaultPath: (nextPath) =>
      Effect.gen(function* () {
        const info = yield* Effect.tryPromise({
          try: () => stat(nextPath),
          catch: (cause) =>
            new VaultError({
              message: `Cannot open vault: ${nextPath}`,
              cause,
            }),
        });
        if (!info.isDirectory()) {
          return yield* Effect.fail(
            new VaultError({
              message: `Failed to set vault path: ${nextPath}. Choose a directory.`,
            }),
          );
        }
        vaultPath = path.resolve(nextPath);
      }),
    readFile: (relativePath) =>
      getPath(relativePath).pipe(
        Effect.flatMap((fullPath) =>
          Effect.tryPromise({
            try: () => readFile(fullPath, 'utf8'),
            catch: (cause) =>
              isMissing(cause)
                ? new VaultFileNotFoundError({ filePath: relativePath })
                : new VaultError({
                    message: `Cannot read ${relativePath}. Check the file and permissions.`,
                    cause,
                  }),
          }),
        ),
      ),
    writeFile: (relativePath, content) =>
      getPath(relativePath).pipe(
        Effect.flatMap((fullPath) => {
          const temporaryPath = `${fullPath}.${crypto.randomUUID()}.tmp`;
          return Effect.gen(function* () {
            yield* operation(relativePath, () =>
              mkdir(path.dirname(fullPath), { recursive: true }),
            );
            yield* operation(relativePath, () =>
              writeFile(temporaryPath, content, { flag: 'wx' }),
            );
            yield* operation(relativePath, () =>
              rename(temporaryPath, fullPath),
            );
          }).pipe(
            Effect.ensuring(
              Effect.promise(() => rm(temporaryPath, { force: true })).pipe(
                Effect.catchAllCause(() => Effect.void),
              ),
            ),
          );
        }),
      ),
    fileExists: (relativePath) =>
      operation(relativePath, (fullPath) => stat(fullPath)).pipe(
        Effect.map((info) => info.isFile()),
        Effect.catchAll((error) =>
          isMissing(error.cause) ? Effect.succeed(false) : Effect.fail(error),
        ),
      ),
    listFiles: (relativePath) =>
      operation(relativePath, (fullPath) =>
        readdir(fullPath, { withFileTypes: true }),
      ).pipe(
        Effect.map((entries) =>
          entries.filter((entry) => entry.isFile()).map((entry) => entry.name),
        ),
        Effect.catchAll((error) =>
          isMissing(error.cause) ? Effect.succeed([]) : Effect.fail(error),
        ),
      ),
    ensureDirectory: (relativePath) =>
      operation(relativePath, (fullPath) =>
        mkdir(fullPath, { recursive: true }),
      ).pipe(Effect.asVoid),
    deleteFile: (relativePath) =>
      operation(relativePath, (fullPath) => rm(fullPath)),
  };
};

export const makeLocalVaultLayer = (vaultPath: string) =>
  Layer.succeed(VaultService, createLocalVaultService(vaultPath));
