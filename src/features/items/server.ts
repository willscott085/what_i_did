import { createServerFn } from "@tanstack/react-start";
import {
  and,
  asc,
  desc,
  eq,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import z from "zod";
import { db } from "~/db";
import { items, itemTags, itemMetadata, tags } from "~/db/schema";
import { TagSummary } from "~/features/items/types";

const formatLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ─── Computed columns ────────────────────────────────────────────────

export const itemColumns = {
  id: items.id,
  type: items.type,
  title: items.title,
  content: items.content,
  date: items.date,
  dateCompleted: items.dateCompleted,
  parentItemId: items.parentItemId,
  sortOrder: items.sortOrder,
  userId: items.userId,
  dateCreated: items.dateCreated,
  dateUpdated: items.dateUpdated,
  subtaskCount:
    sql<number>`(SELECT COUNT(*) FROM items st WHERE st.parent_item_id = "items"."id")`.as(
      "subtask_count",
    ),
  completedSubtaskCount:
    sql<number>`(SELECT COUNT(*) FROM items st WHERE st.parent_item_id = "items"."id" AND st.date_completed IS NOT NULL)`.as(
      "completed_subtask_count",
    ),
  tags: sql<
    TagSummary[]
  >`(SELECT COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name) ORDER BY t.name), '[]') FROM item_tags it JOIN tags t ON t.id = it.tag_id WHERE it.item_id = "items"."id")`.as(
    "tags",
  ),
};

// ─── Roll forward stale tasks ────────────────────────────────────────

export async function rollForwardStaleTasks(userId: string) {
  const todayStr = formatLocalDate(new Date());

  const staleTasks = await db
    .select({ id: items.id, sortOrder: items.sortOrder })
    .from(items)
    .where(
      and(
        eq(items.userId, userId),
        eq(items.type, "task"),
        isNull(items.dateCompleted),
        isNotNull(items.date),
        lt(items.date, todayStr),
      ),
    )
    .orderBy(asc(items.sortOrder));

  if (staleTasks.length === 0) return;

  const [maxRow] = await db
    .select({ max: sql<string | null>`MAX(${items.sortOrder})` })
    .from(items)
    .where(
      and(
        eq(items.userId, userId),
        eq(items.type, "task"),
        isNull(items.dateCompleted),
        isNull(items.parentItemId),
        eq(items.date, todayStr),
      ),
    );

  const lastKey = maxRow?.max ?? null;
  const newKeys = generateNKeysBetween(lastKey, null, staleTasks.length);

  const valuesList = sql.join(
    staleTasks.map((t, i) => sql`(${t.id}, ${todayStr}, ${newKeys[i]})`),
    sql`, `,
  );

  await db.execute(
    sql`UPDATE items SET date = v.date, sort_order = v.sort_order
        FROM (VALUES ${valuesList}) AS v(id, date, sort_order)
        WHERE items.id = v.id AND items.user_id = ${userId}`,
  );
}

// ─── Generic CRUD ────────────────────────────────────────────────────

export const createItem = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      type: z.enum(["task", "note", "event"]),
      title: z.string().min(1).max(255),
      content: z.string().max(10000).optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      parentItemId: z.string().optional(),
      tagIds: z.array(z.string()).optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const prefix =
      data.type === "task" ? "tsk_" : data.type === "note" ? "nte_" : "evt_";
    const id = `${prefix}${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const result = await db.transaction(async (tx) => {
      // Get the max sortOrder for items in the same context
      const dateCondition = data.date
        ? eq(items.date, data.date)
        : isNull(items.date);

      const parentCondition = data.parentItemId
        ? eq(items.parentItemId, data.parentItemId)
        : isNull(items.parentItemId);

      const [maxRow] = await tx
        .select({ max: sql<string | null>`MAX(${items.sortOrder})` })
        .from(items)
        .where(
          and(
            eq(items.userId, data.userId),
            eq(items.type, data.type),
            isNull(items.dateCompleted),
            parentCondition,
            dateCondition,
          ),
        );

      const nextSortOrder = generateKeyBetween(maxRow?.max ?? null, null);

      const [itemResult] = await tx
        .insert(items)
        .values({
          id,
          type: data.type,
          title: data.title,
          content: data.content ?? null,
          date: data.date ?? null,
          dateCompleted: null,
          parentItemId: data.parentItemId ?? null,
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

      // Create metadata row for notes (AI will fill later)
      if (data.type === "note") {
        await tx.insert(itemMetadata).values({ itemId: id });
      }

      return itemResult;
    });

    return result;
  });

export const updateItem = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1).max(255).optional(),
      content: z.string().max(10000).or(z.null()).optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .or(z.null())
        .optional(),
      dateCompleted: z.string().or(z.null()).optional(),
      tagIds: z.array(z.string()).optional(),
      sortOrder: z.string().optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating item ${data.id}...`);

    const { id, userId, tagIds, ...updates } = data;

    const result = await db.transaction(async (tx) => {
      const [itemResult] = await tx
        .update(items)
        .set({ ...updates, dateUpdated: new Date().toISOString() })
        .where(and(eq(items.id, id), eq(items.userId, userId)))
        .returning();

      if (itemResult && tagIds !== undefined) {
        await tx.delete(itemTags).where(eq(itemTags.itemId, id));

        if (tagIds.length > 0) {
          await tx
            .insert(itemTags)
            .values(tagIds.map((tagId) => ({ itemId: id, tagId })));
        }
      }

      return itemResult;
    });

    return result;
  });

