import { Schema } from 'effect';
export class RequestValidationError extends Schema.TaggedError<RequestValidationError>()(
  'RequestValidationError',
  { message: Schema.String, status: Schema.Number },
) {}
export class PdfGenerationError extends Schema.TaggedError<PdfGenerationError>()(
  'PdfGenerationError',
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}
