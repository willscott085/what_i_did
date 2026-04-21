import { createServerFn } from "@tanstack/react-start";
import {
  and,
  asc,
  desc,
  eq,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import z from "zod";
import { db } from "~/db";
import { items, itemTags, tags } from "~/db/schema";
import { itemColumns, rollForwardStaleTasks } from "~/features/items/server";
import { TagSummary } from "~/features/items/types";
import type { Task } from "./types";

const userIdInput = z.object({ userId: z.string().min(1) });

const formatLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ─── Item → Task mapping ─────────────────────────────────────────────

function toTask(row: Record<string, unknown>): Task {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    title: r.title as string,
    notes: (r.content as string | null) ?? null,
    dateCreated: r.dateCreated as string,
    dateCompleted: (r.dateCompleted as string | null) ?? null,
    startDate: (r.date as string | null) ?? null,
    userId: r.userId as string,
    parentTaskId: (r.parentItemId as string | null) ?? null,
    sortOrder: r.sortOrder as string,
    subtaskCount: r.subtaskCount as number,
    completedSubtaskCount: r.completedSubtaskCount as number,
    tags: r.tags as TagSummary[],
  };
}

// ─── List & Fetch ────────────────────────────────────────────────────

export const fetchTasks = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    const rows = await db
      .select(itemColumns)
      .from(items)
      .where(and(eq(items.userId, data.userId), eq(items.type, "task")))
      .orderBy(asc(items.sortOrder));
    return rows.map(toTask);
  });

export const fetchInboxTasks = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    await rollForwardStaleTasks(data.userId);

    const todayStr = formatLocalDate(new Date());

    const rows = await db
      .select(itemColumns)
      .from(items)
      .where(
        and(
          eq(items.userId, data.userId),
          eq(items.type, "task"),
          isNull(items.parentItemId),
          or(isNull(items.date), lte(items.date, todayStr)),
        ),
      )
      .orderBy(
        desc(isNull(items.dateCompleted)),
        sql`CASE WHEN ${items.dateCompleted} IS NOT NULL THEN 1 ELSE 0 END`,
        asc(items.sortOrder),
        asc(items.dateCompleted),
      );
    return rows.map(toTask);
  });

export const fetchCompletedTasks = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    const rows = await db
      .select(itemColumns)
      .from(items)
      .where(
        and(
          eq(items.userId, data.userId),
          eq(items.type, "task"),
          isNotNull(items.dateCompleted),
        ),
      )
      .orderBy(asc(items.dateCompleted));
    return rows.map(toTask);
  });

