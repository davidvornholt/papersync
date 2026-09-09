import { Effect } from 'effect';
import type { AppConfig, SubjectsConfig } from '@/shared/types/schemas';
import type { VaultError } from '@/shared/vault/errors/filesystem-errors';
import { VaultService } from '@/shared/vault/services/filesystem-contract';
import { writeConfig, writeSubjects } from './config-json';
import {
  CONFIG_DIR,
  getConfigPath,
  getSubjectsPath,
  PAPERSYNC_ROOT,
  WEEKLY_DIR,
} from './config-paths';
export const initializeVault = (): Effect.Effect<
  void,
  VaultError,
  VaultService
> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;

    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/${CONFIG_DIR}`);
    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/${WEEKLY_DIR}`);
    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/Tasks`);
    yield* vault.ensureDirectory(`${PAPERSYNC_ROOT}/Subjects`);

    const configExists = yield* vault.fileExists(getConfigPath());
    if (!configExists) {
      const defaultConfig: AppConfig = {
        vaultPath: '',
        vaultAccessMethod: 'local',
        aiProvider: 'google',
        subjectsPerDay: 4,
      };
      yield* writeConfig(defaultConfig);
    }

    const subjectsExist = yield* vault.fileExists(getSubjectsPath());
    if (!subjectsExist) {
      const defaultSubjects: SubjectsConfig = [
        { id: '1', name: 'Chemistry' },
        { id: '2', name: 'Literature' },
        { id: '3', name: 'Mathematics' },
        { id: '4', name: 'Physics' },
      ];
      yield* writeSubjects(defaultSubjects);
    }
  });
