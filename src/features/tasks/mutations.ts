import {
  mutationOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { DEFAULT_USER_ID, tasksQueryKeys } from "./consts";
import { fetchInboxTasksQueryOptions, fetchTasksQueryOptions } from "./queries";
import { reorderTasks, updateTask, updateTaskOrder } from "./server";
import { Task } from "./types";

interface UseUpdateTaskOrderProps {
  onError?: () => void;
}
export const useUpdateTaskOrder = ({ onError }: UseUpdateTaskOrderProps) => {
  const queryClient = useQueryClient();

  const { mutate: updateTaskOrderMutation, isPending } = useMutation({
    mutationFn: ({ taskId, order }: { taskId: string; order: number }) =>
      updateTaskOrder({ data: { taskId, order, userId: DEFAULT_USER_ID } }),
    onMutate: async ({ taskId, order }) => {
      await queryClient.cancelQueries({
        queryKey: fetchTasksQueryOptions().queryKey,
      });

      const prev = queryClient.getQueryData<Task[]>(
        fetchTasksQueryOptions().queryKey,
      );

      if (prev) {
        queryClient.setQueryData<Task[]>(
          fetchTasksQueryOptions().queryKey,
          prev.map((t) => (t.id === taskId ? { ...t, sortOrder: order } : t)),
        );
      }

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(fetchTasksQueryOptions().queryKey, ctx.prev);
      }

      onError?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: fetchTasksQueryOptions().queryKey,
      });
    },
  });

  return { updateTaskOrder: updateTaskOrderMutation, isPending };
};

interface UseReorderTasksProps {
  onError?: () => void;
}
export const useReorderTasks = ({ onError }: UseReorderTasksProps) => {
  const queryClient = useQueryClient();
  const queryKey = fetchInboxTasksQueryOptions().queryKey;

  return useMutation({
    mutationFn: (taskIds: string[]) =>
      reorderTasks({ data: { taskIds, userId: DEFAULT_USER_ID } }),
    onMutate: async (taskIds: string[]) => {
      await queryClient.cancelQueries({ queryKey });

      const prev = queryClient.getQueryData<Task[]>(queryKey);

      if (prev) {
        const tasksById = new Map(prev.map((t) => [t.id, t]));
        queryClient.setQueryData<Task[]>(
          queryKey,
          taskIds
            .map((id, i) => {
              const task = tasksById.get(id);
              return task ? { ...task, sortOrder: i } : undefined;
            })
            .filter((t): t is Task => t !== undefined),
        );
      }

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(queryKey, ctx.prev);
      }
      onError?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
};

interface useUpdateTaskMutationOptionsProps {
  onError?: () => void;
}
export const useUpdateTaskMutationOptions = (
  props: useUpdateTaskMutationOptionsProps,
) => {
  const queryClient = useQueryClient();

  return mutationOptions({
    mutationFn: (
      task: Pick<Task, "id" | "title" | "dateCompleted" | "userId">,
    ) => {
      return updateTask({ data: task });
    },
    onMutate: async (task) => {
      await queryClient.cancelQueries({
        queryKey: tasksQueryKeys.all,
      });

      const prev = queryClient.getQueryData<Task[]>(tasksQueryKeys.all);

      if (prev) {
        queryClient.setQueryData<Task[]>(
          tasksQueryKeys.all,
          prev.map((t) => (t.id === task.id ? { ...t, ...task } : t)),
        );
      }

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(tasksQueryKeys.all, ctx.prev);
      }
      props.onError?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: tasksQueryKeys.all,
      });
    },
  });
};
