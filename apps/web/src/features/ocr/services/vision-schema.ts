import { JSONSchema, Schema } from '@effect/schema';

const OCREntrySchema = Schema.Struct({
  day: Schema.String,
  subject: Schema.String,
  content: Schema.String,
  is_task: Schema.Boolean,
  due_date: Schema.optional(Schema.String),
});

export const OCRResponseSchema = Schema.Struct({
  entries: Schema.Array(OCREntrySchema),
  confidence: Schema.Number,
  notes: Schema.optional(Schema.String),
});

export const OCRResponseJsonSchema = JSONSchema.make(OCRResponseSchema);
