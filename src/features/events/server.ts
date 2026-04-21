import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import z from "zod";
import { db } from "~/db";
import { items, itemTags } from "~/db/schema";

const eventColumns = {
  id: items.id,
  title: items.title,
  content: items.content,
  date: items.date,
  sortOrder: items.sortOrder,
  userId: items.userId,
  dateCreated: items.dateCreated,
  dateUpdated: items.dateUpdated,
  tags: sql<
    { id: string; name: string }[]
  >`(SELECT COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name) ORDER BY t.name), '[]') FROM item_tags it JOIN tags t ON t.id = it.tag_id WHERE it.item_id = "items"."id")`.as(
    "tags",
  ),
};

// ─── List & Fetch ────────────────────────────────────────────────────

export const fetchEvents = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    return db
      .select(eventColumns)
      .from(items)
      .where(and(eq(items.userId, data.userId), eq(items.type, "event")))
      .orderBy(desc(items.dateCreated));
  });

export const fetchEventsForDate = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .handler(async ({ data }) => {
    return db
      .select(eventColumns)
      .from(items)
      .where(
        and(
          eq(items.userId, data.userId),
          eq(items.type, "event"),
          eq(items.date, data.date),
        ),
      )
      .orderBy(asc(items.sortOrder));
  });

export const fetchEventsByTag = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      tagId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    return db
      .select(eventColumns)
      .from(items)
      .innerJoin(itemTags, eq(itemTags.itemId, items.id))
      .where(
        and(
          eq(items.userId, data.userId),
          eq(items.type, "event"),
          eq(itemTags.tagId, data.tagId),
        ),
      )
      .orderBy(desc(items.dateCreated));
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
      ...result,
      content: result.content ?? null,
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
    console.info("Creating event...");

    const id = `evt_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const result = await db.transaction(async (tx) => {
      const [maxRow] = await tx
        .select({ max: sql<string | null>`MAX(${items.sortOrder})` })
        .from(items)
        .where(and(eq(items.userId, data.userId), eq(items.type, "event")));

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
