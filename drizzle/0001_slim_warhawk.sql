ALTER TABLE "tags" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "date_created" text;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "updated_at" text;--> statement-breakpoint
UPDATE "tags" SET "date_created" = NOW()::text, "updated_at" = NOW()::text WHERE "date_created" IS NULL;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "date_created" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "updated_at" SET NOT NULL;