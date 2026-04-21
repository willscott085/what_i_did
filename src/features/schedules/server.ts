import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { RRule } from "rrule";
import z from "zod";
import { db } from "~/db";
import { items, itemTags, schedules, scheduleHistory } from "~/db/schema";
import { SNOOZE_DURATIONS, type SnoozeDuration } from "./consts";
import { getNextOccurrence } from "./recurrence";
import type { Schedule, ScheduleWithItem } from "./types";

const isoDatetime = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), {
    message: "Must be a valid ISO-8601 datetime",
  });

const rruleString = z.string().refine(
  (v) => {
    try {
      RRule.fromString(v);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Must be a valid RRULE string" },
);

const toLocalDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ─── Helpers ─────────────────────────────────────────────────────────

function toSchedule(r: typeof schedules.$inferSelect): Schedule {
  return {
    id: r.id,
    itemId: r.itemId,
    reminderTime: r.reminderTime,
    rrule: r.rrule,
    snoozedUntil: r.snoozedUntil,
    cloneOnFire: r.cloneOnFire,
    status: r.status as Schedule["status"],
    dateCreated: r.dateCreated,
    dateUpdated: r.dateUpdated,
  };
}

function computeSnoozedUntil(duration: SnoozeDuration): string {
  if (duration === "tomorrow9am") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString();
  }
  const ms = SNOOZE_DURATIONS[duration] as number;
  return new Date(Date.now() + ms).toISOString();
}

const effectiveFireTime = sql`COALESCE(${schedules.snoozedUntil}, ${schedules.reminderTime})`;

// ─── Fetch ───────────────────────────────────────────────────────────

export const fetchSchedules = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const results = await db
      .select({
        schedule: schedules,
        itemTitle: items.title,
        itemType: items.type,
      })
      .from(schedules)
      .innerJoin(items, eq(items.id, schedules.itemId))
      .where(
        and(
          eq(items.userId, data.userId),
          inArray(schedules.status, ["active", "snoozed"]),
        ),
      )
      .orderBy(asc(effectiveFireTime));

    return results.map(
      (r): ScheduleWithItem => ({
        ...toSchedule(r.schedule),
        itemTitle: r.itemTitle,
        itemType: r.itemType,
      }),
    );
  });

export const fetchUpcomingSchedules = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      limit: z.number().int().min(1).max(100).default(20),
    }),
  )
  .handler(async ({ data }) => {
    const now = new Date().toISOString();

    const results = await db
      .select({
        schedule: schedules,
        itemTitle: items.title,
        itemType: items.type,
      })
      .from(schedules)
      .innerJoin(items, eq(items.id, schedules.itemId))
      .where(
        and(
          eq(items.userId, data.userId),
          inArray(schedules.status, ["active", "snoozed"]),
          gt(effectiveFireTime, now),
        ),
      )
      .orderBy(asc(effectiveFireTime))
      .limit(data.limit);

    return results.map(
      (r): ScheduleWithItem => ({
        ...toSchedule(r.schedule),
        itemTitle: r.itemTitle,
        itemType: r.itemType,
      }),
    );
  });

export const fetchSchedulesForItem = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      itemId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const results = await db
      .select()
      .from(schedules)
      .innerJoin(items, eq(items.id, schedules.itemId))
      .where(
        and(eq(schedules.itemId, data.itemId), eq(items.userId, data.userId)),
      )
      .orderBy(asc(schedules.reminderTime));

    return results.map((r) => toSchedule(r.schedules));
  });

export const fetchSchedule = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      scheduleId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const [result] = await db
      .select()
      .from(schedules)
      .innerJoin(items, eq(items.id, schedules.itemId))
      .where(
        and(eq(schedules.id, data.scheduleId), eq(items.userId, data.userId)),
      );

    if (!result) return null;
    return toSchedule(result.schedules);
  });

// ─── Create ──────────────────────────────────────────────────────────

export const createSchedule = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      itemId: z.string().min(1),
      reminderTime: isoDatetime,
      rrule: rruleString.optional(),
      cloneOnFire: z.boolean().optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const id = `sch_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    console.info(`Creating schedule ${id} for item ${data.itemId}...`);

    // Verify the item belongs to the user
    const [owned] = await db
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.id, data.itemId), eq(items.userId, data.userId)));

    if (!owned) throw new Error("Item not found");

    const [result] = await db
      .insert(schedules)
      .values({
        id,
        itemId: data.itemId,
        reminderTime: data.reminderTime,
        rrule: data.rrule ?? null,
        snoozedUntil: null,
        cloneOnFire: data.cloneOnFire ?? false,
        status: "active",
        dateCreated: now,
        dateUpdated: now,
      })
      .returning();

    return toSchedule(result);
  });

// ─── Update ──────────────────────────────────────────────────────────

export const updateSchedule = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      reminderTime: isoDatetime.optional(),
      rrule: rruleString.or(z.null()).optional(),
      cloneOnFire: z.boolean().optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating schedule ${data.id}...`);
    const { id, userId, ...updates } = data;

    // Verify the schedule belongs to the user
    const [owned] = await db
      .select({ id: schedules.id })
      .from(schedules)
      .innerJoin(items, eq(items.id, schedules.itemId))
      .where(and(eq(schedules.id, id), eq(items.userId, userId)));

    if (!owned) return null;

    const [result] = await db
      .update(schedules)
      .set({ ...updates, dateUpdated: new Date().toISOString() })
      .where(eq(schedules.id, id))
      .returning();

    return result ? toSchedule(result) : null;
  });

