import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { TagMultiSelect } from "~/components/TagMultiSelect";
import { SubtaskList } from "~/components/SubtaskList";
import {
  useCreateTask,
  useUpdateFullTask,
  useCompleteTask,
  useDeleteTask,
} from "~/features/tasks/mutations";
import { fetchTaskQueryOptions } from "~/features/tasks/queries";
import { Task, TaskWithRelations } from "~/features/tasks/types";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskWithRelations | null;
  defaultStartDate?: string;
  defaultParentTaskId?: string;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStartDate,
  defaultParentTaskId,
}: TaskDialogProps) {
  const {
    data: taskWithRelations,
    isLoading,
    isError,
  } = useQuery({
    ...fetchTaskQueryOptions(task?.id ?? ""),
    enabled: open && !!task?.id,
  });

  const resolvedTask = task?.id
    ? (taskWithRelations ?? (isError ? task : null))
    : null;
  const formKey = `${open}-${task?.id ?? "new"}-${resolvedTask?.id ?? "pending"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-xl">
        {isLoading && task?.id ? (
          <DialogHeader>
            <DialogTitle>Loading…</DialogTitle>
          </DialogHeader>
        ) : (
          <TaskDialogForm
            key={formKey}
            task={resolvedTask}
            defaultStartDate={defaultStartDate}
            defaultParentTaskId={defaultParentTaskId}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TaskDialogForm({
  task,
  defaultStartDate,
  defaultParentTaskId,
  onOpenChange,
}: {
  task?: TaskWithRelations | null;
  defaultStartDate?: string;
  defaultParentTaskId?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [startDate, setStartDate] = useState(
    task?.startDate ?? defaultStartDate ?? "",
  );
  const [tagIds, setTagIds] = useState<string[]>(
    task?.tags?.map((t) => t.id) ?? [],
  );
  const [subtasks, setSubtasks] = useState<Task[]>(task?.subtasks ?? []);

  const { mutateAsync: createTask, isPending: isCreating } = useCreateTask();
  const { mutateAsync: updateFullTask, isPending: isUpdating } =
    useUpdateFullTask();
  const { mutate: createSubtask } = useCreateTask();
  const { mutate: completeSubtask } = useCompleteTask();
  const { mutate: deleteSubtask } = useDeleteTask();

  const isPending = isCreating || isUpdating;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (isEditing && task) {
      await updateFullTask({
        id: task.id,
        title: title.trim(),
        notes: notes || null,
        startDate: startDate || null,
        tagIds,
      });
    } else {
      await createTask({
        title: title.trim(),
        notes: notes || undefined,
        startDate: startDate || undefined,
        parentTaskId: defaultParentTaskId,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
      });
    }

    onOpenChange(false);
  }

  function handleAddSubtask(subtaskTitle: string) {
    if (!task) return;

    createSubtask(
      { title: subtaskTitle, parentTaskId: task.id },
      {
        onSuccess: (newTask) => {
          if (newTask) {
            setSubtasks((prev) => [
              ...prev,
              {
                ...newTask,
                subtaskCount: 0,
                completedSubtaskCount: 0,
                tags: [],
              },
            ]);
          }
        },
      },
    );
  }

  function handleCompleteSubtask(taskId: string, completed: boolean) {
    const dateCompleted = completed ? new Date().toISOString() : null;
    completeSubtask({ taskId, dateCompleted });
    setSubtasks((prev) =>
      prev.map((s) => (s.id === taskId ? { ...s, dateCompleted } : s)),
    );
  }

  function handleDeleteSubtask(taskId: string) {
    deleteSubtask(taskId);
    setSubtasks((prev) => prev.filter((s) => s.id !== taskId));
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
        <div className="scrollbar-hide space-y-4 overflow-x-hidden overflow-y-auto pb-6">
          {/* Title */}
          <div className="space-y-1.5 px-4">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Start Date */}
          <div className="space-y-1.5 px-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="task-start-date">Start Date</Label>
              {startDate && (
                <button
                  type="button"
                  className="cursor-pointer text-xs text-blue-500 hover:text-blue-600"
                  onClick={() => setStartDate("")}
                >
                  Clear
                </button>
              )}
            </div>
            <Input
              id="task-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5 px-4">
            <Label>Tags</Label>
            <TagMultiSelect selectedTagIds={tagIds} onChange={setTagIds} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5 px-4">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              placeholder="Add notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Subtasks (only in edit mode) */}
          {isEditing && (
            <div className="space-y-1.5 px-4">
              <Label>Subtasks</Label>
              <SubtaskList
                subtasks={subtasks}
                onAdd={handleAddSubtask}
                onComplete={handleCompleteSubtask}
                onDelete={handleDeleteSubtask}
              />
            </div>
          )}
        </div>

        <DialogFooter className="bg-background border-border shrink-0 border-t p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !title.trim()}>
            {isEditing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
