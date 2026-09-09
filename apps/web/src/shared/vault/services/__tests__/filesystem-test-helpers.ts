import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
export const ensureDirectory = (directoryPath: string) =>
  mkdir(directoryPath, { recursive: true });
export const setupTestVaultPath = () =>
  mkdtemp(path.join(tmpdir(), 'papersync-test-'));
export const cleanupTestVaultPath = (testVaultPath: string) =>
  rm(testVaultPath, { recursive: true, force: true });
export const writeTextFile = async (filePath: string, content: string) => {
  await ensureDirectory(path.dirname(filePath));
  await writeFile(filePath, content);
};
export const readTextFile = (filePath: string) => readFile(filePath, 'utf8');
export const isDirectory = (directoryPath: string) =>
  stat(directoryPath).then(
    (info) => info.isDirectory(),
    () => false,
  );
export const pathExists = (targetPath: string) =>
  stat(targetPath).then(
    () => true,
    () => false,
  );
export const joinPath = (...segments: ReadonlyArray<string>) =>
  path.join(...segments);
