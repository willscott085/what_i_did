import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, gt, isNotNull, isNull, lte, or } from "drizzle-orm";
import z from "zod";
import { db } from "~/db";
import { tasks } from "~/db/schema";

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
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, data.userId),
          isNull(tasks.dateCompleted),
          or(isNull(tasks.dueDate), lte(tasks.dueDate, todayEnd())),
        ),
      )
      .orderBy(asc(tasks.sortOrder));
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
    console.info(`Updating task with id ${data.taskId}...`);

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
      title: z.string().min(1).max(255),
      dateCompleted: z.string().or(z.null()),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating task ${data.id}...`);

    const result = await db
      .update(tasks)
      .set({
        title: data.title,
        dateCompleted: data.dateCompleted,
      })
      .where(and(eq(tasks.id, data.id), eq(tasks.userId, data.userId)))
      .returning();

    return result[0];
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

export const createTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1).max(255),
      notes: z.string().max(1000).optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info("Creating task...");

    const id = `tsk_${crypto.randomUUID()}`;

    const result = await db
      .insert(tasks)
      .values({
        id,
        title: data.title,
        notes: data.notes ?? null,
        dateCreated: new Date().toISOString(),
        dateCompleted: null,
        userId: data.userId,
        sortOrder: 0,
      })
      .returning();

    return result[0];
  });
