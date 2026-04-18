import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import z from "zod";
import { db } from "~/db";
import { tags } from "~/db/schema";

const userIdInput = z.object({ userId: z.string().min(1) });

export const fetchTags = createServerFn({ method: "GET" })
  .inputValidator(userIdInput)
  .handler(async ({ data }) => {
    return db
      .select()
      .from(tags)
      .where(eq(tags.userId, data.userId))
      .orderBy(desc(tags.updatedAt));
  });

export const createTag = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(50),
      description: z.string().max(500).optional(),
      color: z.string().optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info("Creating tag...");

    const id = `tag_${crypto.randomUUID()}`;

    const result = await db
      .insert(tags)
      .values({
        id,
        name: data.name,
        description: data.description ?? null,
        color: data.color ?? null,
        userId: data.userId,
        dateCreated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return result[0];
  });

export const updateTag = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1).max(50).optional(),
      description: z.string().max(500).optional().nullable(),
      color: z.string().optional(),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating tag ${data.id}...`);

    const { id, userId, ...updates } = data;
    const result = await db
      .update(tags)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .returning();

    return result[0];
  });

export const deleteTag = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      userId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Deleting tag ${data.id}...`);

    await db
      .delete(tags)
      .where(and(eq(tags.id, data.id), eq(tags.userId, data.userId)));
  });
