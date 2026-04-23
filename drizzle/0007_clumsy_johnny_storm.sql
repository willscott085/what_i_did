-- Drop any duplicate rows for the same endpoint before creating the
-- unique index. Keeps the most recently created row (ties broken by id).
-- Existing deployments with duplicates would otherwise fail the index
-- creation; new environments are a no-op.
DELETE FROM "push_subscriptions" a
USING "push_subscriptions" b
WHERE a."endpoint" = b."endpoint"
  AND (a."date_created", a."id") < (b."date_created", b."id");

CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");