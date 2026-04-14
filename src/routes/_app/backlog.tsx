import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useEffect } from "react";
import { useAppLayout } from "~/components/AppLayoutContext";
import { CategoryGroupedList } from "~/components/CategoryGroupedList";
import { TaskItem } from "~/components/TaskItem";
import { Button } from "~/components/ui/button";
import { fetchCategoriesQueryOptions } from "~/features/categories/queries";
import {
  useDeleteTask,
  useMoveTaskToCategory,
  useReorderTasksInCategory,
  useUpdateFullTask,
  useUpdateTaskMutationOptions,
} from "~/features/tasks/mutations";
import { fetchBacklogTasksQueryOptions } from "~/features/tasks/queries";
import { Task, TaskWithRelations } from "~/features/tasks/types";

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
  const { setDragOverDate, setDefaultDueDate, handleOpenDialog } =
    useAppLayout();

  useEffect(() => {
    setDefaultDueDate(undefined);
  }, [setDefaultDueDate]);

  const { data: tasks = [] } = useQuery(fetchBacklogTasksQueryOptions());
  const { data: categories = [] } = useQuery(fetchCategoriesQueryOptions());

  const { mutate: updateTask } = useMutation(
    useUpdateTaskMutationOptions({ onError: () => {} }),
  );
  const { mutate: updateFullTask } = useUpdateFullTask();

  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const { mutate: reorderInCategory } = useReorderTasksInCategory({
    onError: () => {},
  });
  const { mutate: moveToCategory } = useMoveTaskToCategory();
  const { mutate: deleteTaskMutation } = useDeleteTask();

  function handleEdit(task: Task) {
    handleOpenDialog(task as TaskWithRelations);
  }

  function handleDelete(taskId: string) {
    deleteTaskMutation(taskId);
  }

  function handleDropOnDate(taskId: string, date: string) {
    updateFullTask({ id: taskId, dueDate: date });
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
            <CategoryGroupedList
              tasks={tasks}
              categories={categories}
              onReorderInCategory={(taskIds, categoryId) =>
                reorderInCategory({ taskIds, categoryId })
              }
              onMoveToCategory={(taskId, categoryId, taskIdsInNewGroup) =>
                moveToCategory({ taskId, categoryId, taskIdsInNewGroup })
              }
              onDropOnDate={handleDropOnDate}
              onDragOverDate={setDragOverDate}
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
              {(
                task,
                isDragging,
                dragAttributes,
                dragListeners,
                categoryColor,
              ) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDragging={isDragging}
                  categoryColor={categoryColor}
                  dragAttributes={dragAttributes}
                  dragListeners={dragListeners}
                />
              )}
            </CategoryGroupedList>
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
