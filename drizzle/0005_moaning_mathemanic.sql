-- Add ON DELETE CASCADE to items.parent_item_id self-reference
ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_parent_item_id_items_id_fk";--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_parent_item_id_items_id_fk" FOREIGN KEY ("parent_item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;