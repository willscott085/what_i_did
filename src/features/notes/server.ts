import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import z from "zod";
import { db } from "~/db";
import { items, itemTags, itemMetadata } from "~/db/schema";

const noteColumns = {
  id: items.id,
  content: sql<string>`COALESCE(${items.content}, '')`.as("content"),
  title: items.title,
  date: items.date,
  sortOrder: sql<number>`CAST(${items.sortOrder} AS integer)`.as("sort_order"),
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

export const fetchNotes = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(50),
    }),
  )
  .handler(async ({ data }) => {
    const offset = (data.page - 1) * data.limit;

    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(items)
      .where(and(eq(items.userId, data.userId), eq(items.type, "note")));

    const total = Number(countResult?.count ?? 0);

    const noteList = await db
      .select(noteColumns)
      .from(items)
      .where(and(eq(items.userId, data.userId), eq(items.type, "note")))
      .orderBy(desc(items.dateUpdated))
      .limit(data.limit)
      .offset(offset);

    return {
      notes: noteList,
      total,
      page: data.page,
      totalPages: Math.ceil(total / data.limit),
    };
  });

export const fetchNotesForDate = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .handler(async ({ data }) => {
    return db
      .select(noteColumns)
      .from(items)
      .where(
        and(
          eq(items.userId, data.userId),
          eq(items.type, "note"),
          eq(items.date, data.date),
        ),
      )
      .orderBy(asc(sql`CAST(${items.sortOrder} AS integer)`));
  });

export const fetchNotesByTag = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      tagId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    return db
      .select(noteColumns)
      .from(items)
      .innerJoin(itemTags, eq(itemTags.itemId, items.id))
      .where(
        and(
          eq(items.userId, data.userId),
          eq(items.type, "note"),
          eq(itemTags.tagId, data.tagId),
        ),
      )
      .orderBy(desc(items.dateUpdated));
  });

export const fetchNote = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      noteId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const result = await db.query.items.findFirst({
      where: and(
        eq(items.id, data.noteId),
        eq(items.userId, data.userId),
        eq(items.type, "note"),
      ),
      with: {
        itemTags: {
          with: {
            tag: true,
          },
        },
        metadata: true,
      },
    });

    if (!result) return null;

    return {
      ...result,
      content: result.content ?? "",
      tags: result.itemTags.map((it) => it.tag),
      metadata: result.metadata,
    };
  });

// ─── Create ──────────────────────────────────────────────────────────

export const createNote = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      content: z.string().min(1),
      title: z.string().max(255).optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      tagIds: z.array(z.string()).optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info("Creating note...");

    const id = `nte_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const result = await db.transaction(async (tx) => {
      const [maxRow] = await tx
        .select({ max: sql<string | null>`MAX(${items.sortOrder})` })
        .from(items)
        .where(
          and(
            eq(items.userId, data.userId),
            eq(items.type, "note"),
            data.date ? eq(items.date, data.date) : sql`${items.date} IS NULL`,
          ),
        );

      const nextSortOrder = String((Number(maxRow?.max ?? "-1") || 0) + 1);

      const [noteResult] = await tx
        .insert(items)
        .values({
          id,
          type: "note",
          title: data.title ?? "Untitled",
          content: data.content,
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

      // Create empty metadata row for AI to fill later
      await tx.insert(itemMetadata).values({ itemId: id });

      return noteResult;
    });

    return result;
  });

// ─── Update ──────────────────────────────────────────────────────────

export const updateNote = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      content: z.string().min(1).optional(),
      title: z.string().max(255).or(z.null()).optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .or(z.null())
        .optional(),
      tagIds: z.array(z.string()).optional(),
      sortOrder: z.number().optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating note ${data.id}...`);

    const { id, userId, tagIds, sortOrder, ...updates } = data;

    // Convert integer sortOrder to text for items table
    const setValues: Record<string, unknown> = {
      ...updates,
      dateUpdated: new Date().toISOString(),
    };
    if (sortOrder !== undefined) {
      setValues.sortOrder = String(sortOrder);
    }

    const result = await db.transaction(async (tx) => {
      const [noteResult] = await tx
        .update(items)
        .set(setValues)
        .where(
          and(
            eq(items.id, id),
            eq(items.userId, userId),
            eq(items.type, "note"),
          ),
        )
        .returning();

      if (noteResult && tagIds !== undefined) {
        await tx.delete(itemTags).where(eq(itemTags.itemId, id));

        if (tagIds.length > 0) {
          await tx
            .insert(itemTags)
            .values(tagIds.map((tagId) => ({ itemId: id, tagId })));
        }
      }

      return noteResult;
    });

    return result;
  });

// ─── Delete ──────────────────────────────────────────────────────────

export const deleteNote = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      noteId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Deleting note ${data.noteId}...`);

    await db
      .delete(items)
      .where(
        and(
          eq(items.id, data.noteId),
          eq(items.userId, data.userId),
          eq(items.type, "note"),
        ),
      );
  });

// ─── Reorder ─────────────────────────────────────────────────────────

export const reorderNotes = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      noteIds: z.array(z.string().min(1)).min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Reordering ${data.noteIds.length} notes...`);

    const valuesList = sql.join(
      data.noteIds.map((id, i) => sql`(${id}, ${String(i)})`),
      sql`, `,
    );

    await db.execute(
      sql`UPDATE items SET sort_order = v.sort_order
          FROM (VALUES ${valuesList}) AS v(id, sort_order)
          WHERE items.id = v.id AND items.user_id = ${data.userId} AND items.type = 'note'`,
    );
  });

// ─── Search ──────────────────────────────────────────────────────────

export const searchNotes = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      query: z.string().min(1),
      tagIds: z.array(z.string()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const tsQuery = sql`plainto_tsquery('english', ${data.query})`;
    const likePattern = `%${data.query}%`;

    let query = db
      .select({
        ...noteColumns,
        rank: sql<number>`GREATEST(
          ts_rank(
            to_tsvector('english', COALESCE("items"."content", '') || ' ' || COALESCE("items"."title", '') || ' ' || COALESCE("item_metadata"."keywords", '')),
            ${tsQuery}
          ),
          CASE WHEN "items"."content" ILIKE ${likePattern} OR "items"."title" ILIKE ${likePattern} THEN 0.1 ELSE 0 END
        )`.as("rank"),
      })
      .from(items)
      .leftJoin(itemMetadata, eq(itemMetadata.itemId, items.id))
      .where(
        and(
          eq(items.userId, data.userId),
          eq(items.type, "note"),
          sql`(
            to_tsvector('english', COALESCE("items"."content", '') || ' ' || COALESCE("items"."title", '') || ' ' || COALESCE("item_metadata"."keywords", '')) @@ ${tsQuery}
            OR "items"."content" ILIKE ${likePattern}
            OR "items"."title" ILIKE ${likePattern}
          )`,
        ),
      )
      .$dynamic();

    if (data.tagIds && data.tagIds.length > 0) {
      for (const tagId of data.tagIds) {
        query = query.where(
          sql`EXISTS (SELECT 1 FROM item_tags WHERE item_tags.item_id = "items"."id" AND item_tags.tag_id = ${tagId})`,
        );
      }
    }

    return query.orderBy(sql`rank DESC`).limit(50);
  });
