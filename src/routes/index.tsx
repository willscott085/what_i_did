import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { clsx } from "clsx";
import { format } from "date-fns";
import { Checkbox } from "~/components/ui/checkbox";
import { FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  completeTask,
  Task,
  tasksQueryOptions,
  updateTask,
} from "~/utils/tasks";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tasksQueryOptions());
    return null;
  },
  head: () => ({
    meta: [{ title: "whatIdid - the task tracker extraordinaire" }],
  }),
  component: Home,
});

function Home() {
  const { data: tasks = [] } = useQuery(tasksQueryOptions());

  return (
    <>
      <div className="mx-auto max-w-2xl p-4">
        <header className="mb-2 flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {format(new Date(), "EEEE, MMMM do, yyyy")}
          </h1>
        </header>
        <div className="px-4">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
        <Outlet />
      </div>
    </>
  );
}

function TaskItem({ task }: { task: Task }) {
  const queryClient = useQueryClient();

  const { mutate: completeTaskMutation, isPending: completeTaskPending } =
    useMutation({
      mutationFn: ({
        taskId,
        dateCompleted,
      }: {
        taskId: string;
        dateCompleted: string | null;
      }) => completeTask({ data: { taskId, dateCompleted } }),
      onMutate: async ({ taskId, dateCompleted }) => {
        await queryClient.cancelQueries({
          queryKey: tasksQueryOptions().queryKey,
        });
        const prev = queryClient.getQueryData<Task[]>(
          tasksQueryOptions().queryKey,
        );
        if (prev) {
          queryClient.setQueryData<Task[]>(
            tasksQueryOptions().queryKey,
            prev.map((t) => (t.id === taskId ? { ...t, dateCompleted } : t)),
          );
        }
        return { prev };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.prev) {
          queryClient.setQueryData(tasksQueryOptions().queryKey, ctx.prev);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: tasksQueryOptions().queryKey,
        });
      },
    });

  const { mutate: updateTaskMutation, isPending: updateTaskPending } =
    useMutation({
      mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
        updateTask({ data: { taskId, title } }),
      onMutate: async ({ taskId, title }) => {
        await queryClient.cancelQueries({
          queryKey: tasksQueryOptions().queryKey,
        });
        const prev = queryClient.getQueryData<Task[]>(
          tasksQueryOptions().queryKey,
        );
        if (prev) {
          queryClient.setQueryData<Task[]>(
            tasksQueryOptions().queryKey,
            prev.map((t) => (t.id === taskId ? { ...t, title } : t)),
          );
        }
        return { prev };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.prev) {
          queryClient.setQueryData(tasksQueryOptions().queryKey, ctx.prev);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: tasksQueryOptions().queryKey,
        });
      },
    });

  const form = useForm({
    defaultValues: {
      completed: !!task.dateCompleted,
      title: task.title,
    },
    onSubmit: async ({ value, formApi }) => {
      if (!formApi.state.isDirty) return;
      updateTaskMutation({ taskId: task.id, title: value.title });
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

                    completeTaskMutation({
                      taskId: task.id,
                      dateCompleted: field.state.value
                        ? new Date().toISOString()
                        : null,
                    });
                  }}
                  checked={field.state.value}
                  disabled={completeTaskPending}
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
