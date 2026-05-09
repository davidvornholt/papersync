import { randomUUID } from 'node:crypto';
import * as path from 'node:path';

const runCommand = async (
  cmd: string[],
): Promise<{
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}> => {
  const process = Bun.spawn(cmd, {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);

  return { exitCode, stdout, stderr };
};

export const ensureDirectory = async (directoryPath: string): Promise<void> => {
  const result = await runCommand(['mkdir', '-p', directoryPath]);
  if (result.exitCode !== 0) {
    return Promise.reject(new Error(result.stderr));
  }
};

export const setupTestVaultPath = async (): Promise<string> => {
  const tmpRoot = Bun.env.TMPDIR ?? '/tmp';
  const testVaultPath = path.join(tmpRoot, `papersync-test-${randomUUID()}`);
  await ensureDirectory(testVaultPath);
  return testVaultPath;
};

export const cleanupTestVaultPath = async (
  testVaultPath: string,
): Promise<void> => {
  await runCommand(['rm', '-rf', testVaultPath]);
};

export const writeTextFile = async (
  filePath: string,
  content: string,
): Promise<void> => {
  await ensureDirectory(path.dirname(filePath));
  await Bun.write(filePath, content);
};

export const readTextFile = async (filePath: string): Promise<string> =>
  Bun.file(filePath).text();

export const isDirectory = async (directoryPath: string): Promise<boolean> =>
  (await runCommand(['test', '-d', directoryPath])).exitCode === 0;

export const pathExists = async (targetPath: string): Promise<boolean> =>
  Bun.file(targetPath).exists() || isDirectory(targetPath);

export const joinPath = (...segments: ReadonlyArray<string>): string =>
  path.join(...segments);
