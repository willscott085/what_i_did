import { createServerFn } from "@tanstack/react-start";
import { asc, and, eq, sql } from "drizzle-orm";
import z from "zod";
import { db } from "~/db";
import { priorityCategories } from "~/db/schema";

const userIdInput = z.object({ userId: z.string().min(1) });

export const fetchCategories = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    return db
      .select()
      .from(priorityCategories)
      .where(eq(priorityCategories.userId, data.userId))
      .orderBy(asc(priorityCategories.sortOrder));
  });

export const createCategory = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      color: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info("Creating priority category...");

    const id = `cat_${crypto.randomUUID()}`;

    const [maxOrder] = await db
      .select({
        max: sql<number>`coalesce(max(${priorityCategories.sortOrder}), -1)`,
      })
      .from(priorityCategories)
      .where(eq(priorityCategories.userId, data.userId));

    const result = await db
      .insert(priorityCategories)
      .values({
        id,
        name: data.name,
        description: data.description ?? null,
        color: data.color,
        sortOrder: (maxOrder?.max ?? -1) + 1,
        userId: data.userId,
      })
      .returning();

    return result[0];
  });

export const updateCategory = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      color: z.string().min(1).optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating priority category ${data.id}...`);

    const { id, userId, ...updates } = data;
    const result = await db
      .update(priorityCategories)
      .set(updates)
      .where(
        and(
          eq(priorityCategories.id, id),
          eq(priorityCategories.userId, userId),
        ),
      )
      .returning();

    return result[0];
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Deleting priority category ${data.id}...`);

    await db
      .delete(priorityCategories)
      .where(
        and(
          eq(priorityCategories.id, data.id),
          eq(priorityCategories.userId, data.userId),
        ),
      );
  });

export const reorderCategories = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      categoryIds: z.array(z.string().min(1)).min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Reordering ${data.categoryIds.length} categories...`);

    const rawDb = db.$client;
    const updateStmt = rawDb.prepare(
      "UPDATE priority_categories SET sort_order = ? WHERE id = ? AND user_id = ?",
    );

    rawDb.transaction(() => {
      for (let i = 0; i < data.categoryIds.length; i++) {
        updateStmt.run(i, data.categoryIds[i], data.userId);
      }
    })();
  });
