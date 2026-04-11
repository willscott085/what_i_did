import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import z from "zod";
import { db } from "~/db";
import { listItems, lists } from "~/db/schema";

export const fetchLists = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    return db.select().from(lists).where(eq(lists.userId, data.userId));
  });

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

    return db.transaction((tx) => {
      for (let i = 0; i < data.taskIds.length; i++) {
        tx.update(listItems)
          .set({ sortOrder: i })
          .where(
            and(
              eq(listItems.listId, data.listId),
              eq(listItems.taskId, data.taskIds[i]),
            ),
          )
          .run();
      }

      return tx
        .select()
        .from(listItems)
        .where(eq(listItems.listId, data.listId))
        .orderBy(asc(listItems.sortOrder))
        .all();
    });
  });
