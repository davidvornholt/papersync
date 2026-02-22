import { Effect } from 'effect';
import type { AppConfig, SubjectsConfig } from '@/shared/types';
import {
  CONFIG_DIR,
  getConfigPath,
  getSubjectsPath,
  getTimetablePath,
  PAPERSYNC_ROOT,
} from './config-paths';
import {
  type VaultError,
  type VaultFileNotFoundError,
  VaultService,
} from './filesystem';

export type TimetableDayConfig = {
  readonly day: string;
  readonly slots: ReadonlyArray<{ id: string; subjectId: string }>;
};

export type TimetableConfig = ReadonlyArray<TimetableDayConfig>;

const readJsonIfExists = <T>(
  filePath: string,
  fallback: T,
): Effect.Effect<T, VaultFileNotFoundError | VaultError, VaultService> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const exists = yield* vault.fileExists(filePath);
    if (!exists) {
      return fallback;
    }
    const content = yield* vault.readFile(filePath);
    return JSON.parse(content) as T;
  });

const writeJsonToConfigDir = (
  filePath: string,
  value: unknown,
): Effect.Effect<void, VaultError, VaultService> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/${CONFIG_DIR}`);
    yield* vault.writeFile(filePath, JSON.stringify(value, null, 2));
  });

export const readConfig = (): Effect.Effect<
  AppConfig | null,
  VaultFileNotFoundError | VaultError,
  VaultService
> => readJsonIfExists(getConfigPath(), null);

export const writeConfig = (
  config: AppConfig,
): Effect.Effect<void, VaultError, VaultService> =>
  writeJsonToConfigDir(getConfigPath(), config);

export const readSubjects = (): Effect.Effect<
  SubjectsConfig,
  VaultFileNotFoundError | VaultError,
  VaultService
> => readJsonIfExists(getSubjectsPath(), []);

export const writeSubjects = (
  subjects: SubjectsConfig,
): Effect.Effect<void, VaultError, VaultService> =>
  writeJsonToConfigDir(getSubjectsPath(), subjects);

export const readTimetable = (): Effect.Effect<
  TimetableConfig,
  VaultFileNotFoundError | VaultError,
  VaultService
> => readJsonIfExists(getTimetablePath(), []);

export const writeTimetable = (
  timetable: TimetableConfig,
): Effect.Effect<void, VaultError, VaultService> =>
  writeJsonToConfigDir(getTimetablePath(), timetable);
