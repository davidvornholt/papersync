import { Schema } from 'effect';
export class VisionError extends Schema.TaggedError<VisionError>()(
  'VisionError',
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}
export class VisionValidationError extends Schema.TaggedError<VisionValidationError>()(
  'VisionValidationError',
  { message: Schema.String, raw: Schema.optional(Schema.String) },
) {}
export class VisionConfigurationError extends Schema.TaggedError<VisionConfigurationError>()(
  'VisionConfigurationError',
  { message: Schema.String },
) {}
