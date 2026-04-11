import { queryOptions } from "@tanstack/react-query";
import { listsQueryKeys } from "./consts";
import { fetchListItems, fetchLists } from "./server";

export const fetchListsQueryOptions = () =>
  queryOptions({
    queryKey: [listsQueryKeys.all],
    queryFn: () => fetchLists(),
  });

export const fetchListItemsQueryOptions = (listId: string) =>
  queryOptions({
    queryKey: [listsQueryKeys.all, listId, "items"],
    queryFn: () => fetchListItems({ data: { listId } }),
  });
