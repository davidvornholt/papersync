import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
export const homework = pgTable('homework', {
  id: text('id').primaryKey(),
  payload: jsonb('payload').notNull(),
  revision: text('revision').notNull(),
  importedRevision: text('imported_revision'),
  importedTaskId: text('imported_task_id'),
  // The scan's reading of homework corrected before its first save.
  readingId: text('reading_id'),
  // The due date that the last reviewed scan of this homework read, NULL when
  // it read none. Only rows with a reading ID were read from a scan.
  readDueDate: text('read_due_date'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const integration = pgTable('integration', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull(),
});

export const schoolSettings = pgTable('school_settings', {
  id: text('id').primaryKey(),
  payload: jsonb('payload').notNull(),
  revision: text('revision').notNull(),
});
