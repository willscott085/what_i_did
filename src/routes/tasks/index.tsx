import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { useSyncExternalStore } from "react";
import { SortableList } from "~/components/SortableList";
import { TaskItem } from "~/components/TaskItem";
import {
  useReorderTasks,
  useUpdateTaskMutationOptions,
} from "~/features/tasks/mutations";
import { fetchInboxTasksQueryOptions } from "~/features/tasks/queries";

export const Route = createFileRoute("/tasks/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(fetchInboxTasksQueryOptions());
    return null;
  },
});

function RouteComponent() {
  const { data: tasks = [] } = useQuery(fetchInboxTasksQueryOptions());

  const { mutate: updateTask } = useMutation(
    useUpdateTaskMutationOptions({
      onError: () => {},
    }),
  );

  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const { mutate: reorderTasks } = useReorderTasks({ onError: () => {} });

  const taskIds = tasks.map((t) => t.id);
  const tasksById = new Map(tasks.map((task) => [task.id, task]));

  function handleOrderChange(items: string[]) {
    reorderTasks(items);
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-2 flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {format(new Date(), "EEEE, MMMM do, yyyy")}
        </h1>
      </header>
      <div className="px-4">
        {hydrated ? (
          <SortableList items={taskIds} onOrderChange={handleOrderChange}>
            {(id, isDragging, dragAttributes, dragListeners) => {
              const task = tasksById.get(id);

              if (!task) return null;

              return (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  isDragging={isDragging}
                  dragAttributes={dragAttributes}
                  dragListeners={dragListeners}
                />
              );
            }}
          </SortableList>
        ) : (
          <ul>
            {taskIds.map((id) => {
              const task = tasksById.get(id);

              if (!task) return null;

              return (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  isDragging={false}
                />
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
