import { queryOptions } from "@tanstack/react-query";
import { DEFAULT_USER_ID } from "../tasks/consts";
import { listsQueryKeys } from "./consts";
import { fetchListItems, fetchLists } from "./server";

export const fetchListsQueryOptions = () =>
  queryOptions({
    queryKey: [listsQueryKeys.all],
    queryFn: () => fetchLists({ data: { userId: DEFAULT_USER_ID } }),
  });

export const fetchListItemsQueryOptions = (listId: string) =>
  queryOptions({
    queryKey: [listsQueryKeys.all, listId, "items"],
    queryFn: () => fetchListItems({ data: { listId } }),
  });
