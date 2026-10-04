import { JsonSchema, Schema } from 'effect';
import { ISODate, NonEmptyTrimmedString, WeekId } from '@/shared/types/schemas';

const OCREntrySchema = Schema.Struct({
  day: Schema.String,
  subject: Schema.String,
  content: NonEmptyTrimmedString,
  dueDate: Schema.NullOr(ISODate),
});
export const OCRResponseSchema = Schema.Struct({
  weekId: Schema.NullOr(WeekId),
  entries: Schema.Array(OCREntrySchema),
  confidence: Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1 })),
  notes: Schema.optionalKey(Schema.String),
});
const ocrResponseDocument = JsonSchema.toDocumentDraft07(
  Schema.toJsonSchemaDocument(OCRResponseSchema, {
    onExcessProperty: 'error',
  }),
);
const { definitions } = ocrResponseDocument;
export const OCRResponseJsonSchema = {
  $schema: JsonSchema.META_SCHEMA_URI_DRAFT_07,
  ...ocrResponseDocument.schema,
  ...(Object.keys(definitions).length > 0 ? { definitions } : {}),
};
