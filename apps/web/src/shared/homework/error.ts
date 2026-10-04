import { Schema } from 'effect';
export class HomeworkError extends Schema.TaggedError<HomeworkError>()(
  'HomeworkError',
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}
