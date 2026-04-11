import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import z from "zod";
import { db } from "~/db";
import { tasks } from "~/db/schema";

export const fetchTasks = createServerFn({ method: "GET" }).handler(
  async () => {
    return db.select().from(tasks).where(eq(tasks.userId, "1"));
  },
);

export const completeTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().min(1),
      dateCompleted: z.string().or(z.null()),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating task with id ${data.taskId}...`);

    const result = await db
      .update(tasks)
      .set({ dateCompleted: data.dateCompleted })
      .where(eq(tasks.id, data.taskId))
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
      .where(eq(tasks.id, data.id))
      .returning();

    return result[0];
  });

export const updateTaskOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      taskId: z.string().min(1),
      order: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating task order with id ${data.taskId}...`);

    const result = await db
      .update(tasks)
      .set({ sortOrder: data.order })
      .where(eq(tasks.id, data.taskId))
      .returning();

    return result[0];
  });

export const createTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1).max(255),
      notes: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    console.info("Creating task...");

    const id = `tsk_${Date.now()}`;

    const result = await db
      .insert(tasks)
      .values({
        id,
        title: data.title,
        notes: data.notes ?? null,
        dateCreated: new Date().toISOString(),
        dateCompleted: null,
        userId: "1",
        sortOrder: 0,
      })
      .returning();

    return result[0];
  });
