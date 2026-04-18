import { createServerFn } from "@tanstack/react-start";
import {
  and,
  asc,
  desc,
  eq,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import z from "zod";
import { db } from "~/db";
import { tags, tasks, taskTags } from "~/db/schema";

const userIdInput = z.object({ userId: z.string().min(1) });

const formatLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Roll forward any incomplete tasks whose startDate is in the past to today.
 * Runs lazily before task fetches — no background process needed.
 */
async function rollForwardStaleTasks(userId: string) {
  const todayStr = formatLocalDate(new Date());

  await db
    .update(tasks)
    .set({ startDate: todayStr })
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.dateCompleted),
        isNotNull(tasks.startDate),
        lt(tasks.startDate, todayStr),
      ),
    );
}

const taskColumns = {
  id: tasks.id,
  title: tasks.title,
  notes: tasks.notes,
  dateCreated: tasks.dateCreated,
  dateCompleted: tasks.dateCompleted,
  startDate: tasks.startDate,
  userId: tasks.userId,
  parentTaskId: tasks.parentTaskId,
  sortOrder: tasks.sortOrder,
  subtaskCount:
    sql<number>`(SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = ${tasks.id})`.as(
      "subtask_count",
    ),
  completedSubtaskCount:
    sql<number>`(SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = ${tasks.id} AND st.date_completed IS NOT NULL)`.as(
      "completed_subtask_count",
    ),
  tagNames: sql<
    string | null
  >`(SELECT STRING_AGG(t.name, ',') FROM task_tags tt JOIN tags t ON t.id = tt.tag_id WHERE tt.task_id = "tasks"."id")`.as(
    "tag_names",
  ),
  tagIds: sql<
    string | null
  >`(SELECT STRING_AGG(t.id, ',') FROM task_tags tt JOIN tags t ON t.id = tt.tag_id WHERE tt.task_id = "tasks"."id")`.as(
    "tag_ids",
  ),
};

export const fetchTasks = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    return db
      .select(taskColumns)
      .from(tasks)
      .where(eq(tasks.userId, data.userId))
      .orderBy(asc(tasks.sortOrder));
  });

export const fetchInboxTasks = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    await rollForwardStaleTasks(data.userId);

    const todayStr = formatLocalDate(new Date());

    return db
      .select(taskColumns)
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, data.userId),
          isNull(tasks.parentTaskId),
          or(isNull(tasks.startDate), lte(tasks.startDate, todayStr)),
        ),
      )
      .orderBy(
        desc(isNull(tasks.dateCompleted)),
        sql`CASE WHEN ${tasks.dateCompleted} IS NOT NULL THEN 1 ELSE 0 END`,
        asc(tasks.sortOrder),
        asc(tasks.dateCompleted),
      );
  });

export const fetchCompletedTasks = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    return db
      .select(taskColumns)
      .from(tasks)
      .where(and(eq(tasks.userId, data.userId), isNotNull(tasks.dateCompleted)))
      .orderBy(asc(tasks.dateCompleted));
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

    const result = await db
      .update(tasks)
      .set({ dateCompleted: data.dateCompleted })
      .where(and(eq(tasks.id, data.taskId), eq(tasks.userId, data.userId)))
      .returning();

    return result[0];
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

    const { id, userId, tagIds, ...updates } = data;

    const result = await db.transaction(async (tx) => {
      const [taskResult] = await tx
        .update(tasks)
        .set(updates)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .returning();

      if (tagIds !== undefined) {
        await tx.delete(taskTags).where(eq(taskTags.taskId, id));

        if (tagIds.length > 0) {
          await tx
            .insert(taskTags)
            .values(tagIds.map((tagId) => ({ taskId: id, tagId })));
        }
      }

      return taskResult;
    });

    return result;
  });

