import { JSONSchema, Schema } from 'effect';
import { ISODate } from '@/shared/types/schemas';

const OCREntrySchema = Schema.Struct({
  day: Schema.String,
  subject: Schema.String,
  content: Schema.NonEmptyTrimmedString,
  isTask: Schema.Boolean,
  isCompleted: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  dueDate: Schema.optional(ISODate),
});
export const OCRResponseSchema = Schema.Struct({
  entries: Schema.Array(OCREntrySchema),
  confidence: Schema.Number.pipe(Schema.between(0, 1)),
  notes: Schema.optional(Schema.String),
});
export const OCRResponseJsonSchema = JSONSchema.make(OCRResponseSchema);
