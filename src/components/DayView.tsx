import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useAppLayout } from "~/components/AppLayoutContext";
import { DraggableList } from "~/components/DraggableTaskList";
import { NoteItem } from "~/components/NoteItem";
import { SortableTaskList } from "~/components/SortableTaskList";
import { TaskItem } from "~/components/TaskItem";
import { Button } from "~/components/ui/button";
import { useDeleteNote, useUpdateNote } from "~/features/notes/mutations";
import { fetchNotesForDateQueryOptions } from "~/features/notes/queries";
import { Note } from "~/features/notes/types";
import {
  useDeleteTask,
  useReorderTasks,
  useUpdateFullTask,
  useUpdateTaskMutationOptions,
} from "~/features/tasks/mutations";
import { fetchTasksForDateQueryOptions } from "~/features/tasks/queries";
import { Task } from "~/features/tasks/types";

interface DayViewProps {
  selectedDate: Date;
  onOpenDialog: (task?: Task | null) => void;
  onDragActiveChange?: (taskId: string | null) => void;
  onDragOverDate?: (date: string | null) => void;
}

export function DayView({
  selectedDate,
  onOpenDialog,
  onDragActiveChange,
  onDragOverDate,
}: DayViewProps) {
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { handleOpenNoteDialog } = useAppLayout();
  const { data: tasks = [] } = useQuery(fetchTasksForDateQueryOptions(dateStr));
  const { data: dayNotes = [] } = useQuery(
    fetchNotesForDateQueryOptions(dateStr),
  );

  const { mutate: updateTask } = useMutation(
    useUpdateTaskMutationOptions({ onError: () => {} }),
  );
  const { mutate: updateFullTask } = useUpdateFullTask();
  const { mutate: deleteNoteMutation } = useDeleteNote();
  const { mutate: updateNoteMutation } = useUpdateNote();

  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const { mutate: reorderTasks } = useReorderTasks({ onError: () => {} });
  const { mutate: deleteTaskMutation } = useDeleteTask();

  function handleEdit(task: Task) {
    onOpenDialog(task);
  }

  function handleDelete(taskId: string) {
    deleteTaskMutation(taskId);
  }

  function handleDropOnDate(taskId: string, date: string) {
    updateFullTask({ id: taskId, startDate: date });
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
        <header className="flex items-center justify-start gap-2">
          <h2 className="pl-8 text-lg font-medium">
            {format(selectedDate, "EEEE, d MMMM yyyy")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenDialog(null)}
            aria-label="Add task"
          >
            <PlusIcon className="size-5" />
          </Button>
        </header>
        <div>
          {hydrated ? (
            <SortableTaskList
              tasks={tasks}
              onReorder={(taskIds) => reorderTasks(taskIds)}
              onDragActiveChange={onDragActiveChange}
              onDropOnDate={handleDropOnDate}
              onDragOverDate={onDragOverDate}
              completedChildren={(task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDragging={false}
                  hideEmptyNotes
                />
              )}
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
                  hideEmptyNotes
                />
              )}
            </SortableTaskList>
          ) : (
            <ul>
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDragging={false}
                  hideEmptyNotes
                />
              ))}
            </ul>
          )}
        </div>

        {/* Notes for this date */}
        {dayNotes.length > 0 && (
          <div className="mt-4">
            <DraggableList
              items={dayNotes}
              onDropOnDate={handleNoteDropOnDate}
              onDragOverDate={onDragOverDate}
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
                />
              )}
            </DraggableList>
          </div>
        )}
      </section>
    </div>
  );
}