export const updateTaskOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().min(1),
      order: z.number(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating task order with id ${data.taskId}...`);

    const result = await db
      .update(tasks)
      .set({ sortOrder: data.order })
      .where(and(eq(tasks.id, data.taskId), eq(tasks.userId, data.userId)))
      .returning();

    return result[0];
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

    const valuesList = sql.join(
      data.taskIds.map((id, i) => sql`(${id}, ${i})`),
      sql`, `,
    );

    await db.execute(
      sql`UPDATE tasks SET sort_order = v.sort_order
          FROM (VALUES ${valuesList}) AS v(id, sort_order)
          WHERE tasks.id = v.id AND tasks.user_id = ${data.userId}`,
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

    const result = await db.transaction(async (tx) => {
      // Get the max sortOrder so the new task goes to the bottom
      const [maxRow] = await tx
        .select({ max: sql<number>`COALESCE(MAX(${tasks.sortOrder}), -1)` })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, data.userId),
            isNull(tasks.parentTaskId),
            isNull(tasks.dateCompleted),
          ),
        );

      const nextSortOrder = (maxRow?.max ?? -1) + 1;

      const [taskResult] = await tx
        .insert(tasks)
        .values({
          id,
          title: data.title,
          notes: data.notes ?? null,
          startDate: data.startDate ?? null,
          parentTaskId: data.parentTaskId ?? null,
          dateCreated: new Date().toISOString(),
          dateCompleted: null,
          userId: data.userId,
          sortOrder: nextSortOrder,
        })
        .returning();

      if (data.tagIds && data.tagIds.length > 0) {
        await tx
          .insert(taskTags)
          .values(data.tagIds.map((tagId) => ({ taskId: id, tagId })));
      }

      return taskResult;
    });

    return result;
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
        .delete(tasks)
        .where(
          and(
            eq(tasks.parentTaskId, data.taskId),
            eq(tasks.userId, data.userId),
          ),
        );

      await tx
        .delete(tasks)
        .where(and(eq(tasks.id, data.taskId), eq(tasks.userId, data.userId)));
    });
  });

export const fetchTaskWithRelations = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      taskId: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const result = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, data.taskId), eq(tasks.userId, data.userId)),
      with: {
        taskTags: {
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
      tags: result.taskTags.map((tt) => tt.tag),
      subtasks: result.subtasks.map((s) => ({
        ...s,
        subtaskCount: 0,
        completedSubtaskCount: 0,
        tagNames: null,
        tagIds: null,
      })),
      subtaskCount: result.subtasks.length,
      completedSubtaskCount: completedSubtasks.length,
      tagNames: result.taskTags.map((tt) => tt.tag.name).join(", ") || null,
      tagIds: result.taskTags.map((tt) => tt.tag.id).join(",") || null,
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
    return db
      .select({
        id: tasks.id,
        title: tasks.title,
        notes: tasks.notes,
        dateCreated: tasks.dateCreated,
        dateCompleted: tasks.dateCompleted,
        startDate: tasks.startDate,
        userId: tasks.userId,
        parentTaskId: tasks.parentTaskId,
        sortOrder: tasks.sortOrder,
        subtaskCount: sql<number>`0`.as("subtask_count"),
        completedSubtaskCount: sql<number>`0`.as("completed_subtask_count"),
        tagNames: sql<string | null>`NULL`.as("tag_names"),
        tagIds: sql<string | null>`NULL`.as("tag_ids"),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.parentTaskId, data.parentTaskId),
          eq(tasks.userId, data.userId),
        ),
      )
      .orderBy(asc(tasks.dateCompleted), asc(tasks.dateCreated));
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

    return db
      .select(taskColumns)
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, data.userId),
          isNull(tasks.parentTaskId),
          or(
            // Incomplete tasks: only on their exact startDate
            and(isNull(tasks.dateCompleted), eq(tasks.startDate, data.date)),
            // Completed tasks: only on the day they were completed
            and(
              isNotNull(tasks.dateCompleted),
              eq(sql`CAST(${tasks.dateCompleted} AS date)`, data.date),
            ),
          ),
        ),
      )
      .orderBy(
        desc(isNull(tasks.dateCompleted)),
        sql`CASE WHEN ${tasks.dateCompleted} IS NOT NULL THEN 1 ELSE 0 END`,
        asc(tasks.sortOrder),
        asc(tasks.dateCompleted),
      );
  });

export const fetchBacklogTasks = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    return db
      .select(taskColumns)
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, data.userId),
          isNull(tasks.parentTaskId),
          isNull(tasks.startDate),
          isNull(tasks.dateCompleted),
        ),
      )
      .orderBy(asc(tasks.sortOrder));
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
      .select({ name: tags.name })
      .from(tags)
      .where(and(eq(tags.id, data.tagId), eq(tags.userId, data.userId)));

    const taskList = await db
      .select(taskColumns)
      .from(tasks)
      .innerJoin(taskTags, eq(taskTags.taskId, tasks.id))
      .where(
        and(
          eq(tasks.userId, data.userId),
          eq(taskTags.tagId, data.tagId),
          isNull(tasks.parentTaskId),
        ),
      )
      .orderBy(
        sql`CASE WHEN ${tasks.dateCompleted} IS NOT NULL THEN 1 ELSE 0 END`,
        asc(tasks.sortOrder),
        asc(tasks.dateCompleted),
      );

    return { tag: tag ?? null, tasks: taskList };
  });
