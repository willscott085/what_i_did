import {
  mutationOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { DEFAULT_USER_ID, tasksQueryKeys } from "./consts";
import { fetchInboxTasksQueryOptions } from "./queries";
import {
  completeTask,
  createTask,
  deleteTask,
  reorderTasks,
  updateTask,
} from "./server";
import { CreateTaskInput, Task, UpdateTaskInput } from "./types";

interface UseReorderTasksProps {
  onError?: () => void;
  queryKey?: readonly unknown[];
}
export const useReorderTasks = ({
  onError,
  queryKey: customQueryKey,
}: UseReorderTasksProps) => {
  const queryClient = useQueryClient();
  const queryKey = customQueryKey ?? fetchInboxTasksQueryOptions().queryKey;

  return useMutation({
    mutationFn: (taskIds: string[]) =>
      reorderTasks({ data: { taskIds, userId: DEFAULT_USER_ID } }),
    onMutate: async (taskIds: string[]) => {
      await queryClient.cancelQueries({ queryKey });

      const prev = queryClient.getQueryData<Task[]>(queryKey);

      if (prev) {
        const tasksById = new Map(prev.map((t) => [t.id, t]));
        const reordered = taskIds
          .map((id, i) => {
            const task = tasksById.get(id);
            return task ? { ...task, sortOrder: i } : undefined;
          })
          .filter((t): t is Task => t !== undefined);

        // Preserve tasks not in the reorder set (e.g. completed tasks)
        const reorderedIds = new Set(taskIds);
        const untouched = prev.filter((t) => !reorderedIds.has(t.id));
        queryClient.setQueryData<Task[]>(queryKey, [
          ...reordered,
          ...untouched,
        ]);
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
  const inboxKey = fetchInboxTasksQueryOptions().queryKey;

  return mutationOptions({
    mutationFn: (
      task: Pick<Task, "id" | "title" | "notes" | "dateCompleted" | "userId">,
    ) => {
      return updateTask({ data: task });
    },
    onMutate: async (task) => {
      await queryClient.cancelQueries({
        queryKey: tasksQueryKeys.all,
      });

      const prev = queryClient.getQueryData<Task[]>(inboxKey);

      if (prev) {
        queryClient.setQueryData<Task[]>(
          inboxKey,
          prev.map((t) => (t.id === task.id ? { ...t, ...task } : t)),
        );
      }

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(inboxKey, ctx.prev);
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

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      createTask({ data: { ...input, userId: DEFAULT_USER_ID } }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
};

export const useUpdateFullTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTaskInput) =>
      updateTask({ data: { ...input, userId: DEFAULT_USER_ID } }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.all });

      const inboxKey = fetchInboxTasksQueryOptions().queryKey;
      const prev = queryClient.getQueryData<Task[]>(inboxKey);

      if (prev) {
        queryClient.setQueryData<Task[]>(
          inboxKey,
          prev.map((t) =>
            t.id === input.id
              ? {
                  ...t,
                  ...input,
                  tags: t.tags,
                }
              : t,
          ),
        );
      }

      return { prev, inboxKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(ctx.inboxKey, ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      deleteTask({ data: { taskId, userId: DEFAULT_USER_ID } }),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.all });

      const inboxKey = fetchInboxTasksQueryOptions().queryKey;
      const prevInbox = queryClient.getQueryData<Task[]>(inboxKey);

      if (prevInbox) {
        queryClient.setQueryData<Task[]>(
          inboxKey,
          prevInbox.filter((t) => t.id !== taskId),
        );
      }

      // Also optimistically remove from any cached byDate queries
      const prevByDate: { key: readonly unknown[]; data: Task[] }[] = [];
      queryClient
        .getQueriesData<Task[]>({ queryKey: ["tasks", "byDate"] })
        .forEach(([key, data]) => {
          if (data) {
            prevByDate.push({ key, data });
            queryClient.setQueryData<Task[]>(
              key,
              data.filter((t) => t.id !== taskId),
            );
          }
        });

      return { prevInbox, inboxKey, prevByDate };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevInbox) {
        queryClient.setQueryData(ctx.inboxKey, ctx.prevInbox);
      }
      ctx?.prevByDate.forEach(({ key, data }) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
};

export const useCompleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      dateCompleted,
    }: {
      taskId: string;
      dateCompleted: string | null;
    }) =>
      completeTask({
        data: { taskId, dateCompleted, userId: DEFAULT_USER_ID },
      }),
    onMutate: async ({ taskId, dateCompleted }) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.all });

      const inboxKey = fetchInboxTasksQueryOptions().queryKey;
      const prev = queryClient.getQueryData<Task[]>(inboxKey);

      if (prev) {
        queryClient.setQueryData<Task[]>(
          inboxKey,
          prev.map((t) => (t.id === taskId ? { ...t, dateCompleted } : t)),
        );
      }

      return { prev, inboxKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(ctx.inboxKey, ctx.prev);
      }
    },
    onSettled: () => {
      // Invalidate all task queries
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
};
