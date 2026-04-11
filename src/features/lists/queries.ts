import { queryOptions } from "@tanstack/react-query";
import { listsQueryKeys } from "./consts";
import { fetchLists } from "./server";

export const fetchListsQueryOptions = () =>
  queryOptions({
    queryKey: [listsQueryKeys.all],
    queryFn: () => fetchLists(),
  });