// ─── Delete ──────────────────────────────────────────────────────────

export const deleteSchedule = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      scheduleId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Deleting schedule ${data.scheduleId}...`);

    // Verify the schedule belongs to the user
    const [owned] = await db
      .select({ id: schedules.id })
      .from(schedules)
      .innerJoin(items, eq(items.id, schedules.itemId))
      .where(
        and(eq(schedules.id, data.scheduleId), eq(items.userId, data.userId)),
      );

    if (!owned) return;

    await db.delete(schedules).where(eq(schedules.id, data.scheduleId));
  });

// ─── Snooze ──────────────────────────────────────────────────────────

export const snoozeSchedule = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      scheduleId: z.string().min(1),
      duration: z.enum(["5m", "15m", "1h", "tomorrow9am"]),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const snoozedUntil = computeSnoozedUntil(data.duration);
    const now = new Date().toISOString();
    console.info(
      `Snoozing schedule ${data.scheduleId} until ${snoozedUntil}...`,
    );

    // Verify the schedule belongs to the user
    const [owned] = await db
      .select({ id: schedules.id })
      .from(schedules)
      .innerJoin(items, eq(items.id, schedules.itemId))
      .where(
        and(eq(schedules.id, data.scheduleId), eq(items.userId, data.userId)),
      );

    if (!owned) return null;

    const [result] = await db
      .update(schedules)
      .set({
        snoozedUntil,
        status: "snoozed",
        dateUpdated: now,
      })
      .where(eq(schedules.id, data.scheduleId))
      .returning();

    if (result) {
      await db.insert(scheduleHistory).values({
        id: `shx_${crypto.randomUUID()}`,
        scheduleId: data.scheduleId,
        firedAt: now,
        action: "snoozed",
        createdItemId: null,
      });
    }

    return result ? toSchedule(result) : null;
  });

// ─── Dismiss ─────────────────────────────────────────────────────────

export const dismissSchedule = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      scheduleId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    console.info(`Dismissing schedule ${data.scheduleId}...`);

    // Verify the schedule belongs to the user
    const [current] = await db
      .select({ schedule: schedules })
      .from(schedules)
      .innerJoin(items, eq(items.id, schedules.itemId))
      .where(
        and(eq(schedules.id, data.scheduleId), eq(items.userId, data.userId)),
      );

    if (!current) return null;

    const userOwnsSchedule = sql`EXISTS (SELECT 1 FROM ${items} WHERE ${items.id} = ${schedules.itemId} AND ${items.userId} = ${data.userId})`;

    // Recurring: advance to next occurrence
    if (current.schedule.rrule) {
      const afterDate = new Date(
        Math.max(Date.parse(current.schedule.reminderTime), Date.now()),
      );
      const nextDate = getNextOccurrence(current.schedule.rrule, afterDate);
      if (nextDate) {
        const result = await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(schedules)
            .set({
              reminderTime: nextDate.toISOString(),
              snoozedUntil: null,
              status: "active",
              dateUpdated: now,
            })
            .where(and(eq(schedules.id, data.scheduleId), userOwnsSchedule))
            .returning();

          if (updated) {
            await tx.insert(scheduleHistory).values({
              id: `shx_${crypto.randomUUID()}`,
              scheduleId: data.scheduleId,
              firedAt: now,
              action: "dismissed",
              createdItemId: null,
            });
          }

          return updated;
        });

        return result ? toSchedule(result) : null;
      }
    }

    // One-off: mark as dismissed
    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schedules)
        .set({
          status: "dismissed",
          snoozedUntil: null,
          dateUpdated: now,
        })
        .where(and(eq(schedules.id, data.scheduleId), userOwnsSchedule))
        .returning();

      if (updated) {
        await tx.insert(scheduleHistory).values({
          id: `shx_${crypto.randomUUID()}`,
          scheduleId: data.scheduleId,
          firedAt: now,
          action: "dismissed",
          createdItemId: null,
        });
      }

      return updated;
    });

    return result ? toSchedule(result) : null;
  });

// ─── Fire ────────────────────────────────────────────────────────────

export const fireSchedule = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      scheduleId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    const todayStr = toLocalDateString(new Date());
    console.info(`Firing schedule ${data.scheduleId}...`);

    const [current] = await db
      .select()
      .from(schedules)
      .innerJoin(items, eq(items.id, schedules.itemId))
      .where(
        and(eq(schedules.id, data.scheduleId), eq(items.userId, data.userId)),
      );

    if (!current) return { fired: false, createdItemId: null };

    const schedule = current.schedules;
    const item = current.items;

    let createdItemId: string | null = null;

    // If cloneOnFire, create a new task from the parent item
    if (schedule.cloneOnFire) {
      createdItemId = `tsk_${crypto.randomUUID()}`;

      await db.transaction(async (tx) => {
        // Get max sort order for today's tasks
        const [maxRow] = await tx
          .select({ max: sql<string | null>`MAX(${items.sortOrder})` })
          .from(items)
          .where(
            and(
              eq(items.userId, data.userId),
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
          userId: data.userId,
          dateCreated: now,
          dateUpdated: now,
        });

        // Copy tags from parent item
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
    }

    // Log to history
    await db.insert(scheduleHistory).values({
      id: `shx_${crypto.randomUUID()}`,
      scheduleId: data.scheduleId,
      firedAt: now,
      action: schedule.cloneOnFire ? "task_created" : "notified",
      createdItemId,
    });

    // Advance recurring or complete one-off
    if (schedule.rrule) {
      const afterDate = new Date(
        Math.max(Date.parse(schedule.reminderTime), Date.now()),
      );
      const nextDate = getNextOccurrence(schedule.rrule, afterDate);
      const userOwnsSchedule = sql`EXISTS (SELECT 1 FROM ${items} WHERE ${items.id} = ${schedules.itemId} AND ${items.userId} = ${data.userId})`;

      if (nextDate) {
        await db
          .update(schedules)
          .set({
            reminderTime: nextDate.toISOString(),
            snoozedUntil: null,
            status: "active",
            dateUpdated: now,
          })
          .where(and(eq(schedules.id, data.scheduleId), userOwnsSchedule));
      } else {
        // No more occurrences — complete
        await db
          .update(schedules)
          .set({ status: "completed", dateUpdated: now })
          .where(and(eq(schedules.id, data.scheduleId), userOwnsSchedule));
      }
    } else {
      const userOwnsSchedule = sql`EXISTS (SELECT 1 FROM ${items} WHERE ${items.id} = ${schedules.itemId} AND ${items.userId} = ${data.userId})`;

      // One-off — mark completed
      await db
        .update(schedules)
        .set({ status: "completed", dateUpdated: now })
        .where(and(eq(schedules.id, data.scheduleId), userOwnsSchedule));
    }

    return { fired: true, createdItemId };
  });

// ─── Convenience: Create Event + Schedule ────────────────────────────

export const createEventWithSchedule = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1).max(255),
      content: z.string().max(1000).optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      tagIds: z.array(z.string()).optional(),
      reminderTime: isoDatetime,
      rrule: rruleString.optional(),
      cloneOnFire: z.boolean().optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const eventId = `evt_${crypto.randomUUID()}`;
    const scheduleId = `sch_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    console.info(
      `Creating event+schedule "${data.title}" (${eventId}, ${scheduleId})...`,
    );

    const result = await db.transaction(async (tx) => {
      // Create event item
      const [maxRow] = await tx
        .select({ max: sql<string | null>`MAX(${items.sortOrder})` })
        .from(items)
        .where(
          and(
            eq(items.userId, data.userId),
            eq(items.type, "event"),
            data.date ? eq(items.date, data.date) : isNull(items.date),
          ),
        );

      const nextSortOrder = generateKeyBetween(maxRow?.max ?? null, null);

      const [eventResult] = await tx
        .insert(items)
        .values({
          id: eventId,
          type: "event",
          title: data.title,
          content: data.content ?? null,
          date: data.date ?? null,
          dateCompleted: null,
          parentItemId: null,
          sortOrder: nextSortOrder,
          userId: data.userId,
          dateCreated: now,
          dateUpdated: now,
        })
        .returning();

      if (data.tagIds && data.tagIds.length > 0) {
        await tx
          .insert(itemTags)
          .values(data.tagIds.map((tagId) => ({ itemId: eventId, tagId })));
      }

      // Create schedule
      const [scheduleResult] = await tx
        .insert(schedules)
        .values({
          id: scheduleId,
          itemId: eventId,
          reminderTime: data.reminderTime,
          rrule: data.rrule ?? null,
          snoozedUntil: null,
          cloneOnFire: data.cloneOnFire ?? false,
          status: "active",
          dateCreated: now,
          dateUpdated: now,
        })
        .returning();

      return { event: eventResult, schedule: toSchedule(scheduleResult) };
    });

    return result;
  });
