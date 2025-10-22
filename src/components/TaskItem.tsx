import { useForm } from "@tanstack/react-form";
import { clsx } from "clsx";
import { GripVertical } from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import { FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Task } from "~/features/tasks/types";

export function TaskItem({
  task,
  isDragging,
  onUpdate,
  dragAttributes = {},
  dragListeners = {},
}: {
  task: Task;
  isDragging: boolean;
  onUpdate: (task: Task) => void;
  // Add props for dnd-kit listeners and attributes
  dragAttributes?: React.HTMLAttributes<HTMLButtonElement>;
  dragListeners?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const form = useForm({
    formId: task.id,
    defaultValues: {
      completed: !!task.dateCompleted,
      title: task.title,
    },
    onSubmit: async ({ value }) => {
      const dateCompleted = value.completed ? new Date().toISOString() : null;
      onUpdate({ ...task, id: task.id, title: value.title, dateCompleted });
    },
  });

  return (
    <div
      className={clsx(
        "group relative flex min-w-0 items-center gap-2",
        "origin-left transition-transform duration-150 ease-out",
        isDragging && "z-10 scale-105 opacity-80",
      )}
    >
      {/* Drag Handle */}
      <button
        type="button"
        {...dragAttributes}
        {...dragListeners}
        className="text-muted-foreground -ml-2 cursor-grab touch-none p-2 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>

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
        <form.Field
          name="title"
          listeners={{ onBlur: form.handleSubmit }}
          children={(field) => (
            <div className="relative flex-grow">
              <Input
                type="text"
                id={`${task.id}-title`}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={clsx(
                  "w-full truncate border-0 p-0 focus-visible:ring-0 dark:bg-transparent",
                  form.state.values.completed && "line-through",
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
    </div>
  );
}
