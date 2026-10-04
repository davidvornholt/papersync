import { Schema } from 'effect';
export class ImportError extends Schema.TaggedError<ImportError>()(
  'ImportError',
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}
