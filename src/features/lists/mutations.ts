import { mutationOptions, useQueryClient } from "@tanstack/react-query";
import { listsQueryKeys } from "./consts";
import { updateList as updateList } from "./server";
import { List } from "./types";

interface useUpdateListsMutationOptionsProps {
  onError?: () => void;
}
export const useUpdateListsMutationOptions = (
  props: useUpdateListsMutationOptionsProps,
) => {
  const queryClient = useQueryClient();

  return mutationOptions({
    mutationFn: (list: List) => {
      return updateList({ data: list });
    },
    onMutate: async (list) => {
      await queryClient.cancelQueries({
        queryKey: listsQueryKeys.all,
      });

      const prev = queryClient.getQueryData<List[]>(listsQueryKeys.all);

      if (prev) {
        queryClient.setQueryData<List[]>(
          listsQueryKeys.all,
          prev.map((l) => (l.id === list.id ? { ...l, ...list } : l)),
        );
      }

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(listsQueryKeys.all, ctx.prev);
      }
      props.onError?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: listsQueryKeys.all,
      });
    },
  });
};
