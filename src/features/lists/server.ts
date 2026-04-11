import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import z from "zod";
import { db } from "~/db";
import { listItems, lists } from "~/db/schema";

export const fetchLists = createServerFn({ method: "GET" }).handler(
  async () => {
    return db.select().from(lists).where(eq(lists.userId, "1"));
  },
);

export const fetchListItems = createServerFn({ method: "GET" })
  .inputValidator(z.object({ listId: z.string().min(1) }))
  .handler(async ({ data }) => {
    return db
      .select()
      .from(listItems)
      .where(eq(listItems.listId, data.listId))
      .orderBy(asc(listItems.sortOrder));
  });

export const updateListOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      listId: z.string().min(1),
      taskIds: z.array(z.string()),
    }),
  )
  .handler(async ({ data }) => {
    console.info(`Updating list order for ${data.listId}...`);

    // Update sort order for each task in the list
    for (let i = 0; i < data.taskIds.length; i++) {
      const existingItem = await db
        .select()
        .from(listItems)
        .where(eq(listItems.taskId, data.taskIds[i]));

      if (existingItem.length > 0) {
        await db
          .update(listItems)
          .set({ sortOrder: i })
          .where(eq(listItems.id, existingItem[0].id));
      }
    }

    return db
      .select()
      .from(listItems)
      .where(eq(listItems.listId, data.listId))
      .orderBy(asc(listItems.sortOrder));
  });
