import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import z from "zod";
import { db } from "~/db";
import { noteMetadata, notes } from "~/db/schema";
import { getAIProvider } from "~/features/ai/provider";

export const processNoteWithAI = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ noteId: z.string().min(1), userId: z.string().min(1) }),
  )
  .handler(async ({ data }) => {
    const provider = getAIProvider();
    if (!provider) {
      console.info("AI provider not configured, skipping note processing");
      return { updated: false };
    }

    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, data.noteId), eq(notes.userId, data.userId)),
    });

    if (!note) return { updated: false };

    try {
      // Only generate title if none was provided by the user
      let title: string | undefined;
      if (!note.title) {
        title = await provider.generateTitle(note.content);
        console.info(`AI generated title for ${data.noteId}: "${title}"`);
      }

      // Always generate keywords
      const keywords = await provider.generateKeywords(note.content);
      const keywordsStr = keywords.join(", ");
      console.info(
        `AI generated ${keywords.length} keywords for ${data.noteId}`,
      );

      // Update note title (if generated) and metadata keywords
      if (title) {
        await db
          .update(notes)
          .set({ title, dateUpdated: new Date().toISOString() })
          .where(and(eq(notes.id, data.noteId), eq(notes.userId, data.userId)));
      }

      await db
        .update(noteMetadata)
        .set({ keywords: keywordsStr })
        .where(eq(noteMetadata.noteId, data.noteId));

      return { updated: true, title };
    } catch (err) {
      console.error(`AI processing failed for note ${data.noteId}:`, err);
      return { updated: false };
    }
  });
