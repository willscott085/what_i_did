import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { SortableList } from "~/components/SortableList";
import { TaskItem } from "~/components/TaskItem";
import { useUpdateListsMutationOptions } from "~/features/lists/mutations";
import { fetchListsQueryOptions } from "~/features/lists/queries";
import { useUpdateTaskMutationOptions } from "~/features/tasks/mutations";
import { fetchTasksQueryOptions } from "~/features/tasks/queries";

export const Route = createFileRoute("/tasks/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(fetchTasksQueryOptions()),
      context.queryClient.ensureQueryData(fetchListsQueryOptions()),
    ]);
    return null;
  },
});

function RouteComponent() {
  const { data: tasks = [] } = useQuery(fetchTasksQueryOptions());
  const { data: lists = [] } = useQuery(fetchListsQueryOptions());

  const { mutate: updateTask } = useMutation(
    useUpdateTaskMutationOptions({
      onError: () => {},
    }),
  );
  const { mutate: updateInbox } = useMutation(
    useUpdateListsMutationOptions({
      onError: () => {},
    }),
  );

  function handleOrderChange(items: string[]) {
    updateInbox({ id: "inbox", order: items });
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-2 flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {format(new Date(), "EEEE, MMMM do, yyyy")}
        </h1>
      </header>
      <div className="px-4">
        <SortableList
          items={lists.find((l) => l.id === "inbox")?.order ?? []}
          onOrderChange={handleOrderChange}
        >
          {({ id, isDragging }) => {
            const task = tasks.find((t) => t.id === id);

            if (!task) return null;

            return (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={updateTask}
                isDragging={isDragging}
              />
            );
          }}
        </SortableList>
      </div>
    </div>
  );
}
