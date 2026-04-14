import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { SortableTaskList } from "~/components/SortableTaskList";
import { TaskDialog } from "~/components/TaskDialog";
import { TaskItem } from "~/components/TaskItem";
import { Button } from "~/components/ui/button";
import {
  useDeleteTask,
  useReorderTasks,
  useUpdateTaskMutationOptions,
} from "~/features/tasks/mutations";
import { fetchInboxTasksQueryOptions } from "~/features/tasks/queries";
import { Task, TaskWithRelations } from "~/features/tasks/types";

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
  const { mutate: deleteTaskMutation } = useDeleteTask();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(
    null,
  );

  function handleEdit(task: Task) {
    setEditingTask(task as TaskWithRelations);
    setDialogOpen(true);
  }

  function handleDelete(taskId: string) {
    deleteTaskMutation(taskId);
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingTask(null);
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="flex items-center justify-between">
        <h1 className="pl-8 text-lg">
          {format(new Date(), "EEEE, MMMM do, yyyy")}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setEditingTask(null);
            setDialogOpen(true);
          }}
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
            completedChildren={(task) => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={updateTask}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isDragging={false}
              />
            )}
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

      <TaskDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        task={editingTask}
      />
    </div>
  );
}
