import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAppLayout } from "~/components/AppLayoutContext";
import { Markdown } from "~/components/Markdown";
import { TaskItem } from "~/components/TaskItem";
import { useUpdateTag } from "~/features/tags/mutations";
import {
  useDeleteTask,
  useUpdateTaskMutationOptions,
} from "~/features/tasks/mutations";
import { fetchTasksByTagQueryOptions } from "~/features/tasks/queries";
import { Task, TaskWithRelations } from "~/features/tasks/types";

export const Route = createFileRoute("/_app/tag/$tagId")({
  head: () => ({
    meta: [{ title: "Tag - whatIdid" }],
  }),
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      fetchTasksByTagQueryOptions(params.tagId),
    );
    return null;
  },
  component: TagView,
});

function TagView() {
  const { tagId } = Route.useParams();
  const { setDefaultStartDate, handleOpenDialog } = useAppLayout();

  useEffect(() => {
    setDefaultStartDate(undefined);
  }, [setDefaultStartDate]);

  const { data } = useQuery(fetchTasksByTagQueryOptions(tagId));
  const tagName = data?.tag?.name ?? "Tag";
  const tagDescription = data?.tag?.description ?? null;
  const tasks = data?.tasks ?? [];

  const { mutate: updateTask } = useMutation(
    useUpdateTaskMutationOptions({ onError: () => {} }),
  );
  const { mutate: deleteTaskMutation } = useDeleteTask();
  const { mutate: updateTagMutation } = useUpdateTag();

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

  function handleEdit(task: Task) {
    handleOpenDialog(task as TaskWithRelations);
  }

  function handleDelete(taskId: string) {
    deleteTaskMutation(taskId);
  }

  return (
    <div className="flex min-h-full flex-col justify-center">
      <section>
        <header className="pl-8">
          {editingTitle ? (
            <div>
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
              className="cursor-pointer text-lg font-medium"
              onClick={() => setEditingTitle(true)}
              title="Click to edit"
            >
              {titleDraft}
            </h2>
          )}
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
              className="text-muted-foreground field-sizing-content w-full resize-none border-none bg-transparent text-sm whitespace-pre-wrap outline-none"
            />
          ) : (
            <p
              className="text-muted-foreground cursor-pointer text-sm whitespace-pre-wrap"
              onClick={() => setEditingDescription(true)}
              title="Click to edit"
            >
              {descriptionDraft ? (
                <Markdown className="text-muted-foreground text-sm">
                  {descriptionDraft}
                </Markdown>
              ) : (
                <span className="italic opacity-50">Add a description…</span>
              )}
            </p>
          )}
        </div>

        <div>
          <ul>
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={updateTask}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isDragging={false}
                hideTags
              />
            ))}
          </ul>
          {tasks.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No tasks with this tag.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
