import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { TagMultiSelect } from "~/components/TagMultiSelect";
import { MarkdownEditor } from "~/components/MarkdownEditor";
import { DateTimePicker } from "~/components/DateTimePicker";
import {
  useCreateNote,
  useProcessNoteWithAI,
  useUpdateNote,
} from "~/features/notes/mutations";
import { fetchNoteQueryOptions } from "~/features/notes/queries";
import { Note } from "~/features/notes/types";

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note | null;
  defaultDate?: string;
  defaultTagIds?: string[];
}

export function NoteDialog({
  open,
  onOpenChange,
  note,
  defaultDate,
  defaultTagIds,
}: NoteDialogProps) {
  const {
    data: noteWithRelations,
    isLoading,
    isError,
  } = useQuery({
    ...fetchNoteQueryOptions(note?.id ?? ""),
    enabled: open && !!note?.id,
  });

  const resolvedNote = note?.id
    ? (noteWithRelations ??
      (isError
        ? {
            ...note,
            tags: note.tags.map((t) => ({
              ...t,
              description: null,
              color: null,
              userId: "1",
              dateCreated: note.dateCreated,
              updatedAt: note.dateCreated,
            })),
            metadata: null,
          }
        : null))
    : null;

  const formKey = `${open}-${note?.id ?? "new"}-${resolvedNote?.id ?? "pending"}`;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent>
        {isLoading && note?.id ? (
          <DrawerHeader>
            <DrawerTitle>Loading…</DrawerTitle>
          </DrawerHeader>
        ) : (
          <NoteDialogForm
            key={formKey}
            note={resolvedNote}
            defaultDate={defaultDate}
            defaultTagIds={defaultTagIds}
            onOpenChange={onOpenChange}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function NoteDialogForm({
  note,
  defaultDate,
  defaultTagIds,
  onOpenChange,
}: {
  note?: {
    id: string;
    content: string;
    title: string | null;
    date: string | null;
    tags: { id: string; name: string }[];
  } | null;
  defaultDate?: string;
  defaultTagIds?: string[];
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = !!note;

  const [content, setContent] = useState(note?.content ?? "");
  const [title, setTitle] = useState(note?.title ?? "");
  const [date, setDate] = useState(note?.date ?? defaultDate ?? "");
  const [tagIds, setTagIds] = useState<string[]>(
    note?.tags?.map((t) => t.id) ?? defaultTagIds ?? [],
  );

  const { mutateAsync: createNote, isPending: isCreating } = useCreateNote();
  const { mutateAsync: updateNote, isPending: isUpdating } = useUpdateNote();
  const { mutate: triggerAI } = useProcessNoteWithAI();

  const isPending = isCreating || isUpdating;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    if (isEditing && note) {
      await updateNote({
        id: note.id,
        content: content.trim(),
        title: title.trim() || null,
        date: date || null,
        tagIds,
      });

      // Re-trigger AI if content changed and title was AI-generated (user didn't set one)
      if (content.trim() !== note.content && !title.trim()) {
        triggerAI(note.id);
      }
    } else {
      const result = await createNote({
        content: content.trim(),
        title: title.trim() || undefined,
        date: date || undefined,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
      });

      // Fire-and-forget AI processing — only when no title is set
      if (result?.id && !title.trim()) {
        triggerAI(result.id);
      }
    }

    onOpenChange(false);
  }

  return (
    <>
      <DrawerHeader className="shrink-0">
        <DrawerTitle>{isEditing ? "Edit Note" : "New Note"}</DrawerTitle>
      </DrawerHeader>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="scrollbar-hide flex flex-1 flex-col justify-center overflow-x-hidden overflow-y-auto">
          <div className="space-y-4 pb-16">
            {/* Content */}
            <div className="space-y-1.5 px-4">
              <Label htmlFor="note-content">Content</Label>
              <MarkdownEditor
                id="note-content"
                value={content}
                onChange={setContent}
                placeholder="Jot something down…"
                autoFocus
              />
            </div>

            {/* Title */}
            <div className="space-y-1.5 px-4">
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                type="text"
                placeholder="AI will generate a title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                spellCheck
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5 px-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="note-date">Date</Label>
                {date && (
                  <button
                    type="button"
                    className="cursor-pointer text-xs text-blue-500 hover:text-blue-600"
                    onClick={() => setDate("")}
                  >
                    Clear
                  </button>
                )}
              </div>
              <DateTimePicker
                id="note-date"
                mode="date"
                value={date}
                onChange={setDate}
                placeholder="No date"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5 px-4">
              <Label>Tags</Label>
              <TagMultiSelect selectedTagIds={tagIds} onChange={setTagIds} />
            </div>
          </div>
        </div>

        <DrawerFooter className="bg-background border-border shrink-0 border-t p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !content.trim()}>
            {isEditing ? "Save" : "Create"}
          </Button>
        </DrawerFooter>
      </form>
    </>
  );
}
