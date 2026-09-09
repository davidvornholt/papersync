import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
export const homework = pgTable('homework', {
  id: text('id').primaryKey(),
  payload: jsonb('payload').notNull(),
  revision: text('revision').notNull(),
  importedRevision: text('imported_revision'),
  importedTaskId: text('imported_task_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const integration = pgTable('integration', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull(),
});
