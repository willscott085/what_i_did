import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import z from "zod";
import { db } from "~/db";
import { noteMetadata, notes, noteTags } from "~/db/schema";

const noteColumns = {
  id: notes.id,
  content: notes.content,
  title: notes.title,
  date: notes.date,
  sortOrder: notes.sortOrder,
  userId: notes.userId,
  dateCreated: notes.dateCreated,
  dateUpdated: notes.dateUpdated,
  tags: sql<
    { id: string; name: string }[]
  >`(SELECT COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name) ORDER BY t.name), '[]') FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = "notes"."id")`.as(
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
      .from(notes)
      .where(eq(notes.userId, data.userId));

    const total = Number(countResult?.count ?? 0);

    const noteList = await db
      .select(noteColumns)
      .from(notes)
      .where(eq(notes.userId, data.userId))
      .orderBy(desc(notes.dateUpdated))
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
      .from(notes)
      .where(and(eq(notes.userId, data.userId), eq(notes.date, data.date)))
      .orderBy(asc(notes.sortOrder));
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
      .from(notes)
      .innerJoin(noteTags, eq(noteTags.noteId, notes.id))
      .where(and(eq(notes.userId, data.userId), eq(noteTags.tagId, data.tagId)))
      .orderBy(desc(notes.dateUpdated));
  });

export const fetchNote = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      noteId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const result = await db.query.notes.findFirst({
      where: and(eq(notes.id, data.noteId), eq(notes.userId, data.userId)),
      with: {
        noteTags: {
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
      tags: result.noteTags.map((nt) => nt.tag),
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
      // Get max sortOrder for notes on this date
      const [maxRow] = await tx
        .select({ max: sql<number>`COALESCE(MAX(${notes.sortOrder}), -1)` })
        .from(notes)
        .where(
          and(
            eq(notes.userId, data.userId),
            data.date ? eq(notes.date, data.date) : sql`${notes.date} IS NULL`,
          ),
        );

      const nextSortOrder = (maxRow?.max ?? -1) + 1;

      const [noteResult] = await tx
        .insert(notes)
        .values({
          id,
          content: data.content,
          title: data.title ?? null,
          date: data.date ?? null,
          sortOrder: nextSortOrder,
          userId: data.userId,
          dateCreated: now,
          dateUpdated: now,
        })
        .returning();

      if (data.tagIds && data.tagIds.length > 0) {
        await tx
          .insert(noteTags)
          .values(data.tagIds.map((tagId) => ({ noteId: id, tagId })));
      }

      // Create empty noteMetadata row for AI to fill later
      await tx.insert(noteMetadata).values({ noteId: id });

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

    const { id, userId, tagIds, ...updates } = data;

    const result = await db.transaction(async (tx) => {
      const [noteResult] = await tx
        .update(notes)
        .set({ ...updates, dateUpdated: new Date().toISOString() })
        .where(and(eq(notes.id, id), eq(notes.userId, userId)))
        .returning();

      if (tagIds !== undefined) {
        await tx.delete(noteTags).where(eq(noteTags.noteId, id));

        if (tagIds.length > 0) {
          await tx
            .insert(noteTags)
            .values(tagIds.map((tagId) => ({ noteId: id, tagId })));
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
      .delete(notes)
      .where(and(eq(notes.id, data.noteId), eq(notes.userId, data.userId)));
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
      data.noteIds.map((id, i) => sql`(${id}, ${i})`),
      sql`, `,
    );

    await db.execute(
      sql`UPDATE notes SET sort_order = v.sort_order
          FROM (VALUES ${valuesList}) AS v(id, sort_order)
          WHERE notes.id = v.id AND notes.user_id = ${data.userId}`,
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

    // Build search with ts_rank across content, title, and keywords
    // Fall back to ILIKE for partial/short queries that tsvector misses
    let query = db
      .select({
        ...noteColumns,
        rank: sql<number>`GREATEST(
          ts_rank(
            to_tsvector('english', COALESCE("notes"."content", '') || ' ' || COALESCE("notes"."title", '') || ' ' || COALESCE("note_metadata"."keywords", '')),
            ${tsQuery}
          ),
          CASE WHEN "notes"."content" ILIKE ${likePattern} OR "notes"."title" ILIKE ${likePattern} THEN 0.1 ELSE 0 END
        )`.as("rank"),
      })
      .from(notes)
      .leftJoin(noteMetadata, eq(noteMetadata.noteId, notes.id))
      .where(
        and(
          eq(notes.userId, data.userId),
          sql`(
            to_tsvector('english', COALESCE("notes"."content", '') || ' ' || COALESCE("notes"."title", '') || ' ' || COALESCE("note_metadata"."keywords", '')) @@ ${tsQuery}
            OR "notes"."content" ILIKE ${likePattern}
            OR "notes"."title" ILIKE ${likePattern}
          )`,
        ),
      )
      .$dynamic();

    if (data.tagIds && data.tagIds.length > 0) {
      for (const tagId of data.tagIds) {
        query = query.where(
          sql`EXISTS (SELECT 1 FROM note_tags WHERE note_tags.note_id = "notes"."id" AND note_tags.tag_id = ${tagId})`,
        );
      }
    }

    return query.orderBy(sql`rank DESC`).limit(50);
  });
