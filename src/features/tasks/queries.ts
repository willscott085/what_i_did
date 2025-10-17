import { queryOptions } from "@tanstack/react-query";
import { tasksQueryKeys } from "./consts";
import { fetchTasks } from "./server";

export const fetchTasksQueryOptions = () =>
  queryOptions({
    queryKey: [tasksQueryKeys.all],
    queryFn: () => fetchTasks(),
  });
