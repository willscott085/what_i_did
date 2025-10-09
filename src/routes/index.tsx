import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { completeTask, Task, tasksQueryOptions } from "~/utils/tasks";
import { clsx } from "clsx";

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
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
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
      queryClient.invalidateQueries({ queryKey: tasksQueryOptions().queryKey });
    },
  });

  return (
    <>
      <div className="mx-auto max-w-2xl p-4">
        {tasks.map((task) => (
          <label
            key={task.id}
            htmlFor={task.id}
            className={clsx([
              "flex cursor-pointer items-center gap-2",
              "origin-left transition-transform duration-150 ease-out",
              "hover:scale-[1.02]",
              !!task.dateCompleted && "line-through",
            ])}
          >
            <input
              type="checkbox"
              id={task.id}
              disabled={isPending}
              onChange={() =>
                mutate({
                  taskId: task.id,
                  dateCompleted: task.dateCompleted
                    ? null
                    : new Date().toISOString(),
                })
              }
              defaultChecked={!!task.dateCompleted}
            />
            {task.title}
          </label>
        ))}
        <Outlet />
      </div>
    </>
  );
}
