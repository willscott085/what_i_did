import { createServerFn } from "@tanstack/react-start";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import z from "zod";
import { db } from "~/db";
import { priorityCategories, tasks, taskTags } from "~/db/schema";
import { getNextOccurrence } from "~/utils/recurrence";

const userIdInput = z.object({ userId: z.string().min(1) });

const todayEnd = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

export const fetchTasks = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, data.userId))
      .orderBy(asc(tasks.sortOrder));
  });

export const fetchInboxTasks = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    return db
      .select({
        id: tasks.id,
        title: tasks.title,
        notes: tasks.notes,
        dateCreated: tasks.dateCreated,
        dateCompleted: tasks.dateCompleted,
        dueDate: tasks.dueDate,
        userId: tasks.userId,
        priorityCategoryId: tasks.priorityCategoryId,
        parentTaskId: tasks.parentTaskId,
        recurrenceRule: tasks.recurrenceRule,
        sortOrder: tasks.sortOrder,
      })
      .from(tasks)
      .leftJoin(
        priorityCategories,
        eq(tasks.priorityCategoryId, priorityCategories.id),
      )
      .where(
        and(
          eq(tasks.userId, data.userId),
          isNull(tasks.parentTaskId),
          or(isNull(tasks.dueDate), lte(tasks.dueDate, todayEnd())),
        ),
      )
      .orderBy(
        // Incomplete first, completed last
        desc(isNull(tasks.dateCompleted)),
        // Within incomplete: category sortOrder (null categories last)
        sql`CASE WHEN ${tasks.dateCompleted} IS NOT NULL THEN 1 ELSE 0 END`,
        sql`CASE WHEN ${priorityCategories.sortOrder} IS NULL THEN 999999 ELSE ${priorityCategories.sortOrder} END`,
        asc(tasks.sortOrder),
        // Within completed: most recently completed first
        desc(tasks.dateCompleted),
      );
  });

export const fetchUpcomingTasks = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    return db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, data.userId),
          isNull(tasks.dateCompleted),
          isNull(tasks.parentTaskId),
          gt(tasks.dueDate, todayEnd()),
        ),
      )
      .orderBy(asc(tasks.dueDate));
  });

export const fetchCompletedTasks = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    return db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, data.userId), isNotNull(tasks.dateCompleted)))
      .orderBy(asc(tasks.sortOrder));
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

    const completed = result[0];

    // Generate next occurrence for recurring tasks
    if (data.dateCompleted && completed?.recurrenceRule) {
      const nextDate = getNextOccurrence(
        completed.recurrenceRule,
        new Date(data.dateCompleted),
      );

      if (nextDate) {
        const nextId = `tsk_${crypto.randomUUID()}`;
        await db.insert(tasks).values({
          id: nextId,
          title: completed.title,
          notes: completed.notes,
          dateCreated: new Date().toISOString(),
          dateCompleted: null,
          dueDate: nextDate.toISOString(),
          userId: completed.userId,
          priorityCategoryId: completed.priorityCategoryId,
          parentTaskId: null,
          recurrenceRule: completed.recurrenceRule,
          sortOrder: completed.sortOrder,
        });

        // Copy tags to the new task
        const existingTags = await db
          .select()
          .from(taskTags)
          .where(eq(taskTags.taskId, data.taskId));

        if (existingTags.length > 0) {
          await db.insert(taskTags).values(
            existingTags.map((tt) => ({
              taskId: nextId,
              tagId: tt.tagId,
            })),
          );
        }

        console.info(
          `Generated next recurring task ${nextId} for ${nextDate.toISOString()}`,
        );
      }
    }

    return completed;
  });

