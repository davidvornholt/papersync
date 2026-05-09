import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { Effect } from 'effect';
import type { WeekId } from '@/shared/types';
import { syncToLocalVaultEffect } from '../sync-local-effect';

const runCommand = async (cmd: string[]): Promise<void> => {
  const process = Bun.spawn(cmd, {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [exitCode, stderr] = await Promise.all([
    process.exited,
    new Response(process.stderr).text(),
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr);
  }
};

const createEntries = () =>
  [
    {
      id: 'entry-1',
      day: 'Monday',
      subject: 'Math',
      content: 'Finish worksheet',
      isTask: true,
      isCompleted: false,
      isNew: true,
    },
  ] as const;

describe('syncToLocalVaultEffect', () => {
  let testVaultPath = '';

  beforeEach(async () => {
    const tmpRoot = Bun.env.TMPDIR ?? '/tmp';
    testVaultPath = path.join(tmpRoot, `papersync-sync-${randomUUID()}`);
    await runCommand(['mkdir', '-p', testVaultPath]);
  });

  afterEach(async () => {
    if (testVaultPath) {
      await runCommand(['rm', '-rf', testVaultPath]);
    }
  });

  it('writes weekly note to local vault when path is a directory', async () => {
    const weekId = '2026-W05' as WeekId;
    const notePath = await Effect.runPromise(
      syncToLocalVaultEffect(createEntries(), testVaultPath, weekId),
    );

    expect(notePath).toBe('PaperSync/Weekly/2026-W05.md');
    const noteExists = await Bun.file(
      path.join(testVaultPath, notePath),
    ).exists();
    expect(noteExists).toBe(true);
  });

  it('fails with a clear error when vault path is not a directory', async () => {
    const filePath = path.join(testVaultPath, 'not-a-directory.txt');
    await Bun.write(filePath, 'test');

    const error = await Effect.runPromise(
      syncToLocalVaultEffect(
        createEntries(),
        filePath,
        '2026-W05' as WeekId,
      ).pipe(Effect.flip),
    );

    expect(error.message).toContain('Failed to set vault path');
  });
});
