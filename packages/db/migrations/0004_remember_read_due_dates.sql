ALTER TABLE "homework" ADD COLUMN "read_due_date" text;--> statement-breakpoint
-- Which date their scan read is unknown, so take the saved date, which keeps
-- comparing a rescan with the saved date only, as before.
UPDATE "homework" SET "read_due_date" = "payload"->>'dueDate' WHERE "reading_id" IS NOT NULL;
