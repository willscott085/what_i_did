-- Migration: Unified Items Architecture
-- Migrates separate tasks/notes tables into a single items table.
-- Preserves all existing data.

-- 1. Create new tables
CREATE TABLE IF NOT EXISTS "items" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "content" text,
  "date" text,
  "date_completed" text,
  "parent_item_id" text,
  "sort_order" text NOT NULL DEFAULT 'a0',
  "user_id" text NOT NULL,
  "date_created" text NOT NULL,
  "date_updated" text NOT NULL,
  FOREIGN KEY ("parent_item_id") REFERENCES "items"("id")
);

CREATE TABLE IF NOT EXISTS "item_tags" (
  "item_id" text NOT NULL REFERENCES "items"("id") ON DELETE CASCADE,
  "tag_id" text NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  PRIMARY KEY ("item_id", "tag_id")
);

CREATE TABLE IF NOT EXISTS "item_metadata" (
  "item_id" text PRIMARY KEY NOT NULL REFERENCES "items"("id") ON DELETE CASCADE,
  "keywords" text,
  "embedding" bytea
);

CREATE TABLE IF NOT EXISTS "schedules" (
  "id" text PRIMARY KEY NOT NULL,
  "item_id" text NOT NULL REFERENCES "items"("id") ON DELETE CASCADE,
  "reminder_time" text NOT NULL,
  "rrule" text,
  "snoozed_until" text,
  "clone_on_fire" boolean NOT NULL DEFAULT false,
  "status" text NOT NULL DEFAULT 'active',
  "date_created" text NOT NULL,
  "date_updated" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "schedule_history" (
  "id" text PRIMARY KEY NOT NULL,
  "schedule_id" text NOT NULL REFERENCES "schedules"("id") ON DELETE CASCADE,
  "fired_at" text NOT NULL,
  "action" text NOT NULL,
  "created_item_id" text REFERENCES "items"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "date_created" text NOT NULL
);

-- 2. Copy tasks → items (root tasks first, then subtasks)
-- Root tasks (no parent)
INSERT INTO "items" ("id", "type", "title", "content", "date", "date_completed", "parent_item_id", "sort_order", "user_id", "date_created", "date_updated")
SELECT
  "id",
  'task',
  "title",
  "notes",
  "start_date",
  "date_completed",
  NULL,
  "sort_order",
  "user_id",
  "date_created",
  COALESCE("date_completed", "date_created")
FROM "tasks"
WHERE "parent_task_id" IS NULL;

-- Subtasks (parent already inserted)
INSERT INTO "items" ("id", "type", "title", "content", "date", "date_completed", "parent_item_id", "sort_order", "user_id", "date_created", "date_updated")
SELECT
  "id",
  'task',
  "title",
  "notes",
  "start_date",
  "date_completed",
  "parent_task_id",
  "sort_order",
  "user_id",
  "date_created",
  COALESCE("date_completed", "date_created")
FROM "tasks"
WHERE "parent_task_id" IS NOT NULL;

-- 3. Copy notes → items
INSERT INTO "items" ("id", "type", "title", "content", "date", "date_completed", "parent_item_id", "sort_order", "user_id", "date_created", "date_updated")
SELECT
  "id",
  'note',
  COALESCE("title", 'Untitled'),
  "content",
  "date",
  NULL,
  NULL,
  CAST("sort_order" AS text),
  "user_id",
  "date_created",
  "date_updated"
FROM "notes";

-- 4. Copy task_tags → item_tags
INSERT INTO "item_tags" ("item_id", "tag_id")
SELECT "task_id", "tag_id" FROM "task_tags";

-- 5. Copy note_tags → item_tags
INSERT INTO "item_tags" ("item_id", "tag_id")
SELECT "note_id", "tag_id" FROM "note_tags";

-- 6. Copy note_metadata → item_metadata
INSERT INTO "item_metadata" ("item_id", "keywords", "embedding")
SELECT "note_id", "keywords", "embedding" FROM "note_metadata";

-- 7. Drop old tables (order matters for FK constraints)
DROP TABLE IF EXISTS "note_metadata" CASCADE;
DROP TABLE IF EXISTS "note_tags" CASCADE;
DROP TABLE IF EXISTS "task_tags" CASCADE;
DROP TABLE IF EXISTS "notes" CASCADE;
DROP TABLE IF EXISTS "tasks" CASCADE;
