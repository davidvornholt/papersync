import { afterEach, beforeEach, expect, it } from 'bun:test';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { Effect } from 'effect';
import type { WeekId } from '@/shared/types/schemas';
import {
  cleanupTestVaultPath,
  joinPath,
  setupTestVaultPath,
  writeTextFile,
} from '../../services/__tests__/filesystem-test-helpers';
import { syncToLocalVaultEffect } from '../sync-local-effect';

const unreadableMode = 0;
const ownerReadWriteMode = 0o600;
const weekId = '2026-W05' as WeekId;
const entry = {
  id: 'entry-1',
  day: 'Monday',
  subject: 'Math',
  content: 'Finish worksheet',
  isTask: true,
  isCompleted: false,
  isNew: true,
};
let vaultPath = '';
beforeEach(async () => {
  vaultPath = await setupTestVaultPath();
});
afterEach(async () => {
  await cleanupTestVaultPath(vaultPath);
});

it('concurrent local scans keep both sets of homework', async () => {
  const second = { ...entry, content: 'Read chapter 3' };
  const paths = await Effect.runPromise(
    Effect.all(
      [
        syncToLocalVaultEffect([entry], vaultPath, weekId),
        syncToLocalVaultEffect([second], vaultPath, weekId),
      ],
      { concurrency: 'unbounded' },
    ),
  );
  const content = await readFile(joinPath(vaultPath, paths[0]), 'utf8');
  expect(content).toContain(entry.content);
  expect(content).toContain(second.content);
});

it('a failed read cannot overwrite the existing note', async () => {
  const notePath = joinPath(vaultPath, 'PaperSync/Weekly/2026-W05.md');
  const existing = 'Original homework must survive';
  await writeTextFile(notePath, existing);
  await chmod(notePath, unreadableMode);
  const result = await Effect.runPromise(
    syncToLocalVaultEffect([entry], vaultPath, weekId).pipe(Effect.either),
  );
  await chmod(notePath, ownerReadWriteMode);
  expect(result._tag).toBe('Left');
  expect(await readFile(notePath, 'utf8')).toBe(existing);
});

it('a file cannot be selected as the vault directory', async () => {
  const filePath = joinPath(vaultPath, 'file.txt');
  await writeFile(filePath, 'test');
  const error = await Effect.runPromise(
    syncToLocalVaultEffect([entry], filePath, weekId).pipe(Effect.flip),
  );
  expect(error.message).toContain('Failed to set vault path');
});
