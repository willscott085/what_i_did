import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GripVertical,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SubtaskList } from "~/components/SubtaskList";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  useCompleteTask,
  useCreateTask,
  useDeleteTask,
} from "~/features/tasks/mutations";
import { fetchSubtasksQueryOptions } from "~/features/tasks/queries";
import { Task } from "~/features/tasks/types";

type TaskUpdate = Pick<Task, "id" | "title" | "dateCompleted" | "userId">;

interface TaskItemProps {
  task: Task;
  isDragging: boolean;
  onUpdate: (task: TaskUpdate) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  dragAttributes?: React.HTMLAttributes<HTMLButtonElement>;
  dragListeners?: React.HTMLAttributes<HTMLButtonElement>;
}

export function TaskItem({
  task,
  isDragging,
  onUpdate,
  onEdit,
  onDelete,
  dragAttributes = {},
  dragListeners = {},
}: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);

  const tagNames = task.tagNames ? task.tagNames.split(",") : [];

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
      <div className="flex min-w-0 items-start gap-2">
        {/* Drag Handle */}
        {task.dateCompleted ? (
          <span className="-ml-2 size-8 shrink-0" aria-hidden="true" />
        ) : (
          <div className="flex h-9 items-center">
            <button
              type="button"
              {...dragAttributes}
              {...dragListeners}
              className="-ml-2 cursor-grab touch-none p-2 text-(--task-drag-handle) opacity-0 transition-opacity group-hover/task:opacity-100 hover:text-(--task-drag-handle-hover)"
              aria-label="Drag to reorder"
            >
              <GripVertical className="size-4" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex min-w-0 grow items-start gap-2"
        >
          <form.Field
            name="completed"
            children={(field) => (
              <div className="flex h-9 items-center">
                <Checkbox
                  id={`${task.id}-completed`}
                  checked={field.state.value}
                  onCheckedChange={(checked) => {
                    field.handleChange(checked === true);
                    form.handleSubmit();
                  }}
                  className="size-5"
                />
              </div>
            )}
          />

          <form.Field
            name="title"
            listeners={{
              onBlur: ({ value }) => {
                if (value !== task.title) form.handleSubmit();
              },
            }}
            children={(field) => (
              <div className="relative flex min-w-0 grow flex-col">
                <div className="flex items-center gap-2">
                  {tagNames.length > 0 && (
                    <div className="flex shrink-0 items-center gap-1 overflow-x-auto">
                      {tagNames.map((name) => (
                        <span
                          key={name}
                          className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px] leading-tight whitespace-nowrap"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                  <Input
                    type="text"
                    id={`${task.id}-title`}
                    aria-label={field.state.value}
                    title={field.state.value}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onClick={() => {
                      if (task.dateCompleted) {
                        if (!navigator.clipboard?.writeText) return;
                        navigator.clipboard.writeText(field.state.value).then(
                          () => toast.success("Copied task label"),
                          () => toast.error("Failed to copy"),
                        );
                      }
                    }}
                    autoComplete="off"
                    readOnly={!!task.dateCompleted}
                    tabIndex={task.dateCompleted ? -1 : undefined}
                    className={clsx(
                      "truncate border-0 p-0 shadow-none focus-visible:ring-0 dark:bg-transparent",
                      "min-w-0 flex-1",
                      form.state.values.completed &&
                        "text-muted-foreground cursor-copy line-through",
                    )}
                  />

                  {!field.state.meta.isValid && (
                    <FieldError className="absolute top-2 right-4">
                      {field.state.meta.errors.join(", ")}
                    </FieldError>
                  )}
                </div>

                {/* Notes */}
                {task.notes && !task.dateCompleted && (
                  <p className="text-muted-foreground line-clamp-3 text-xs leading-normal break-all">
                    <Linkify text={task.notes} />
                  </p>
                )}

                {/* Expanded subtasks area */}
                {expanded && (
                  <div className="my-2">
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
            )}
          />
        </form>

        {/* Subtask count */}
        {subtaskCount > 0 && (
          <div className="flex h-9 items-center">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:bg-accent shrink-0 rounded px-1.5 py-0.5 text-xs"
            >
              {completedSubtasks}/{subtaskCount}
            </button>
          </div>
        )}

        {/* Expand/collapse toggle */}
        <div className="flex h-9 items-center">
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
        </div>

        {/* Action buttons */}
        {onEdit && (
          <div className="flex h-9 items-center">
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
          </div>
        )}
        {onDelete && (
          <div className="flex h-9 items-center">
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
          </div>
        )}
      </div>
    </div>
  );
}

const URL_REGEX = /https?:\/\/[^\s]+/g;

function Linkify({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );
    lastIndex = match.index + url.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
