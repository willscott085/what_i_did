import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppLayout } from "~/components/AppLayoutContext";
import { DraggableList } from "~/components/DraggableTaskList";
import { NoteItem } from "~/components/NoteItem";
import { TaskItem } from "~/components/TaskItem";
import { Button } from "~/components/ui/button";
import { useDeleteNote, useUpdateNote } from "~/features/notes/mutations";
import { fetchNotesByTagQueryOptions } from "~/features/notes/queries";
import { Note } from "~/features/notes/types";
import { useDeleteTag, useUpdateTag } from "~/features/tags/mutations";
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
    setBackLabel,
    handleOpenDialog,
    handleOpenNoteDialog,
  } = useAppLayout();

  useEffect(() => {
    setDefaultStartDate(undefined);
    setDefaultTagIds([tagId]);
    setBackLabel("Back");
    return () => {
      setDefaultTagIds(undefined);
      setBackLabel(null);
    };
  }, [setDefaultStartDate, setDefaultTagIds, setBackLabel, tagId]);

  const { data } = useQuery(fetchTasksByTagQueryOptions(tagId));
  const { data: tagNotes = [] } = useQuery(fetchNotesByTagQueryOptions(tagId));
  const tagName = data?.tag?.name ?? "Tag";
  const tasks = data?.tasks ?? [];

  const { mutate: updateTask } = useMutation(
    useUpdateTaskMutationOptions({ onError: () => {} }),
  );
  const { mutate: deleteTaskMutation } = useDeleteTask();
  const { mutate: updateFullTask } = useUpdateFullTask();
  const { mutate: updateTagMutation } = useUpdateTag();
  const { mutate: deleteNoteMutation } = useDeleteNote();
  const { mutate: updateNoteMutation } = useUpdateNote();
  const { mutate: deleteTagMutation } = useDeleteTag();
  const navigate = useNavigate();

  const hasNoAssociations = tasks.length === 0 && tagNotes.length === 0;

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
        </header>

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
                hideEmptyNotes
              />
            )}
          </DraggableList>
          {tasks.length === 0 && (
            <p className="text-muted-foreground py-8 pl-8 text-sm">
              No tasks with this tag.
            </p>
          )}
        </div>

        {/* Notes with this tag */}
        {tagNotes.length > 0 && tasks.length > 0 && (
          <div className="text-muted-foreground/20 py-1 pl-8 tracking-[0.3em] select-none">
            ·······························································
          </div>
        )}
        {tagNotes.length > 0 && (
          <div>
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
        )}

        {hasNoAssociations && (
          <div className="mt-6 pl-8">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                deleteTagMutation(tagId, {
                  onSuccess: () => navigate({ to: "/tags" }),
                });
              }}
            >
              <Trash2Icon className="size-4" />
              Delete tag
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
