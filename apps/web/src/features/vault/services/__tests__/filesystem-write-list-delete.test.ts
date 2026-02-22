import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { makeLocalVaultLayer, VaultService } from '../filesystem';
import {
  cleanupTestVaultPath,
  ensureDirectory,
  joinPath,
  pathExists,
  readTextFile,
  setupTestVaultPath,
  writeTextFile,
} from './filesystem-test-helpers';

describe('Local Filesystem VaultService write/list/delete behavior', () => {
  let testVaultPath = '';

  beforeEach(async () => {
    testVaultPath = await setupTestVaultPath();
  });

  afterEach(async () => {
    await cleanupTestVaultPath(testVaultPath);
  });

  describe('writeFile', () => {
    it('should write a new file', async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.writeFile('new-file.md', 'new content');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await Effect.runPromise(program);
      const content = await readTextFile(
        joinPath(testVaultPath, 'new-file.md'),
      );
      expect(content).toBe('new content');
    });

    it('should create nested directories', async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.writeFile('new/nested/path/note.md', 'nested content');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await Effect.runPromise(program);
      const content = await readTextFile(
        joinPath(testVaultPath, 'new/nested/path/note.md'),
      );
      expect(content).toBe('nested content');
    });

    it('should overwrite existing file', async () => {
      await writeTextFile(
        joinPath(testVaultPath, 'existing.md'),
        'old content',
      );

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.writeFile('existing.md', 'new content');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await Effect.runPromise(program);
      const content = await readTextFile(
        joinPath(testVaultPath, 'existing.md'),
      );
      expect(content).toBe('new content');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      await writeTextFile(joinPath(testVaultPath, 'exists.md'), 'content');

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.fileExists('exists.md');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.fileExists('does-not-exist.md');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toBe(false);
    });
  });

  describe('listFiles', () => {
    it('should list files in a directory', async () => {
      await writeTextFile(joinPath(testVaultPath, 'file1.md'), '');
      await writeTextFile(joinPath(testVaultPath, 'file2.md'), '');
      await ensureDirectory(joinPath(testVaultPath, 'subdir'));

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.listFiles('.');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toContain('file1.md');
      expect(result).toContain('file2.md');
      expect(result).not.toContain('subdir');
    });

    it('should return empty array for non-existent directory', async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.listFiles('non-existent');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toEqual([]);
    });
  });

  describe('deleteFile', () => {
    it('should delete an existing file', async () => {
      const filePath = joinPath(testVaultPath, 'to-delete.md');
      await writeTextFile(filePath, 'content');

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.deleteFile('to-delete.md');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await Effect.runPromise(program);
      expect(await pathExists(filePath)).toBe(false);
    });

    it('should fail for non-existent file', async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.deleteFile('does-not-exist.md');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });
  });
});
