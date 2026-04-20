ALTER TABLE "tasks" ALTER COLUMN "sort_order" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "sort_order" SET DEFAULT 'a0';--> statement-breakpoint

-- Backfill: convert integer sort_order values to fractional-indexing keys.
-- The library uses base-62 digits: 0-9 A-Z a-z (ASCII order).
-- We assign keys 'a0', 'a1', ... 'a9', 'aA', ... 'aZ', 'aa', ... 'az' sequentially.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY sort_order) - 1 AS idx
  FROM tasks
),
mapped AS (
  SELECT id,
    'a' || CASE
      WHEN idx < 10 THEN chr((48 + idx)::int)
      WHEN idx < 36 THEN chr((65 + idx - 10)::int)
      ELSE chr((97 + idx - 36)::int)
    END AS new_key
  FROM ordered
  WHERE idx < 62
)
UPDATE tasks SET sort_order = mapped.new_key FROM mapped WHERE tasks.id = mapped.id;