export const deleteItem = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      itemId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Deleting item ${data.itemId}...`);

    await db.transaction(async (tx) => {
      // Delete subtasks first
      await tx
        .delete(items)
        .where(
          and(
            eq(items.parentItemId, data.itemId),
            eq(items.userId, data.userId),
          ),
        );

      await tx
        .delete(items)
        .where(and(eq(items.id, data.itemId), eq(items.userId, data.userId)));
    });
  });

export const completeItem = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      itemId: z.string().min(1),
      dateCompleted: z.string().or(z.null()),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Completing item ${data.itemId}...`);

    const [result] = await db
      .update(items)
      .set({
        dateCompleted: data.dateCompleted,
        dateUpdated: new Date().toISOString(),
      })
      .where(and(eq(items.id, data.itemId), eq(items.userId, data.userId)))
      .returning();

    return result;
  });

export const reorderItems = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      itemIds: z.array(z.string().min(1)).min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Reordering ${data.itemIds.length} items...`);

    const newKeys = generateNKeysBetween(null, null, data.itemIds.length);

    const valuesList = sql.join(
      data.itemIds.map((id, i) => sql`(${id}, ${newKeys[i]})`),
      sql`, `,
    );

    await db.execute(
      sql`UPDATE items SET sort_order = v.sort_order
          FROM (VALUES ${valuesList}) AS v(id, sort_order)
          WHERE items.id = v.id AND items.user_id = ${data.userId}`,
    );
  });

export const moveItemToDate = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      itemId: z.string().min(1),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .or(z.null()),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Moving item ${data.itemId} to date ${data.date}...`);

    const dateCondition = data.date
      ? eq(items.date, data.date)
      : isNull(items.date);

    const [maxRow] = await db
      .select({ max: sql<string | null>`MAX(${items.sortOrder})` })
      .from(items)
      .where(
        and(
          eq(items.userId, data.userId),
          isNull(items.parentItemId),
          isNull(items.dateCompleted),
          dateCondition,
        ),
      );

    const newKey = generateKeyBetween(maxRow?.max ?? null, null);

    const [result] = await db
      .update(items)
      .set({
        date: data.date,
        sortOrder: newKey,
        dateUpdated: new Date().toISOString(),
      })
      .where(and(eq(items.id, data.itemId), eq(items.userId, data.userId)))
      .returning();

    return result;
  });

