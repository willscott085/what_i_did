import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { completeTask, Task, tasksQueryOptions } from "~/utils/tasks";
import { clsx } from "clsx";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(tasksQueryOptions());
  },
  head: () => ({
    meta: [{ title: "whatIdid - the task tracker extraordinaire" }],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="p-2 flex gap-2">
      <ul className="list-disc pl-4">
        <Suspense
          fallback={
            <li key="loading" className="whitespace-nowrap">
              Loading tasks ...
            </li>
          }
        >
          <DeferredQuery />
        </Suspense>
      </ul>
      <hr />
      <Outlet />
    </div>
  );
}

function DeferredQuery() {
  const tasksQuery = useSuspenseQuery(tasksQueryOptions());

  return (
    <>
      {tasksQuery.data.map((task) => (
        <TaskLink key={task.id} {...task} onUpdate={tasksQuery.refetch} />
      ))}
    </>
  );
}

function TaskLink(props: Task & { onUpdate?: () => void }) {
  const { onUpdate, ...task } = props;

  async function handleTaskComplete(evt: React.ChangeEvent<HTMLInputElement>) {
    console.log(
      "handleTaskComplete",
      evt.target.dataset.taskId,
      evt.target.checked
    );

    const task = await completeTask({
      data: {
        taskId: evt.target.dataset.taskId!,
        dateCompleted: !!evt.target.checked ? new Date().toISOString() : null,
      },
    });

    onUpdate?.();
  }

  return (
    <li key={task.id} className="whitespace-nowrap">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          data-task-id={task.id}
          defaultChecked={!!task.dateCompleted}
          onChange={handleTaskComplete}
        />
        <span className={clsx(!!task.dateCompleted && "line-through")}>
          {task.title}
        </span>
      </label>
    </li>
  );
}
