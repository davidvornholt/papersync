import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import {
  makeLocalVaultLayer,
  type VaultFileNotFoundError,
  VaultService,
} from '../filesystem';
import {
  cleanupTestVaultPath,
  joinPath,
  setupTestVaultPath,
  writeTextFile,
} from './filesystem-test-helpers';

describe('Local Filesystem VaultService path and read behavior', () => {
  let testVaultPath = '';

  beforeEach(async () => {
    testVaultPath = await setupTestVaultPath();
  });

  afterEach(async () => {
    await cleanupTestVaultPath(testVaultPath);
  });

  describe('setVaultPath', () => {
    it('should accept a valid directory path', async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.setVaultPath(testVaultPath);
        return yield* vault.getVaultPath();
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toBe(testVaultPath);
    });

    it('should reject a non-existent path', async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.setVaultPath('/non/existent/path/that/does/not/exist');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });

    it('should reject a file path (not a directory)', async () => {
      const filePath = joinPath(testVaultPath, 'test.txt');
      await writeTextFile(filePath, 'test content');

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.setVaultPath(filePath);
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });
  });

  describe('readFile', () => {
    it('should read an existing file', async () => {
      const content = 'Hello, PaperSync!';
      await writeTextFile(joinPath(testVaultPath, 'test.md'), content);

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.readFile('test.md');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toBe(content);
    });

    it('should return VaultFileNotFoundError for non-existent file', async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.readFile('does-not-exist.md');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)), Effect.flip);

      const error = await Effect.runPromise(program);
      expect(error._tag).toBe('VaultFileNotFoundError');
      expect((error as VaultFileNotFoundError).filePath).toBe(
        'does-not-exist.md',
      );
    });

    it('should read nested files', async () => {
      await writeTextFile(
        joinPath(testVaultPath, 'nested', 'deeply', 'note.md'),
        'nested content',
      );

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.readFile('nested/deeply/note.md');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toBe('nested content');
    });
  });
});
