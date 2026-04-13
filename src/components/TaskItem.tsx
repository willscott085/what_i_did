import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { format, isPast } from "date-fns";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GripVertical,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { SubtaskList } from "~/components/SubtaskList";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  useCompleteTask,
  useCreateTask,
  useDeleteTask,
} from "~/features/tasks/mutations";
import { fetchSubtasksQueryOptions } from "~/features/tasks/queries";
import { Task } from "~/features/tasks/types";
import { useOverdueCheck } from "~/hooks/useOverdueCheck";

type TaskUpdate = Pick<Task, "id" | "title" | "dateCompleted" | "userId">;

interface TaskItemProps {
  task: Task;
  isDragging: boolean;
  onUpdate: (task: TaskUpdate) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  categoryColor?: string | null;
  dragAttributes?: React.HTMLAttributes<HTMLButtonElement>;
  dragListeners?: React.HTMLAttributes<HTMLButtonElement>;
}

export function TaskItem({
  task,
  isDragging,
  onUpdate,
  onEdit,
  onDelete,
  categoryColor,
  dragAttributes = {},
  dragListeners = {},
}: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const overdueTick = useOverdueCheck();

  const { data: subtasks = [] } = useQuery({
    ...fetchSubtasksQueryOptions(task.id),
    enabled: expanded,
  });

  const { mutate: createSubtask } = useCreateTask();
  const { mutate: completeSubtask } = useCompleteTask();
  const { mutate: deleteSubtask } = useDeleteTask();

  const subtaskCount = expanded ? subtasks.length : (task.subtaskCount ?? 0);
  const completedSubtasks = expanded
    ? subtasks.filter((s) => s.dateCompleted).length
    : (task.completedSubtaskCount ?? 0);

  const form = useForm({
    formId: task.id,
    defaultValues: {
      completed: !!task.dateCompleted,
      title: task.title,
    },
    onSubmit: async ({ value }) => {
      const dateCompleted = value.completed ? new Date().toISOString() : null;
      onUpdate({
        id: task.id,
        title: value.title,
        dateCompleted,
        userId: task.userId,
      });
    },
  });

  function handleAddSubtask(title: string) {
    createSubtask({ title, parentTaskId: task.id });
  }

  function handleCompleteSubtask(taskId: string, completed: boolean) {
    completeSubtask({
      taskId,
      dateCompleted: completed ? new Date().toISOString() : null,
    });
  }

  function handleDeleteSubtask(taskId: string) {
    deleteSubtask(taskId);
  }

  return (
    <div
      className={clsx(
        "group/task relative",
        "origin-left transition-transform duration-150 ease-out",
        isDragging && "z-10 scale-105 opacity-80",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* Drag Handle */}
        {task.dateCompleted ? (
          <span className="-ml-2 size-8 shrink-0" aria-hidden="true" />
        ) : (
          <button
            type="button"
            {...dragAttributes}
            {...dragListeners}
            className="-ml-2 cursor-grab touch-none p-2 text-(--task-drag-handle) opacity-0 transition-opacity group-hover/task:opacity-100 hover:text-(--task-drag-handle-hover)"
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>
        )}

        {/* Category color dot */}
        {categoryColor && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: categoryColor }}
          />
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-grow items-center gap-2"
        >
          <form.Field
            name="completed"
            children={(field) => (
              <Checkbox
                id={`${task.id}-completed`}
                checked={field.state.value}
                onCheckedChange={(checked) => {
                  field.handleChange(checked === true);
                  form.handleSubmit();
                }}
                className="size-5"
              />
            )}
          />

          {/* Due date badge */}
          {task.dueDate && !task.dateCompleted && (
            <DueDateBadge
              dueDate={task.dueDate}
              dueTime={task.dueTime}
              tick={overdueTick}
            />
          )}

          <form.Field
            name="title"
            listeners={{
              onBlur: ({ value }) => {
                if (value !== task.title) form.handleSubmit();
              },
            }}
            children={(field) => (
              <div className="relative flex-grow">
                <Input
                  type="text"
                  id={`${task.id}-title`}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="off"
                  readOnly={!!task.dateCompleted}
                  tabIndex={task.dateCompleted ? -1 : undefined}
                  className={clsx(
                    "w-full truncate border-0 p-0 shadow-none focus-visible:ring-0 dark:bg-transparent",
                    form.state.values.completed &&
                      "text-muted-foreground cursor-default line-through",
                  )}
                />
                {!field.state.meta.isValid && (
                  <FieldError className="absolute top-2 right-4">
                    {field.state.meta.errors.join(", ")}
                  </FieldError>
                )}
              </div>
            )}
          />
        </form>

        {/* Subtask count */}
        {subtaskCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:bg-accent shrink-0 rounded px-1.5 py-0.5 text-xs"
          >
            {completedSubtasks}/{subtaskCount}
          </button>
        )}

        {/* Expand/collapse toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground shrink-0 p-1 opacity-0 transition-opacity group-hover/task:opacity-100"
          aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"}
        >
          {expanded ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          )}
        </button>

        {/* Action buttons */}
        {onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 opacity-0 group-hover/task:opacity-100"
            onClick={() => onEdit(task)}
            aria-label="Edit task"
          >
            <PencilIcon className="size-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="hover:text-destructive size-7 opacity-0 group-hover/task:opacity-100"
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Expanded subtasks area */}
      {expanded && (
        <div className="mt-1 ml-9 border-l pl-3.5">
          <SubtaskList
            subtasks={subtasks}
            onAdd={handleAddSubtask}
            onComplete={handleCompleteSubtask}
            onDelete={handleDeleteSubtask}
            readOnly={!!task.dateCompleted}
          />
        </div>
      )}
    </div>
  );
}

function DueDateBadge({
  dueDate,
  dueTime,
  tick,
}: {
  dueDate: string;
  dueTime: string | null;
  tick: number;
}) {
  // Use tick to ensure re-evaluation each interval
  void tick;

  // dueDate is stored as YYYY-MM-DD
  const [year, month, day] = dueDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  let overdue: boolean;

  if (dueTime) {
    // Overdue at the start of the next minute after the due minute
    const [hours, minutes] = dueTime.split(":").map(Number);
    const deadline = new Date(year, month - 1, day, hours, minutes + 1);
    overdue = isPast(deadline);
  } else {
    // Date-only: overdue after end of that day
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    overdue = isPast(endOfDay);
  }

  if (!overdue) return null;

  const tooltipText = dueTime
    ? `${format(date, "MMM d, yyyy")} at ${dueTime}`
    : `${format(date, "MMM d, yyyy")}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="bg-destructive/10 text-destructive inline-flex shrink-0 animate-[alarm-shake_3s_ease-in-out] items-center gap-1 rounded-full px-2 py-0.5 text-xs">
          <CalendarIcon className="size-3" />!
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
