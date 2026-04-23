-- Remove deprecated schedule_history rows.
-- Prior versions wrote action='notified' (fired without creating a clone) and
-- action='snoozed' (a snooze event). These behaviors are no longer tracked;
-- the narrowed union is ('task_created' | 'dismissed'). Delete legacy rows so
-- the column matches the application type.
DELETE FROM "schedule_history" WHERE "action" IN ('notified', 'snoozed');--> statement-breakpoint
ALTER TABLE "schedule_history" DROP CONSTRAINT IF EXISTS "schedule_history_action_check";--> statement-breakpoint
ALTER TABLE "schedule_history" ADD CONSTRAINT "schedule_history_action_check" CHECK ("action" IN ('task_created', 'dismissed'));