export const completeTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().min(1),
      dateCompleted: z.string().or(z.null()),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Completing task ${data.taskId}...`);

    const [result] = await db
      .update(items)
      .set({
        dateCompleted: data.dateCompleted,
        dateUpdated: new Date().toISOString(),
      })
      .where(
        and(
          eq(items.id, data.taskId),
          eq(items.userId, data.userId),
          eq(items.type, "task"),
        ),
      )
      .returning();

    if (!result) return null;

    return {
      id: result.id,
      title: result.title,
      notes: result.content ?? null,
      dateCreated: result.dateCreated,
      dateCompleted: result.dateCompleted ?? null,
      startDate: result.date ?? null,
      userId: result.userId,
      parentTaskId: result.parentItemId ?? null,
      sortOrder: result.sortOrder,
    };
  });

export const updateTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1).max(255).optional(),
      notes: z.string().max(1000).or(z.null()).optional(),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .or(z.null())
        .optional(),
      dateCompleted: z.string().or(z.null()).optional(),
      tagIds: z.array(z.string()).optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating task ${data.id}...`);

    const {
      id,
      userId,
      tagIds,
      notes: content,
      startDate: date,
      ...rest
    } = data;

    // Map task field names → item field names
    const updates: Record<string, unknown> = { ...rest };
    if (content !== undefined) updates.content = content;
    if (date !== undefined) updates.date = date;

    const result = await db.transaction(async (tx) => {
      const [itemResult] = await tx
        .update(items)
        .set({ ...updates, dateUpdated: new Date().toISOString() })
        .where(
          and(
            eq(items.id, id),
            eq(items.userId, userId),
            eq(items.type, "task"),
          ),
        )
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

export const reorderTasks = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskIds: z.array(z.string().min(1)).min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Reordering ${data.taskIds.length} tasks...`);

    const newKeys = generateNKeysBetween(null, null, data.taskIds.length);

    const valuesList = sql.join(
      data.taskIds.map((id, i) => sql`(${id}, ${newKeys[i]})`),
      sql`, `,
    );

    await db.execute(
      sql`UPDATE items SET sort_order = v.sort_order
          FROM (VALUES ${valuesList}) AS v(id, sort_order)
          WHERE items.id = v.id AND items.user_id = ${data.userId} AND items.type = 'task'`,
    );
  });

export const createTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1).max(255),
      notes: z.string().max(1000).optional(),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      parentTaskId: z.string().optional(),
      tagIds: z.array(z.string()).optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info("Creating task...");

    const id = `tsk_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const result = await db.transaction(async (tx) => {
      const dateCondition = data.startDate
        ? eq(items.date, data.startDate)
        : isNull(items.date);

      const [maxRow] = await tx
        .select({ max: sql<string | null>`MAX(${items.sortOrder})` })
        .from(items)
        .where(
          and(
            eq(items.userId, data.userId),
            eq(items.type, "task"),
            isNull(items.parentItemId),
            isNull(items.dateCompleted),
            dateCondition,
          ),
        );

      const nextSortOrder = generateKeyBetween(maxRow?.max ?? null, null);

      const [itemResult] = await tx
        .insert(items)
        .values({
          id,
          type: "task",
          title: data.title,
          content: data.notes ?? null,
          date: data.startDate ?? null,
          dateCompleted: null,
          parentItemId: data.parentTaskId ?? null,
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

      return itemResult;
    });

    // Map raw item → Task shape
    return {
      ...result,
      notes: result.content,
      startDate: result.date,
      parentTaskId: result.parentItemId,
      subtaskCount: 0,
      completedSubtaskCount: 0,
      tags: [] as TagSummary[],
    };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Deleting task ${data.taskId}...`);

    await db.transaction(async (tx) => {
      await tx
        .delete(items)
        .where(
          and(
            eq(items.parentItemId, data.taskId),
            eq(items.userId, data.userId),
            eq(items.type, "task"),
          ),
        );

      await tx
        .delete(items)
        .where(
          and(
            eq(items.id, data.taskId),
            eq(items.userId, data.userId),
            eq(items.type, "task"),
          ),
        );
    });
  });

export const moveTaskToDate = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().min(1),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .or(z.null()),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Moving task ${data.taskId} to date ${data.date}...`);

    const dateCondition = data.date
      ? eq(items.date, data.date)
      : isNull(items.date);

    const [maxRow] = await db
      .select({ max: sql<string | null>`MAX(${items.sortOrder})` })
      .from(items)
      .where(
        and(
          eq(items.userId, data.userId),
          eq(items.type, "task"),
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
      .where(
        and(
          eq(items.id, data.taskId),
          eq(items.userId, data.userId),
          eq(items.type, "task"),
        ),
      )
      .returning();

    return result;
  });

export const fetchTaskWithRelations = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      taskId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const result = await db.query.items.findFirst({
      where: and(
        eq(items.id, data.taskId),
        eq(items.userId, data.userId),
        eq(items.type, "task"),
      ),
      with: {
        itemTags: {
          with: {
            tag: true,
          },
        },
        subtasks: true,
      },
    });

    if (!result) return null;

    const completedSubtasks = result.subtasks.filter(
      (s) => s.dateCompleted !== null,
    );

    return {
      ...result,
      // Map to Task field names
      notes: result.content,
      startDate: result.date,
      parentTaskId: result.parentItemId,
      tags: result.itemTags.map((it) => it.tag),
      subtasks: result.subtasks.map((s) => ({
        ...s,
        notes: s.content,
        startDate: s.date,
        parentTaskId: s.parentItemId,
        subtaskCount: 0,
        completedSubtaskCount: 0,
        tags: [] as TagSummary[],
      })),
      subtaskCount: result.subtasks.length,
      completedSubtaskCount: completedSubtasks.length,
    };
  });

export const fetchSubtasks = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      parentTaskId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const rows = await db
      .select(itemColumns)
      .from(items)
      .where(
        and(
          eq(items.parentItemId, data.parentTaskId),
          eq(items.userId, data.userId),
          eq(items.type, "task"),
        ),
      )
      .orderBy(asc(items.dateCompleted), asc(items.dateCreated));

    return rows.map(toTask);
  });

// ─── Calendar & Day View queries ─────────────────────────────────────

export const fetchTasksForDate = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .handler(async ({ data }) => {
    const todayStr = formatLocalDate(new Date());
    if (data.date === todayStr) {
      await rollForwardStaleTasks(data.userId);
    }

    const rows = await db
      .select(itemColumns)
      .from(items)
      .where(
        and(
          eq(items.userId, data.userId),
          eq(items.type, "task"),
          isNull(items.parentItemId),
          or(
            and(isNull(items.dateCompleted), eq(items.date, data.date)),
            and(
              isNotNull(items.dateCompleted),
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
    return rows.map(toTask);
  });

export const fetchBacklogTasks = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    const rows = await db
      .select(itemColumns)
      .from(items)
      .where(
        and(
          eq(items.userId, data.userId),
          eq(items.type, "task"),
          isNull(items.parentItemId),
          isNull(items.date),
          isNull(items.dateCompleted),
        ),
      )
      .orderBy(asc(items.sortOrder));
    return rows.map(toTask);
  });

export const fetchTasksByTag = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      tagId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const [tag] = await db
      .select({ name: tags.name, description: tags.description })
      .from(tags)
      .where(and(eq(tags.id, data.tagId), eq(tags.userId, data.userId)));

    const rows = await db
      .select(itemColumns)
      .from(items)
      .innerJoin(itemTags, eq(itemTags.itemId, items.id))
      .where(
        and(
          eq(items.userId, data.userId),
          eq(items.type, "task"),
          eq(itemTags.tagId, data.tagId),
          isNull(items.parentItemId),
        ),
      )
      .orderBy(
        sql`CASE WHEN ${items.dateCompleted} IS NOT NULL THEN 1 ELSE 0 END`,
        asc(items.sortOrder),
        asc(items.dateCompleted),
      );

    return { tag: tag ?? null, tasks: rows.map(toTask) };
  });
