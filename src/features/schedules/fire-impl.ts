import { and, eq, isNull, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { db } from "~/db";
import { items, itemTags, schedules, scheduleHistory } from "~/db/schema";
import { getNextOccurrence } from "./recurrence";

// Kept in its own module so `server.ts` can reach it via a dynamic import
// from inside the `fireSchedule` handler. tanstack-start strips handler
// bodies (and their imports) from the client bundle; a top-level re-export
// from `server.ts` would keep this code — and therefore `db` / `postgres` —
// in the browser build.

const toLocalDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Core fire logic, callable without a Start server-function request context.
 * Used by both the `fireSchedule` server fn (HTTP path) and the background
 * scheduler (no request context).
 */
export async function fireScheduleImpl(
  scheduleId: string,
  userId: string,
): Promise<{ fired: boolean; createdItemId: string | null }> {
  const now = new Date().toISOString();
  const todayStr = toLocalDateString(new Date());
  console.info(`Firing schedule ${scheduleId}...`);

  const [current] = await db
    .select()
    .from(schedules)
    .innerJoin(items, eq(items.id, schedules.itemId))
    .where(and(eq(schedules.id, scheduleId), eq(items.userId, userId)));

  if (!current) return { fired: false, createdItemId: null };

  const schedule = current.schedules;
  const item = current.items;

  let createdItemId: string | null = null;

  if (schedule.cloneOnFire) {
    createdItemId = `tsk_${crypto.randomUUID()}`;

    await db.transaction(async (tx) => {
      const [maxRow] = await tx
        .select({ max: sql<string | null>`MAX(${items.sortOrder})` })
        .from(items)
        .where(
          and(
            eq(items.userId, userId),
            eq(items.type, "task"),
            isNull(items.parentItemId),
            isNull(items.dateCompleted),
            eq(items.date, todayStr),
          ),
        );

      const nextSortOrder = generateKeyBetween(maxRow?.max ?? null, null);

      await tx.insert(items).values({
        id: createdItemId!,
        type: "task",
        title: item.title,
        content: item.content,
        date: todayStr,
        dateCompleted: null,
        parentItemId: null,
        sortOrder: nextSortOrder,
        userId,
        dateCreated: now,
        dateUpdated: now,
      });

      const parentTags = await tx
        .select({ tagId: itemTags.tagId })
        .from(itemTags)
        .where(eq(itemTags.itemId, item.id));

      if (parentTags.length > 0) {
        await tx.insert(itemTags).values(
          parentTags.map((t) => ({
            itemId: createdItemId!,
            tagId: t.tagId,
          })),
        );
      }
    });

    await db.insert(scheduleHistory).values({
      id: `shx_${crypto.randomUUID()}`,
      scheduleId,
      firedAt: now,
      action: "task_created",
      createdItemId,
    });
  }

  const userOwnsSchedule = sql`EXISTS (SELECT 1 FROM ${items} WHERE ${items.id} = ${schedules.itemId} AND ${items.userId} = ${userId})`;

  if (schedule.rrule) {
    const afterDate = new Date(
      Math.max(Date.parse(schedule.reminderTime), Date.now()),
    );
    const nextDate = getNextOccurrence(schedule.rrule, afterDate);

    if (nextDate) {
      await db
        .update(schedules)
        .set({
          reminderTime: nextDate.toISOString(),
          snoozedUntil: null,
          status: "active",
          dateUpdated: now,
        })
        .where(and(eq(schedules.id, scheduleId), userOwnsSchedule));
    } else {
      await db
        .update(schedules)
        .set({ status: "completed", dateUpdated: now })
        .where(and(eq(schedules.id, scheduleId), userOwnsSchedule));
    }
  } else {
    await db
      .update(schedules)
      .set({ status: "completed", dateUpdated: now })
      .where(and(eq(schedules.id, scheduleId), userOwnsSchedule));
  }

  return { fired: true, createdItemId };
}
