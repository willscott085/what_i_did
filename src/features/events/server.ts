import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import z from "zod";
import { db } from "~/db";
import { items, itemTags } from "~/db/schema";
import type { Event } from "./types";

/** Map a relational query result to the Event shape */
function toEvent(
  r: typeof items.$inferSelect & {
    itemTags: { tag: { id: string; name: string } }[];
  },
): Event {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    date: r.date,
    sortOrder: r.sortOrder,
    userId: r.userId,
    dateCreated: r.dateCreated,
    dateUpdated: r.dateUpdated,
    tags: r.itemTags
      .map((it) => ({ id: it.tag.id, name: it.tag.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// ─── List & Fetch ────────────────────────────────────────────────────

export const fetchEvents = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const results = await db.query.items.findMany({
      where: and(eq(items.userId, data.userId), eq(items.type, "event")),
      orderBy: [desc(items.dateCreated)],
      with: { itemTags: { with: { tag: true } } },
    });
    return results.map(toEvent);
  });

export const fetchEventsForDate = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .handler(async ({ data }) => {
    const results = await db.query.items.findMany({
      where: and(
        eq(items.userId, data.userId),
        eq(items.type, "event"),
        eq(items.date, data.date),
      ),
      orderBy: [asc(items.sortOrder)],
      with: { itemTags: { with: { tag: true } } },
    });
    return results.map(toEvent);
  });

export const fetchEventsByTag = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      tagId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    // Step 1: find event IDs that have this tag
    const matchingIds = await db
      .select({ id: items.id })
      .from(items)
      .innerJoin(itemTags, eq(itemTags.itemId, items.id))
      .where(
        and(
          eq(items.userId, data.userId),
          eq(items.type, "event"),
          eq(itemTags.tagId, data.tagId),
        ),
      );

    if (matchingIds.length === 0) return [];

    // Step 2: fetch those events with all their tags eagerly loaded
    const results = await db.query.items.findMany({
      where: inArray(
        items.id,
        matchingIds.map((r) => r.id),
      ),
      orderBy: [desc(items.dateCreated)],
      with: { itemTags: { with: { tag: true } } },
    });
    return results.map(toEvent);
  });

export const fetchEvent = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      eventId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const result = await db.query.items.findFirst({
      where: and(
        eq(items.id, data.eventId),
        eq(items.userId, data.userId),
        eq(items.type, "event"),
      ),
      with: {
        itemTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    if (!result) return null;

    return {
      ...toEvent(result),
      tags: result.itemTags.map((it) => it.tag),
    };
  });

// ─── Create ──────────────────────────────────────────────────────────

export const createEvent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1).max(255),
      content: z.string().max(1000).optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      tagIds: z.array(z.string()).optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const id = `evt_${crypto.randomUUID()}`;
    console.info(`Creating event "${data.title}" (${id})...`);
    const now = new Date().toISOString();

    const result = await db.transaction(async (tx) => {
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
          id,
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
          .values(data.tagIds.map((tagId) => ({ itemId: id, tagId })));
      }

      return eventResult;
    });

    return result;
  });

// ─── Update ──────────────────────────────────────────────────────────

export const updateEvent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1).max(255).optional(),
      content: z.string().max(1000).or(z.null()).optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .or(z.null())
        .optional(),
      tagIds: z.array(z.string()).optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating event ${data.id}...`);

    const { id, userId, tagIds, ...updates } = data;

    const result = await db.transaction(async (tx) => {
      const [eventResult] = await tx
        .update(items)
        .set({ ...updates, dateUpdated: new Date().toISOString() })
        .where(
          and(
            eq(items.id, id),
            eq(items.userId, userId),
            eq(items.type, "event"),
          ),
        )
        .returning();

      if (eventResult && tagIds !== undefined) {
        await tx.delete(itemTags).where(eq(itemTags.itemId, id));

        if (tagIds.length > 0) {
          await tx
            .insert(itemTags)
            .values(tagIds.map((tagId) => ({ itemId: id, tagId })));
        }
      }

      return eventResult;
    });

    return result;
  });

// ─── Delete ──────────────────────────────────────────────────────────

export const deleteEvent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      eventId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Deleting event ${data.eventId}...`);

    await db
      .delete(items)
      .where(
        and(
          eq(items.id, data.eventId),
          eq(items.userId, data.userId),
          eq(items.type, "event"),
        ),
      );
  });
