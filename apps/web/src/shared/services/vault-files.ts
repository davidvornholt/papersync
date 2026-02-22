export {
  generateOverviewContent,
  getConfigPath,
  getOverviewPath,
  getSubjectsPath,
  getTimetablePath,
  getWeeklyNotePath,
  initializeVault,
  parseWeeklyNoteMarkdown,
  readConfig,
  readSubjects,
  readTimetable,
  readWeeklyNote,
  serializeWeeklyNoteToMarkdown,
  type TimetableConfig,
  writeConfig,
  writeSubjects,
  writeTimetable,
  writeWeeklyNote,
} from '@/features/vault/services/config';

export {
  makeLocalVaultLayer,
  VaultError,
  VaultFileNotFoundError,
  VaultService,
  type VaultService as VaultServiceContract,
} from '@/features/vault/services/filesystem';
