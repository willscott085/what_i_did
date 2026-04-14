import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
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
import { fetchTasksForDateQueryOptions } from "~/features/tasks/queries";
import { Task, TaskWithRelations } from "~/features/tasks/types";

interface DayViewProps {
  selectedDate: Date;
  onOpenDialog: (task?: TaskWithRelations | null) => void;
  onDragActiveChange?: (taskId: string | null) => void;
  onDragOverDate?: (date: string | null) => void;
}

export function DayView({
  selectedDate,
  onOpenDialog,
  onDragActiveChange,
  onDragOverDate,
}: DayViewProps) {
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: tasks = [] } = useQuery(fetchTasksForDateQueryOptions(dateStr));
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
    onOpenDialog(task as TaskWithRelations);
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
          <h2 className="pl-8 text-lg font-medium">
            {format(selectedDate, "EEEE, d MMMM yyyy")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenDialog(null)}
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
              onDragActiveChange={onDragActiveChange}
              onDropOnDate={handleDropOnDate}
              onDragOverDate={onDragOverDate}
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
