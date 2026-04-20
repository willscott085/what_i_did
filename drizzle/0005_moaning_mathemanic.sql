-- Add ON DELETE CASCADE to items.parent_item_id self-reference
-- 0004 created the FK inline (unnamed), so Postgres named it "items_parent_item_id_fkey"
ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_parent_item_id_fkey";--> statement-breakpoint
ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_parent_item_id_items_id_fk";--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_parent_item_id_items_id_fk" FOREIGN KEY ("parent_item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;