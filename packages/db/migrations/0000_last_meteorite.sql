CREATE TABLE "homework" (
	"id" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"revision" text NOT NULL,
	"imported_revision" text,
	"imported_task_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL
);
