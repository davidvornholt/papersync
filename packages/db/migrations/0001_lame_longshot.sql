CREATE TABLE "school_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"revision" text NOT NULL
);
