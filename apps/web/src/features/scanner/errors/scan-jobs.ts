import { Schema } from 'effect';
export class ScanRequestError extends Schema.TaggedError<ScanRequestError>()(
  'ScanRequestError',
  { message: Schema.String, status: Schema.Number },
) {}
export class ScanJobNotFoundError extends Schema.TaggedError<ScanJobNotFoundError>()(
  'ScanJobNotFoundError',
  { message: Schema.String },
) {}
