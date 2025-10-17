import { useForm } from "@tanstack/react-form";
import { clsx } from "clsx";
import { Checkbox } from "~/components/ui/checkbox";
import { FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Task } from "~/features/tasks/types";

export function TaskItem({
  task,
  isDragging,
  onUpdate,
}: {
  task: Task;
  isDragging: boolean;
  onUpdate: (task: Task) => void;
}) {
  const form = useForm({
    defaultValues: {
      completed: !!task.dateCompleted,
      title: task.title,
    },
    onSubmit: async ({ value, formApi }) => {
      if (!formApi.state.isDirty) return;
      onUpdate({ ...task, ...value });
      formApi.reset();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div
        key={task.id}
        className={clsx([
          "relative flex min-w-0 cursor-pointer items-center gap-2",
          "origin-left transition-transform duration-150 ease-out",
          "hover:text-white",
          isDragging && "z-10 opacity-50",
        ])}
      >
        <form.Field
          name="completed"
          children={(field) => {
            return (
              <>
                <Checkbox
                  id={field.name}
                  name={field.name}
                  onCheckedChange={(e) => {
                    console.log("fires?", e);

                    field.handleChange(e === true);

                    onUpdate({
                      ...task,
                      dateCompleted: e ? new Date().toISOString() : null,
                    });
                  }}
                  checked={field.state.value}
                  className="size-5"
                />
              </>
            );
          }}
        />
        <form.Field
          name="title"
          validators={{
            onBlur: ({ value }) => (!value ? "A title is required" : undefined),
          }}
          listeners={{
            onBlur: function () {
              form.handleSubmit();
            },
          }}
          children={(field) => {
            return (
              <>
                <Input
                  type="text"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={clsx(
                    "truncate border-0 p-0 focus-visible:ring-0 dark:bg-transparent",
                    !!task.dateCompleted && "line-through",
                  )}
                />
                {!field.state.meta.isValid && (
                  <FieldError className="absolute top-2 right-4">
                    {field.state.meta.errors.join(", ")}
                  </FieldError>
                )}
              </>
            );
          }}
        />
      </div>
    </form>
  );
}
