import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { SortableTaskList } from "~/components/SortableTaskList";
import { TaskItem } from "~/components/TaskItem";
import { Button } from "~/components/ui/button";
import {
  useDeleteTask,
  useReorderTasks,
  useUpdateFullTask,
  useUpdateTaskMutationOptions,
} from "~/features/tasks/mutations";
import { fetchTasksForDateQueryOptions } from "~/features/tasks/queries";
import { Task } from "~/features/tasks/types";

interface DayViewProps {
  selectedDate: Date;
  onOpenDialog: (task?: Task | null) => void;
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

  const { mutate: updateTask } = useMutation(
    useUpdateTaskMutationOptions({ onError: () => {} }),
  );
  const { mutate: updateFullTask } = useUpdateFullTask();

  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const { mutate: reorderTasks } = useReorderTasks({ onError: () => {} });
  const { mutate: deleteTaskMutation } = useDeleteTask();

  function handleEdit(task: Task) {
    onOpenDialog(task);
  }

  function handleDelete(taskId: string) {
    deleteTaskMutation(taskId);
  }

  function handleDropOnDate(taskId: string, date: string) {
    updateFullTask({ id: taskId, startDate: date });
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
            <SortableTaskList
              tasks={tasks}
              onReorder={(taskIds) => reorderTasks(taskIds)}
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
