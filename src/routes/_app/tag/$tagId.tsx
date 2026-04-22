import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppLayout } from "~/components/AppLayoutContext";
import { DraggableList } from "~/components/DraggableTaskList";
import { NoteItem } from "~/components/NoteItem";
import { ReminderItem } from "~/components/ReminderItem";
import { TaskItem } from "~/components/TaskItem";
import { Button } from "~/components/ui/button";
import { fetchEventsByTagQueryOptions } from "~/features/events/queries";
import { useDeleteNote, useUpdateNote } from "~/features/notes/mutations";
import { fetchNotesByTagQueryOptions } from "~/features/notes/queries";
import { Note } from "~/features/notes/types";
import type { SnoozeDuration } from "~/features/schedules/consts";
import {
  useDeleteSchedule,
  useDismissSchedule,
  useSnoozeSchedule,
} from "~/features/schedules/mutations";
import { schedulesQueryOptions } from "~/features/schedules/queries";
import type { ScheduleWithItem } from "~/features/schedules/types";
import { useDeleteTag, useUpdateTag } from "~/features/tags/mutations";
import {
  useDeleteTask,
  useMoveTaskToDate,
  useUpdateTaskMutationOptions,
} from "~/features/tasks/mutations";
import { fetchTasksByTagQueryOptions } from "~/features/tasks/queries";
import { Task } from "~/features/tasks/types";
import { useNow } from "~/hooks/useNow";

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
      context.queryClient.ensureQueryData(
        fetchEventsByTagQueryOptions(params.tagId),
      ),
      context.queryClient.ensureQueryData(schedulesQueryOptions()),
    ]);
    return null;
  },
  component: TagView,
});

function TagView() {
  const { tagId } = Route.useParams();
  const {
    setDragOverDate,
    handleOpenDialog,
    handleOpenNoteDialog,
    handleOpenReminderDialog,
  } = useAppLayout();

  const { data } = useQuery(fetchTasksByTagQueryOptions(tagId));
  const { data: tagNotes = [] } = useQuery(fetchNotesByTagQueryOptions(tagId));
  const { data: tagEvents = [] } = useQuery(
    fetchEventsByTagQueryOptions(tagId),
  );
  const { data: allSchedules = [] } = useQuery(schedulesQueryOptions());
  const tagName = data?.tag?.name ?? "Tag";
  const tagDescription = data?.tag?.description ?? null;
  const tasks = data?.tasks ?? [];

  // Index schedules by the item they attach to so we can render a bell on
  // tasks/notes and pull ScheduleWithItem records for events in this tag.
  const schedulesByItem = useMemo(() => {
    const map = new Map<string, ScheduleWithItem[]>();
    for (const s of allSchedules) {
      const list = map.get(s.itemId) ?? [];
      list.push(s);
      map.set(s.itemId, list);
    }
    return map;
  }, [allSchedules]);

  const eventReminders = useMemo(() => {
    const result: ScheduleWithItem[] = [];
    for (const event of tagEvents) {
      const schedules = schedulesByItem.get(event.id);
      if (schedules) result.push(...schedules);
    }
    return result;
  }, [tagEvents, schedulesByItem]);

  const now = useNow(30_000);

  const { mutate: updateTask } = useMutation(
    useUpdateTaskMutationOptions({ onError: () => {} }),
  );
  const { mutate: deleteTaskMutation } = useDeleteTask();
  const { mutate: moveTaskToDate } = useMoveTaskToDate();
  const { mutate: updateTagMutation } = useUpdateTag();
  const { mutate: deleteNoteMutation } = useDeleteNote();
  const { mutate: updateNoteMutation } = useUpdateNote();
  const { mutate: deleteTagMutation } = useDeleteTag();
  const { mutate: deleteScheduleMutation } = useDeleteSchedule();
  const { mutate: snoozeScheduleMutation } = useSnoozeSchedule();
  const { mutate: dismissScheduleMutation } = useDismissSchedule();
  const navigate = useNavigate();

  const hasNoAssociations =
    tasks.length === 0 && tagNotes.length === 0 && eventReminders.length === 0;

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

  // ─── Inline description editing ──────────────────────────────────
  const [editingDescription, setEditingDescription] = useState(false);
  const [descDraft, setDescDraft] = useState(tagDescription ?? "");
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);
  const descCancelledRef = useRef(false);

  useEffect(() => {
    setDescDraft(tagDescription ?? "");
  }, [tagDescription]);

  useEffect(() => {
    if (editingDescription) descTextareaRef.current?.focus();
  }, [editingDescription]);

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

  function handleDescriptionSave() {
    if (descCancelledRef.current) {
      descCancelledRef.current = false;
      return;
    }
    const trimmed = descDraft.trim();
    setEditingDescription(false);
    const newDesc = trimmed || null;
    if (newDesc !== tagDescription) {
      updateTagMutation({ id: tagId, description: newDesc });
    }
  }

  function handleDropOnDate(taskId: string, date: string) {
    moveTaskToDate({ taskId, date });
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

  function handleEditReminder(schedule: ScheduleWithItem) {
    handleOpenReminderDialog(schedule);
  }

  function handleDeleteReminder(scheduleId: string) {
    deleteScheduleMutation(scheduleId);
  }

  function handleSnoozeReminder(scheduleId: string, duration: SnoozeDuration) {
    snoozeScheduleMutation({ scheduleId, duration });
  }

  function handleDismissReminder(schedule: ScheduleWithItem) {
    dismissScheduleMutation(schedule.id);
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
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore
                data-form-type="other"
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

        {/* Inline description editing */}
        <div className="mt-1 pr-4 pl-8">
          {editingDescription ? (
            <textarea
              ref={descTextareaRef}
              value={descDraft}
              placeholder="Add a description…"
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={handleDescriptionSave}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  descCancelledRef.current = true;
                  setDescDraft(tagDescription ?? "");
                  setEditingDescription(false);
                }
              }}
              className="text-muted-foreground w-full resize-none border-none bg-transparent text-sm outline-none"
              rows={2}
            />
          ) : (
            <button
              type="button"
              className={`cursor-pointer text-left text-sm ${tagDescription ? "text-muted-foreground" : "text-muted-foreground/50 italic"}`}
              onClick={() => setEditingDescription(true)}
            >
              {tagDescription || "Add a description…"}
            </button>
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
                hideEmptyNotes
                hasReminder={schedulesByItem.has(task.id)}
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
                  hasReminder={schedulesByItem.has(note.id)}
                />
              )}
            </DraggableList>
          </div>
        )}

        {eventReminders.length > 0 && (
          <>
            {(tasks.length > 0 || tagNotes.length > 0) && (
              <div className="text-muted-foreground/20 py-1 pl-8 tracking-[0.3em] select-none">
                ·······························································
              </div>
            )}
            <div className="pl-8">
              {eventReminders.map((schedule) => (
                <ReminderItem
                  key={schedule.id}
                  schedule={schedule}
                  now={now}
                  onEdit={handleEditReminder}
                  onDelete={handleDeleteReminder}
                  onSnooze={handleSnoozeReminder}
                  onDismiss={handleDismissReminder}
                />
              ))}
            </div>
          </>
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