export const fetchItemWithRelations = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      itemId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const result = await db.query.items.findFirst({
      where: and(eq(items.id, data.itemId), eq(items.userId, data.userId)),
      with: {
        itemTags: {
          with: {
            tag: true,
          },
        },
        subtasks: true,
        metadata: true,
      },
    });

    if (!result) return null;

    const completedSubtasks = result.subtasks.filter(
      (s) => s.dateCompleted !== null,
    );

    return {
      ...result,
      tags: result.itemTags.map((it) => it.tag),
      subtasks: result.subtasks.map((s) => ({
        ...s,
        subtaskCount: 0,
        completedSubtaskCount: 0,
        tags: [] as TagSummary[],
      })),
      subtaskCount: result.subtasks.length,
      completedSubtaskCount: completedSubtasks.length,
      metadata: result.metadata,
    };
  });

export const fetchSubtasks = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      parentItemId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    return db
      .select({
        id: items.id,
        type: items.type,
        title: items.title,
        content: items.content,
        date: items.date,
        dateCompleted: items.dateCompleted,
        parentItemId: items.parentItemId,
        sortOrder: items.sortOrder,
        userId: items.userId,
        dateCreated: items.dateCreated,
        dateUpdated: items.dateUpdated,
        subtaskCount: sql<number>`0`.as("subtask_count"),
        completedSubtaskCount: sql<number>`0`.as("completed_subtask_count"),
        tags: sql<TagSummary[]>`'[]'::json`.as("tags"),
      })
      .from(items)
      .where(
        and(
          eq(items.parentItemId, data.parentItemId),
          eq(items.userId, data.userId),
        ),
      )
      .orderBy(asc(items.dateCompleted), asc(items.dateCreated));
  });

// ─── Type-filtered queries ───────────────────────────────────────────

export const fetchItemsForDate = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      type: z.enum(["task", "note", "event"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const todayStr = formatLocalDate(new Date());
    if (data.date === todayStr) {
      await rollForwardStaleTasks(data.userId);
    }

    const typeFilter = data.type ? eq(items.type, data.type) : undefined;

    return db
      .select(itemColumns)
      .from(items)
      .where(
        and(
          eq(items.userId, data.userId),
          isNull(items.parentItemId),
          typeFilter,
          or(
            // Incomplete items: only on their exact date
            and(isNull(items.dateCompleted), eq(items.date, data.date)),
            // Completed tasks: only on the day they were completed
            and(
              isNotNull(items.dateCompleted),
              eq(items.type, "task"),
              eq(sql`CAST(${items.dateCompleted} AS date)`, data.date),
            ),
          ),
        ),
      )
      .orderBy(
        desc(isNull(items.dateCompleted)),
        sql`CASE WHEN ${items.dateCompleted} IS NOT NULL THEN 1 ELSE 0 END`,
        asc(items.sortOrder),
        asc(items.dateCompleted),
      );
  });

export const fetchItemsByTag = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      tagId: z.string().min(1),
      type: z.enum(["task", "note", "event"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const [tag] = await db
      .select({ name: tags.name, description: tags.description })
      .from(tags)
      .where(and(eq(tags.id, data.tagId), eq(tags.userId, data.userId)));

    const typeFilter = data.type ? eq(items.type, data.type) : undefined;

    const itemList = await db
      .select(itemColumns)
      .from(items)
      .innerJoin(itemTags, eq(itemTags.itemId, items.id))
      .where(
        and(
          eq(items.userId, data.userId),
          eq(itemTags.tagId, data.tagId),
          isNull(items.parentItemId),
          typeFilter,
        ),
      )
      .orderBy(
        sql`CASE WHEN ${items.dateCompleted} IS NOT NULL THEN 1 ELSE 0 END`,
        asc(items.sortOrder),
        asc(items.dateCompleted),
      );

    return { tag: tag ?? null, items: itemList };
  });
