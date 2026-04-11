import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchListItemsQueryOptions } from "./queries";
import { updateListOrder } from "./server";
import type { ListItem } from "./types";

interface UseUpdateListOrderProps {
  listId: string;
  onError?: () => void;
}

export const useUpdateListOrder = (props: UseUpdateListOrderProps) => {
  const queryClient = useQueryClient();
  const queryKey = fetchListItemsQueryOptions(props.listId).queryKey;

  return useMutation({
    mutationFn: (taskIds: string[]) =>
      updateListOrder({ data: { listId: props.listId, taskIds } }),
    onMutate: async (taskIds: string[]) => {
      await queryClient.cancelQueries({ queryKey });

      const previousItems = queryClient.getQueryData<ListItem[]>(queryKey);

      if (previousItems) {
        const itemsByTaskId = new Map(
          previousItems.map((li) => [li.taskId, li]),
        );
        queryClient.setQueryData<ListItem[]>(
          queryKey,
          taskIds.map((taskId, index) => ({
            id: itemsByTaskId.get(taskId)?.id ?? `temp_${taskId}`,
            listId: props.listId,
            taskId,
            sortOrder: index,
          })),
        );
      }

      return { previousItems };
    },
    onError: (
      _err: Error,
      _variables: string[],
      context?: { previousItems?: ListItem[] },
    ) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems);
      }
      props.onError?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
};
