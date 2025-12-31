CREATE TABLE "registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"registry_item" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
