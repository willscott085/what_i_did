import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useSyncExternalStore } from "react";
import { useAppLayout } from "~/components/AppLayoutContext";
import { TaskItem } from "~/components/TaskItem";
import {
  useDeleteTask,
  useUpdateTaskMutationOptions,
} from "~/features/tasks/mutations";
import { fetchTasksByTagQueryOptions } from "~/features/tasks/queries";
import { Task, TaskWithRelations } from "~/features/tasks/types";

export const Route = createFileRoute("/_app/tag/$tagId")({
  head: () => ({
    meta: [{ title: "Tag - whatIdid" }],
  }),
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      fetchTasksByTagQueryOptions(params.tagId),
    );
    return null;
  },
  component: TagView,
});

function TagView() {
  const { tagId } = Route.useParams();
  const { setDefaultStartDate, handleOpenDialog } = useAppLayout();

  useEffect(() => {
    setDefaultStartDate(undefined);
  }, [setDefaultStartDate]);

  const { data } = useQuery(fetchTasksByTagQueryOptions(tagId));
  const tagName = data?.tag?.name ?? "Tag";
  const tasks = data?.tasks ?? [];

  const { mutate: updateTask } = useMutation(
    useUpdateTaskMutationOptions({ onError: () => {} }),
  );
  const { mutate: deleteTaskMutation } = useDeleteTask();

  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  function handleEdit(task: Task) {
    handleOpenDialog(task as TaskWithRelations);
  }

  function handleDelete(taskId: string) {
    deleteTaskMutation(taskId);
  }

  return (
    <div className="flex min-h-full flex-col justify-center">
      <section>
        <header className="flex items-center justify-start gap-2">
          <h2 className="pl-8 text-lg font-medium">{tagName}</h2>
        </header>
        <div>
          {hydrated ? (
            <ul>
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDragging={false}
                  hideTags
                />
              ))}
            </ul>
          ) : (
            <ul>
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDragging={false}
                  hideTags
                />
              ))}
            </ul>
          )}
          {tasks.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No tasks with this tag.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
