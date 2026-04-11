import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchListsQueryOptions } from "./queries";
import { updateList } from "./server";
import type { List } from "./types";

interface UseUpdateListsMutationOptionsProps {
  onError?: () => void;
}

export const useUpdateListsMutationOptions = (
  props: UseUpdateListsMutationOptionsProps,
) => {
  const queryClient = useQueryClient();
  const queryKey = fetchListsQueryOptions().queryKey;

  return {
    mutationFn: (variables: List) => updateList({ data: variables }),
    onMutate: async (updatedList: Partial<List>) => {
      await queryClient.cancelQueries({ queryKey });

      const previousLists = queryClient.getQueryData<List[]>(queryKey);

      if (previousLists) {
        queryClient.setQueryData<List[]>(
          queryKey,
          previousLists.map((list) =>
            list.id === updatedList.id ? { ...list, ...updatedList } : list,
          ),
        );
      }

      return { previousLists };
    },
    onError: (
      _err: Error,
      _variables: Partial<List>,
      context?: { previousLists?: List[] },
    ) => {
      if (context?.previousLists) {
        queryClient.setQueryData(queryKey, context.previousLists);
      }
      props.onError?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  };
};

export const useUpdateList = (props: UseUpdateListsMutationOptionsProps) => {
  return useMutation(useUpdateListsMutationOptions(props));
};
