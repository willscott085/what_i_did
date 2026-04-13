import { useEffect, useState } from "react";
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
import { CategorySelect } from "~/components/CategorySelect";
import { TagMultiSelect } from "~/components/TagMultiSelect";
import { RecurrencePicker } from "~/components/RecurrencePicker";
import { SubtaskList } from "~/components/SubtaskList";
import {
  useCreateTask,
  useUpdateFullTask,
  useCompleteTask,
  useDeleteTask,
} from "~/features/tasks/mutations";
import { Task, TaskWithRelations } from "~/features/tasks/types";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskWithRelations | null;
  defaultDueDate?: string;
  defaultParentTaskId?: string;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultDueDate,
  defaultParentTaskId,
}: TaskDialogProps) {
  const isEditing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [dueDate, setDueDate] = useState(
    task?.dueDate?.split("T")[0] ?? defaultDueDate ?? "",
  );
  const [priorityCategoryId, setPriorityCategoryId] = useState<string | null>(
    task?.priorityCategoryId ?? null,
  );
  const [tagIds, setTagIds] = useState<string[]>(
    task?.tags?.map((t) => t.id) ?? [],
  );
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(
    task?.recurrenceRule ?? null,
  );
  const [subtasks, setSubtasks] = useState<Task[]>(task?.subtasks ?? []);

  // Reset form state when task prop changes or dialog opens
  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setNotes(task?.notes ?? "");
      setDueDate(task?.dueDate?.split("T")[0] ?? defaultDueDate ?? "");
      setPriorityCategoryId(task?.priorityCategoryId ?? null);
      setTagIds(task?.tags?.map((t) => t.id) ?? []);
      setRecurrenceRule(task?.recurrenceRule ?? null);
      setSubtasks(task?.subtasks ?? []);
    }
  }, [open, task]);

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

    const dueDateIso = dueDate
      ? new Date(dueDate + "T00:00:00").toISOString()
      : undefined;

    if (isEditing && task) {
      await updateFullTask({
        id: task.id,
        title: title.trim(),
        notes: notes || null,
        dueDate: dueDateIso ?? null,
        priorityCategoryId,
        recurrenceRule,
        tagIds,
      });
    } else {
      await createTask({
        title: title.trim(),
        notes: notes || undefined,
        dueDate: dueDateIso,
        priorityCategoryId: priorityCategoryId ?? undefined,
        parentTaskId: defaultParentTaskId,
        recurrenceRule: recurrenceRule ?? undefined,
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
            setSubtasks((prev) => [...prev, newTask]);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
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

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label htmlFor="task-due-date">Due Date</Label>
            <Input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Priority Category */}
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <CategorySelect
              value={priorityCategoryId}
              onChange={setPriorityCategoryId}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <TagMultiSelect selectedTagIds={tagIds} onChange={setTagIds} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              placeholder="Add notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Recurrence */}
          <div className="space-y-1.5">
            <Label>Recurrence</Label>
            <RecurrencePicker
              value={recurrenceRule}
              onChange={setRecurrenceRule}
            />
          </div>

          {/* Subtasks (only in edit mode) */}
          {isEditing && (
            <div className="space-y-1.5">
              <Label>Subtasks</Label>
              <SubtaskList
                subtasks={subtasks}
                onAdd={handleAddSubtask}
                onComplete={handleCompleteSubtask}
                onDelete={handleDeleteSubtask}
              />
            </div>
          )}

          <DialogFooter>
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
      </DialogContent>
    </Dialog>
  );
}