export const updateTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1).max(255).optional(),
      notes: z.string().max(1000).or(z.null()).optional(),
      dueDate: z.string().or(z.null()).optional(),
      dateCompleted: z.string().or(z.null()).optional(),
      priorityCategoryId: z.string().or(z.null()).optional(),
      recurrenceRule: z.string().or(z.null()).optional(),
      tagIds: z.array(z.string()).optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating task ${data.id}...`);

    const { id, userId, tagIds, ...updates } = data;

    const rawDb = db.$client;

    const result = rawDb.transaction(() => {
      const taskResult = db
        .update(tasks)
        .set(updates)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .returning()
        .get();

      if (tagIds !== undefined) {
        db.delete(taskTags).where(eq(taskTags.taskId, id)).run();

        if (tagIds.length > 0) {
          db.insert(taskTags)
            .values(tagIds.map((tagId) => ({ taskId: id, tagId })))
            .run();
        }
      }

      return taskResult;
    })();

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

    const rawDb = db.$client;
    const updateStmt = rawDb.prepare(
      "UPDATE tasks SET sort_order = ? WHERE id = ? AND user_id = ?",
    );

    rawDb.transaction(() => {
      for (let i = 0; i < data.taskIds.length; i++) {
        updateStmt.run(i, data.taskIds[i], data.userId);
      }
    })();
  });

export const reorderTasksInCategory = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskIds: z.array(z.string().min(1)).min(1),
      categoryId: z.string().or(z.null()),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(
      `Reordering ${data.taskIds.length} tasks in category ${data.categoryId ?? "uncategorized"}...`,
    );

    const rawDb = db.$client;
    const updateStmt = rawDb.prepare(
      "UPDATE tasks SET sort_order = ? WHERE id = ? AND user_id = ?",
    );

    rawDb.transaction(() => {
      for (let i = 0; i < data.taskIds.length; i++) {
        updateStmt.run(i, data.taskIds[i], data.userId);
      }
    })();
  });

export const moveTaskToCategory = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().min(1),
      categoryId: z.string().or(z.null()),
      taskIdsInNewGroup: z.array(z.string().min(1)).min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(
      `Moving task ${data.taskId} to category ${data.categoryId ?? "uncategorized"} and reordering ${data.taskIdsInNewGroup.length} tasks...`,
    );

    const rawDb = db.$client;

    rawDb.transaction(() => {
      // Update the task's category
      rawDb
        .prepare(
          "UPDATE tasks SET priority_category_id = ? WHERE id = ? AND user_id = ?",
        )
        .run(data.categoryId, data.taskId, data.userId);

      // Batch-rewrite sort orders for the target group
      const updateStmt = rawDb.prepare(
        "UPDATE tasks SET sort_order = ? WHERE id = ? AND user_id = ?",
      );
      for (let i = 0; i < data.taskIdsInNewGroup.length; i++) {
        updateStmt.run(i, data.taskIdsInNewGroup[i], data.userId);
      }
    })();
  });

export const createTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1).max(255),
      notes: z.string().max(1000).optional(),
      dueDate: z.string().optional(),
      priorityCategoryId: z.string().optional(),
      parentTaskId: z.string().optional(),
      recurrenceRule: z.string().optional(),
      tagIds: z.array(z.string()).optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info("Creating task...");

    const id = `tsk_${crypto.randomUUID()}`;

    const rawDb = db.$client;

    const result = rawDb.transaction(() => {
      const taskResult = db
        .insert(tasks)
        .values({
          id,
          title: data.title,
          notes: data.notes ?? null,
          dueDate: data.dueDate ?? null,
          priorityCategoryId: data.priorityCategoryId ?? null,
          parentTaskId: data.parentTaskId ?? null,
          recurrenceRule: data.recurrenceRule ?? null,
          dateCreated: new Date().toISOString(),
          dateCompleted: null,
          userId: data.userId,
          sortOrder: 0,
        })
        .returning()
        .get();

      if (data.tagIds && data.tagIds.length > 0) {
        db.insert(taskTags)
          .values(data.tagIds.map((tagId) => ({ taskId: id, tagId })))
          .run();
      }

      return taskResult;
    })();

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

    const rawDb = db.$client;

    rawDb.transaction(() => {
      // Delete subtasks first (single level — subtasks can't have subtasks)
      db.delete(tasks)
        .where(
          and(
            eq(tasks.parentTaskId, data.taskId),
            eq(tasks.userId, data.userId),
          ),
        )
        .run();

      // Delete the task itself (FK cascade handles taskTags and listItems)
      db.delete(tasks)
        .where(and(eq(tasks.id, data.taskId), eq(tasks.userId, data.userId)))
        .run();
    })();
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
        priorityCategory: true,
        taskTags: {
          with: {
            tag: true,
          },
        },
        subtasks: true,
      },
    });

    if (!result) return null;

    return {
      ...result,
      tags: result.taskTags.map((tt) => tt.tag),
      subtasks: result.subtasks,
      priorityCategory: result.priorityCategory,
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
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.parentTaskId, data.parentTaskId),
          eq(tasks.userId, data.userId),
        ),
      )
      .orderBy(asc(tasks.sortOrder));
  });
