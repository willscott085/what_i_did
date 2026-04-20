import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useEffect } from "react";
import { useAppLayout } from "~/components/AppLayoutContext";
import { SortableTaskList } from "~/components/SortableTaskList";
import { TaskItem } from "~/components/TaskItem";
import { Button } from "~/components/ui/button";
import {
  useDeleteTask,
  useMoveTaskToDate,
  useReorderTasks,
  useUpdateTaskMutationOptions,
} from "~/features/tasks/mutations";
import { fetchBacklogTasksQueryOptions } from "~/features/tasks/queries";
import { Task } from "~/features/tasks/types";

export const Route = createFileRoute("/_app/backlog")({
  head: () => ({
    meta: [{ title: "Backlog - whatIdid" }],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(fetchBacklogTasksQueryOptions());
    return null;
  },
  component: Backlog,
});

function Backlog() {
  const { setDragOverDate, setDefaultStartDate, handleOpenDialog } =
    useAppLayout();

  useEffect(() => {
    setDefaultStartDate(undefined);
  }, [setDefaultStartDate]);

  const { data: tasks = [] } = useQuery(fetchBacklogTasksQueryOptions());

  const { mutate: updateTask } = useMutation(
    useUpdateTaskMutationOptions({ onError: () => {} }),
  );
  const { mutate: moveTaskToDate } = useMoveTaskToDate();

  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const { mutate: reorderTasks } = useReorderTasks({ onError: () => {} });
  const { mutate: deleteTaskMutation } = useDeleteTask();

  function handleEdit(task: Task) {
    handleOpenDialog(task);
  }

  function handleDelete(taskId: string) {
    deleteTaskMutation(taskId);
  }

  function handleDropOnDate(taskId: string, date: string) {
    moveTaskToDate({ taskId, date });
  }

  return (
    <div className="flex min-h-full flex-col justify-center">
      <section>
        <header className="flex items-center justify-start gap-2">
          <h2 className="pl-8 text-lg font-medium">Backlog</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenDialog(null)}
            aria-label="Add task"
          >
            <PlusIcon className="size-5" />
          </Button>
        </header>
        <div>
          {hydrated ? (
            <SortableTaskList
              tasks={tasks}
              onReorder={(taskIds) => reorderTasks(taskIds)}
              onDropOnDate={handleDropOnDate}
              onDragOverDate={setDragOverDate}
            >
              {(task, isDragging, dragAttributes, dragListeners) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDragging={isDragging}
                  dragAttributes={dragAttributes}
                  dragListeners={dragListeners}
                />
              )}
            </SortableTaskList>
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
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
