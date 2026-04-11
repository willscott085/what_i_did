import {
  mutationOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { tasksQueryKeys } from "./consts";
import { fetchTasksQueryOptions } from "./queries";
import { updateTask, updateTaskOrder } from "./server";
import { Task } from "./types";

interface UseUpdateTaskOrderProps {
  onError?: () => void;
}
export const useUpdateTaskOrder = ({ onError }: UseUpdateTaskOrderProps) => {
  const queryClient = useQueryClient();

  const { mutate: updateTaskOrderMutation, isPending } = useMutation({
    mutationFn: ({ taskId, order }: { taskId: string; order: number }) =>
      updateTaskOrder({ data: { taskId, order } }),
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
          prev.map((t) => (t.id === taskId ? { ...t, order } : t)),
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

interface useUpdateTaskMutationOptionsProps {
  onError?: () => void;
}
export const useUpdateTaskMutationOptions = (
  props: useUpdateTaskMutationOptionsProps,
) => {
  const queryClient = useQueryClient();

  return mutationOptions({
    mutationFn: (task: Task) => {
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
