import { Schema } from 'effect';
export class ScanPageError extends Schema.TaggedError<ScanPageError>()(
  'ScanPageError',
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}
export class ScanJobRequestError extends Schema.TaggedError<ScanJobRequestError>()(
  'ScanJobRequestError',
  {
    message: Schema.String,
    status: Schema.optional(Schema.Number),
    cause: Schema.optional(Schema.Defect()),
  },
) {}
export class ScanJobMissingError extends Schema.TaggedError<ScanJobMissingError>()(
  'ScanJobMissingError',
  { message: Schema.String },
) {}
export class ScanDraftStoreError extends Schema.TaggedError<ScanDraftStoreError>()(
  'ScanDraftStoreError',
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}
