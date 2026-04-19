import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppLayout } from "~/components/AppLayoutContext";
import { DraggableList } from "~/components/DraggableTaskList";
import { Markdown } from "~/components/Markdown";
import { NoteItem } from "~/components/NoteItem";
import { TaskItem } from "~/components/TaskItem";
import { Button } from "~/components/ui/button";
import { useDeleteNote, useUpdateNote } from "~/features/notes/mutations";
import { fetchNotesByTagQueryOptions } from "~/features/notes/queries";
import { Note } from "~/features/notes/types";
import { useUpdateTag } from "~/features/tags/mutations";
import {
  useDeleteTask,
  useUpdateFullTask,
  useUpdateTaskMutationOptions,
} from "~/features/tasks/mutations";
import { fetchTasksByTagQueryOptions } from "~/features/tasks/queries";
import { Task } from "~/features/tasks/types";

export const Route = createFileRoute("/_app/tag/$tagId")({
  head: () => ({
    meta: [{ title: "Tag - whatIdid" }],
  }),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        fetchTasksByTagQueryOptions(params.tagId),
      ),
      context.queryClient.ensureQueryData(
        fetchNotesByTagQueryOptions(params.tagId),
      ),
    ]);
    return null;
  },
  component: TagView,
});

function TagView() {
  const { tagId } = Route.useParams();
  const {
    setDragOverDate,
    setDefaultStartDate,
    setDefaultTagIds,
    handleOpenDialog,
    handleOpenNoteDialog,
  } = useAppLayout();

  useEffect(() => {
    setDefaultStartDate(undefined);
    setDefaultTagIds([tagId]);
    return () => setDefaultTagIds(undefined);
  }, [setDefaultStartDate, setDefaultTagIds, tagId]);

  const { data } = useQuery(fetchTasksByTagQueryOptions(tagId));
  const { data: tagNotes = [] } = useQuery(fetchNotesByTagQueryOptions(tagId));
  const tagName = data?.tag?.name ?? "Tag";
  const tagDescription = data?.tag?.description ?? null;
  const tasks = data?.tasks ?? [];

  const { mutate: updateTask } = useMutation(
    useUpdateTaskMutationOptions({ onError: () => {} }),
  );
  const { mutate: deleteTaskMutation } = useDeleteTask();
  const { mutate: updateFullTask } = useUpdateFullTask();
  const { mutate: updateTagMutation } = useUpdateTag();
  const { mutate: deleteNoteMutation } = useDeleteNote();
  const { mutate: updateNoteMutation } = useUpdateNote();

  // ─── Inline title editing ─────────────────────────────────────────
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(tagName);
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleDraft(tagName);
  }, [tagName]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  function handleTitleSave() {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleError("Title cannot be empty");
      titleInputRef.current?.focus();
      return;
    }
    setTitleError(null);
    setEditingTitle(false);
    if (trimmed !== tagName) {
      updateTagMutation({ id: tagId, name: trimmed });
    }
  }

  // ─── Inline description editing ───────────────────────────────────
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(
    tagDescription ?? "",
  );
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDescriptionDraft(tagDescription ?? "");
  }, [tagDescription]);

  useEffect(() => {
    if (editingDescription) descriptionRef.current?.focus();
  }, [editingDescription]);

  function handleDescriptionSave() {
    setEditingDescription(false);
    const value = descriptionDraft.trim() || null;
    if (value !== (tagDescription ?? null)) {
      updateTagMutation({ id: tagId, description: value });
    }
  }

  function handleDropOnDate(taskId: string, date: string) {
    updateFullTask({ id: taskId, startDate: date });
  }

  function handleEdit(task: Task) {
    handleOpenDialog(task);
  }

  function handleDelete(taskId: string) {
    deleteTaskMutation(taskId);
  }

  function handleEditNote(note: Note) {
    handleOpenNoteDialog(note);
  }

  function handleDeleteNote(noteId: string) {
    deleteNoteMutation(noteId);
  }

  function handleNoteDropOnDate(noteId: string, date: string) {
    updateNoteMutation({ id: noteId, date });
  }

  return (
    <div className="flex min-h-full flex-col justify-center">
      <section>
        <header className="flex items-center gap-2 pl-8">
          {editingTitle ? (
            <div className="flex-1">
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => {
                  setTitleDraft(e.target.value);
                  if (titleError) setTitleError(null);
                }}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") {
                    setTitleDraft(tagName);
                    setTitleError(null);
                    setEditingTitle(false);
                  }
                }}
                className="text-foreground w-full border-none bg-transparent text-lg font-medium outline-none"
              />
              {titleError && (
                <p className="text-destructive mt-1 text-xs">{titleError}</p>
              )}
            </div>
          ) : (
            <h2
              role="button"
              tabIndex={0}
              className="cursor-pointer text-lg font-medium"
              onClick={() => setEditingTitle(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setEditingTitle(true);
                }
              }}
              title="Click to edit"
            >
              {titleDraft}
            </h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenDialog(null)}
            aria-label="Add task"
          >
            <PlusIcon className="size-5" />
          </Button>
        </header>

        <div className="mt-1 pl-8">
          {editingDescription ? (
            <textarea
              ref={descriptionRef}
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              onBlur={handleDescriptionSave}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDescriptionDraft(tagDescription ?? "");
                  setEditingDescription(false);
                }
              }}
              placeholder="Add a description…"
              className="text-muted-foreground field-sizing-content w-full resize-none border-none bg-transparent p-0 text-sm leading-normal whitespace-pre-wrap outline-none"
            />
          ) : (
            <div
              role="button"
              tabIndex={0}
              className="text-muted-foreground cursor-pointer text-sm whitespace-pre-wrap"
              onClick={() => setEditingDescription(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setEditingDescription(true);
                }
              }}
              title="Click to edit"
            >
              {descriptionDraft ? (
                <Markdown className="text-muted-foreground text-sm">
                  {descriptionDraft}
                </Markdown>
              ) : (
                <span className="italic opacity-50">Add a description…</span>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <DraggableList
            items={tasks}
            onDropOnDate={handleDropOnDate}
            onDragOverDate={setDragOverDate}
          >
            {(task, isDragging, dragAttributes, dragListeners) => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={updateTask}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isDragging={isDragging}
                dragAttributes={dragAttributes}
                dragListeners={dragListeners}
                hideTags
              />
            )}
          </DraggableList>
          {tasks.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No tasks with this tag.
            </p>
          )}
        </div>

        {/* Notes with this tag */}
        {tagNotes.length > 0 && (
          <div className="mt-4">
            <h3 className="text-muted-foreground pl-8 text-xs font-medium tracking-wide uppercase">
              Notes
            </h3>
            <div className="mt-1">
              <DraggableList
                items={tagNotes}
                onDropOnDate={handleNoteDropOnDate}
                onDragOverDate={setDragOverDate}
              >
                {(note, isDragging, dragAttributes, dragListeners) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    onEdit={handleEditNote}
                    onDelete={handleDeleteNote}
                    isDragging={isDragging}
                    dragAttributes={dragAttributes}
                    dragListeners={dragListeners}
                    hideTags
                  />
                )}
              </DraggableList>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
