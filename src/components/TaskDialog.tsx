import { useState } from "react";
import { format } from "date-fns";
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
  const formKey = `${open}-${task?.id ?? "new"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <TaskDialogForm
          key={formKey}
          task={task}
          defaultDueDate={defaultDueDate}
          defaultParentTaskId={defaultParentTaskId}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function TaskDialogForm({
  task,
  defaultDueDate,
  defaultParentTaskId,
  onOpenChange,
}: {
  task?: TaskWithRelations | null;
  defaultDueDate?: string;
  defaultParentTaskId?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDueDate ?? "");
  const [dueTime, setDueTime] = useState(task?.dueTime ?? "");
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

    const dueTimeValue = dueTime || undefined;

    if (isEditing && task) {
      await updateFullTask({
        id: task.id,
        title: title.trim(),
        notes: notes || null,
        dueDate: dueDate || null,
        dueTime: dueTimeValue ?? null,
        priorityCategoryId,
        recurrenceRule,
        tagIds,
      });
    } else {
      await createTask({
        title: title.trim(),
        notes: notes || undefined,
        dueDate: dueDate || undefined,
        dueTime: dueTimeValue,
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
    <>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="task-due-date">Due Date</Label>
            {dueDate && (
              <button
                type="button"
                className="cursor-pointer text-xs text-blue-500 hover:text-blue-600"
                onClick={() => setDueDate("")}
              >
                Clear
              </button>
            )}
          </div>
          <Input
            id="task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Due Time */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="task-due-time">Time</Label>
            {dueTime && (
              <button
                type="button"
                className="cursor-pointer text-xs text-blue-500 hover:text-blue-600"
                onClick={() => {
                  setDueTime("");
                  setDueDate("");
                }}
              >
                Clear
              </button>
            )}
          </div>
          <Input
            id="task-due-time"
            type="time"
            value={dueTime}
            onChange={(e) => {
              setDueTime(e.target.value);
              if (e.target.value && !dueDate) {
                setDueDate(format(new Date(), "yyyy-MM-dd"));
              }
            }}
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
    </>
  );
}
