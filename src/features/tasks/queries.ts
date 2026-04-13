import { queryOptions } from "@tanstack/react-query";
import { DEFAULT_USER_ID, tasksQueryKeys } from "./consts";
import {
  fetchCompletedTasks,
  fetchInboxTasks,
  fetchSubtasks,
  fetchTasks,
  fetchTaskWithRelations,
  fetchUpcomingTasks,
} from "./server";

export const fetchTasksQueryOptions = () =>
  queryOptions({
    queryKey: [tasksQueryKeys.all],
    queryFn: () => fetchTasks({ data: { userId: DEFAULT_USER_ID } }),
  });

export const fetchInboxTasksQueryOptions = () =>
  queryOptions({
    queryKey: [...tasksQueryKeys.all, "inbox"],
    queryFn: () => fetchInboxTasks({ data: { userId: DEFAULT_USER_ID } }),
  });

export const fetchUpcomingTasksQueryOptions = () =>
  queryOptions({
    queryKey: [...tasksQueryKeys.all, "upcoming"],
    queryFn: () => fetchUpcomingTasks({ data: { userId: DEFAULT_USER_ID } }),
  });

export const fetchCompletedTasksQueryOptions = () =>
  queryOptions({
    queryKey: [...tasksQueryKeys.all, "completed"],
    queryFn: () => fetchCompletedTasks({ data: { userId: DEFAULT_USER_ID } }),
  });

export const fetchTaskQueryOptions = (taskId: string) =>
  queryOptions({
    queryKey: tasksQueryKeys.byId(taskId),
    queryFn: () =>
      fetchTaskWithRelations({
        data: { taskId, userId: DEFAULT_USER_ID },
      }),
  });

export const fetchSubtasksQueryOptions = (parentTaskId: string) =>
  queryOptions({
    queryKey: tasksQueryKeys.subtasks(parentTaskId),
    queryFn: () =>
      fetchSubtasks({
        data: { parentTaskId, userId: DEFAULT_USER_ID },
      }),
  });
