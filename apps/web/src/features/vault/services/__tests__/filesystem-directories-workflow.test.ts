import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { makeLocalVaultLayer, VaultService } from '../filesystem';
import {
  cleanupTestVaultPath,
  ensureDirectory,
  isDirectory,
  joinPath,
  setupTestVaultPath,
} from './filesystem-test-helpers';

describe('Local Filesystem VaultService directory and workflow behavior', () => {
  let testVaultPath = '';

  beforeEach(async () => {
    testVaultPath = await setupTestVaultPath();
  });

  afterEach(async () => {
    await cleanupTestVaultPath(testVaultPath);
  });

  describe('ensureDirectory', () => {
    it('should create a new directory', async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.ensureDirectory('new-directory');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await Effect.runPromise(program);
      expect(await isDirectory(joinPath(testVaultPath, 'new-directory'))).toBe(
        true,
      );
    });

    it('should create nested directories', async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.ensureDirectory('deep/nested/directory');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await Effect.runPromise(program);
      expect(
        await isDirectory(joinPath(testVaultPath, 'deep/nested/directory')),
      ).toBe(true);
    });

    it('should succeed if directory already exists', async () => {
      await ensureDirectory(joinPath(testVaultPath, 'existing-dir'));

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.ensureDirectory('existing-dir');
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await Effect.runPromise(program);
    });
  });

  describe('end-to-end workflow', () => {
    it('should support full vault initialization workflow', async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;

        yield* vault.ensureDirectory('PaperSync/.papersync');
        yield* vault.ensureDirectory('PaperSync/Weekly');

        yield* vault.writeFile(
          'PaperSync/.papersync/config.json',
          JSON.stringify({ vaultPath: testVaultPath }, null, 2),
        );

        const configExists = yield* vault.fileExists(
          'PaperSync/.papersync/config.json',
        );
        expect(configExists).toBe(true);

        const configContent = yield* vault.readFile(
          'PaperSync/.papersync/config.json',
        );
        const config = JSON.parse(configContent);
        expect(config.vaultPath).toBe(testVaultPath);

        yield* vault.writeFile(
          'PaperSync/Weekly/2026-W05.md',
          '# Week 5\n\n## Monday\n- [ ] Task 1',
        );

        const weeklyNotes = yield* vault.listFiles('PaperSync/Weekly');
        expect(weeklyNotes).toContain('2026-W05.md');

        return 'success';
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toBe('success');
    });
  });
});
