import { Schema } from 'effect';
export class ESCLError extends Schema.TaggedError<ESCLError>()('ESCLError', {
  message: Schema.String,
  statusCode: Schema.optional(Schema.Number),
  cause: Schema.optional(Schema.Defect()),
}) {}
export class ESCLCapabilitiesError extends Schema.TaggedError<ESCLCapabilitiesError>()(
  'ESCLCapabilitiesError',
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}
