import { queryOptions } from "@tanstack/react-query";
import { DEFAULT_USER_ID, tagsQueryKeys } from "./consts";
import { fetchTags } from "./server";

export const fetchTagsQueryOptions = () =>
  queryOptions({
    queryKey: [...tagsQueryKeys.all],
    queryFn: () => fetchTags({ data: { userId: DEFAULT_USER_ID } }),
  });
