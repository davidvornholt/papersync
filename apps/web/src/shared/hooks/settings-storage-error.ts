import { Data } from 'effect';
export class SettingsStorageError extends Data.TaggedError(
  'SettingsStorageError',
)<{ readonly message: string }> {}
