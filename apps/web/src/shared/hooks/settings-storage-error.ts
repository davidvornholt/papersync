import { Schema } from 'effect';
export class SettingsStorageError extends Schema.TaggedError<SettingsStorageError>()(
  'SettingsStorageError',
  { message: Schema.String },
) {}
